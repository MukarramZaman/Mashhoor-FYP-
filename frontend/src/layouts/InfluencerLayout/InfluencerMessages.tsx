import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { messageApi, type Conversation, type Message } from "../../api/outreachApi";
import { mergeMessagesById } from "../../utils/messageMerge";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isFromMe(msg: Message, userId: string) {
  if (msg.messageType === "direct") return msg.sender?._id === userId;
  return msg.messageType === "assistant_query" || msg.sender?._id === userId;
}

function conversationInDirectChat(convo?: Conversation, msgs?: Message[]) {
  if (convo?.directChatActive) return true;
  return !!msgs?.some((m) => m.messageType === "interest_handoff");
}

function InfluencerMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await messageApi.getConversations();
      setConversations(data);
      setActiveId((current) => current ?? (data.length > 0 ? data[0]._id : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const refreshMessages = useCallback(async (conversationId: string, isFirstLoad = false) => {
    if (isFirstLoad) {
      setLoadingMsgs(true);
      setMessages([]); // Clear old messages immediately in the UI
    }
    try {
      const data = await messageApi.getMessages(conversationId);
      setMessages((prev) => isFirstLoad ? data : mergeMessagesById(prev, data));
    } catch (err) {
      console.error(err);
    } finally {
      if (isFirstLoad) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    refreshMessages(activeId, true);
  }, [activeId, refreshMessages]);

  useEffect(() => {
    if (!activeId) return;
    const interval = setInterval(() => {
      if (sendingRef.current) return;
      refreshMessages(activeId);
      messageApi.getConversations().then(setConversations).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeId, refreshMessages]);

  const activeConvo = conversations.find((c) => c._id === activeId);
  const otherParticipant = activeConvo?.participants.find((p) => p._id !== user?._id);
  const campaignTitle =
    typeof activeConvo?.campaign === "object" && activeConvo?.campaign
      ? activeConvo.campaign.title
      : "Campaign";
  const campaignId =
    typeof activeConvo?.campaign === "object" && activeConvo?.campaign
      ? activeConvo.campaign._id
      : undefined;
  const directChat = conversationInDirectChat(activeConvo, messages);

  const filtered = conversations.filter((c) => {
    const name = c.participants.find((p) => p._id !== user?._id)?.name ?? "";
    const title =
      typeof c.campaign === "object" && c.campaign ? c.campaign.title : "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || title.toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!newMessage.trim() || !activeId || sendingRef.current) return;
    if (directChat && !otherParticipant?._id) {
      setError("Cannot send — brand contact missing.");
      return;
    }

    const content = newMessage.trim();
    setNewMessage("");
    sendingRef.current = true;
    setSending(true);
    setError("");

    // Create optimistic user message
    const tempUserMsg: Message = {
      _id: `temp-user-${Date.now()}`,
      content: content,
      messageType: directChat ? "direct" : "assistant_query",
      sender: {
        _id: user?._id || "",
        name: user?.name || "Me",
        role: "influencer",
      },
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // If talking to assistant, also add an optimistic "typing" assistant message
    const tempAssistantMsg: Message = {
      _id: `temp-assistant-typing`,
      content: "...",
      messageType: "assistant_reply",
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const base = [...prev, tempUserMsg];
      if (!directChat) {
        base.push(tempAssistantMsg);
      }
      return base;
    });

    try {
      if (directChat && otherParticipant?._id) {
        const msg = await messageApi.send(
          otherParticipant._id,
          content,
          campaignId
        );
        setMessages((prev) => {
          const base = prev.filter((m) => !m._id.startsWith("temp-"));
          return mergeMessagesById(base, [msg]);
        });
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeId
              ? {
                  ...c,
                  directChatActive: true,
                  lastMessage: msg.content.slice(0, 80),
                  lastMessageAt: msg.createdAt,
                }
              : c
          )
        );
      } else {
        const { userMessage, assistantMessage } = await messageApi.askAssistant(
          activeId,
          content
        );
        const nowDirect = assistantMessage.messageType === "interest_handoff";
        setMessages((prev) => {
          const base = prev.filter((m) => !m._id.startsWith("temp-"));
          return mergeMessagesById(base, [userMessage, assistantMessage]);
        });
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeId
              ? {
                  ...c,
                  directChatActive: nowDirect || c.directChatActive,
                  lastMessage: assistantMessage.content.slice(0, 80),
                  lastMessageAt: assistantMessage.createdAt,
                }
              : c
          )
        );
      }
      window.dispatchEvent(new Event("messages_updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => !m._id.startsWith("temp-")));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!activeId) return;
    if (!window.confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;
    try {
      await messageApi.deleteConversation(activeId);
      setConversations((prev) => prev.filter((c) => c._id !== activeId));
      setActiveId(null);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete chat");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading campaign messages...</div>
    );
  }

  return (
    <div className="messages-page">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Campaign Messages</h1>
        <p className="text-gray-500 text-sm mt-1">
          Chat with the Mashhoor assistant about brand invitations and campaign details.
        </p>
      </div>

      {error && (
        <div className="mx-6 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden p-6 gap-6 min-h-[70vh]">
        <div className="w-1/3 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/search.svg" alt="" width={18} height={18} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands or campaigns..."
                className="w-full bg-gray-50 border border-transparent rounded-lg py-2 pl-10 pr-4 text-sm focus:bg-white focus:border-purple-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">
                No conversations yet. When a brand invites you on Mashhoor, messages will appear here.
              </p>
            ) : (
              filtered.map((chat) => {
                const brand = chat.participants.find((p) => p._id !== user?._id);
                const title =
                  typeof chat.campaign === "object" && chat.campaign
                    ? chat.campaign.title
                    : "Campaign";
                const unread = user?._id ? chat.unreadCount?.[user._id] ?? 0 : 0;
                return (
                  <div
                    key={chat._id}
                    onClick={() => setActiveId(chat._id)}
                    className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 ${
                      chat._id === activeId
                        ? "bg-purple-50 border-l-4 border-purple-500"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <img
                      src={
                        brand?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(brand?.name || "Brand")}&background=8b5cf6&color=fff`
                      }
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {brand?.name || "Brand"}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {formatRelative(chat.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-purple-600 font-medium truncate">{title}</p>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    </div>
                    {unread > 0 && (
                      <span className="w-5 h-5 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
          {!activeConvo ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{otherParticipant?.name}</h3>
                  <p className="text-sm text-purple-600">{campaignTitle}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        directChat ? "bg-green-500" : "bg-purple-500"
                      }`}
                    />
                    {directChat
                      ? `Direct chat with ${otherParticipant?.name || "the brand"}`
                      : "Mashhoor campaign assistant active"}
                  </p>
                </div>
                <button 
                  onClick={handleDeleteChat}
                  className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors"
                >
                  Delete Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMsgs ? (
                  <p className="text-center text-gray-400 text-sm">Loading messages...</p>
                ) : (
                  messages.map((msg) => {
                    const mine = user?._id ? isFromMe(msg, user._id) : false;
                    const label =
                      msg.displayName ||
                      (msg.messageType === "assistant_reply" ||
                      msg.messageType === "interest_prompt" ||
                      msg.messageType === "interest_handoff"
                        ? "Mashhoor Assistant"
                        : msg.messageType === "outreach"
                          ? "Invitation"
                          : msg.messageType === "direct"
                            ? msg.sender?.name || otherParticipant?.name
                            : msg.sender?.name);
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] p-4 shadow-sm ${
                            mine ? "msg-bubble-me" : "msg-bubble-other"
                          }`}
                        >
                          {!mine && (
                            <div className="text-xs font-bold text-purple-600 mb-1">
                              {label}
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content === "..." ? (
                              <span className="flex gap-1.5 items-center py-1">
                                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse [animation-delay:0.2s]" />
                                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse [animation-delay:0.4s]" />
                              </span>
                            ) : (
                              msg.content
                            )}
                          </p>
                          <div
                            className={`text-xs mt-1 ${
                              mine ? "text-purple-200" : "text-gray-400"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">
                  {directChat
                    ? "You are chatting directly with the brand. The Mashhoor assistant will not reply in this thread."
                    : "Ask about budget, dates, location, niche, or deliverables — the assistant only answers campaign-related questions."}
                </p>
                <div className="flex gap-3 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={
                      directChat
                        ? `Message ${otherParticipant?.name || "the brand"}...`
                        : "Ask about this campaign..."
                    }
                    disabled={sending}
                    className="flex-1 bg-transparent outline-none text-gray-900 text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                  >
                    <img src="/assets/send.svg" alt="Send" width={18} height={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InfluencerMessages;
