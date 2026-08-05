import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { messageApi, type Conversation, type Message } from "../../api/outreachApi";
import { mergeMessagesById } from "../../utils/messageMerge";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso?: string) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "interested" | "archive">("all");

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
      const data = await messageApi.getConversations();
      setConversations(data);
      setActiveId((current) => current ?? (data.length > 0 ? data[0]._id : null));
    } catch (err) {
      console.error(err);
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
  const influencer = activeConvo?.participants.find((p) => p._id !== user?._id);
  const campaignId =
    typeof activeConvo?.campaign === "object" && activeConvo?.campaign
      ? activeConvo.campaign._id
      : undefined;
  const campaignTitle =
    typeof activeConvo?.campaign === "object" && activeConvo?.campaign
      ? activeConvo.campaign.title
      : "Campaign";
  const directChat =
    activeConvo?.directChatActive ||
    messages.some((m) => m.messageType === "interest_handoff");

  const filtered = conversations.filter((c) => {
    const name = c.participants.find((p) => p._id !== user?._id)?.name ?? "";
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "all") {
      return !c.archived;
    }
    if (activeTab === "interested") {
      return c.directChatActive && !c.archived;
    }
    if (activeTab === "archive") {
      return !!c.archived;
    }
    return true;
  });

  const handleSend = async () => {
    if (!newMessage.trim() || !influencer?._id || sendingRef.current) return;
    const content = newMessage.trim();
    setNewMessage("");
    sendingRef.current = true;
    setSending(true);

    const tempUserMsg: Message = {
      _id: `temp-user-${Date.now()}`,
      content: content,
      messageType: "direct",
      sender: {
        _id: user?._id || "",
        name: user?.name || "Me",
        role: "business",
      },
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const msg = await messageApi.send(influencer._id, content, campaignId);
      setMessages((prev) => {
        const base = prev.filter((m) => !m._id.startsWith("temp-"));
        return mergeMessagesById(base, [msg]);
      });
      window.dispatchEvent(new Event("messages_updated"));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
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
      alert(err instanceof Error ? err.message : "Failed to delete chat");
    }
  };

  const isFromMe = (msg: Message) =>
    msg.messageType === "direct" && msg.sender?._id === user?._id;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="messages-page">
      <div className="flex flex-1 overflow-hidden p-6 gap-6 min-h-[75vh]">
        <div className="w-1/3 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/search.svg" alt="" width={18} height={18} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-gray-50 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:border-purple-500 border border-transparent"
              />
            </div>

            <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-200/50">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                  activeTab === "all"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("interested")}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                  activeTab === "interested"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Interested
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                  activeTab === "archive"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Archive
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">
                Invite a registered influencer to a campaign to start messaging. They will see your outreach and the Mashhoor assistant here.
              </p>
            ) : (
              filtered.map((chat) => {
                const inf = chat.participants.find((p) => p._id !== user?._id);
                return (
                  <div
                    key={chat._id}
                    onClick={() => setActiveId(chat._id)}
                    className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 ${
                      chat._id === activeId
                        ? "bg-gray-50 border-l-4 border-purple-500"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <img
                      src={
                        inf?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(inf?.name || "Influencer")}&background=8b5cf6&color=fff`
                      }
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className="font-semibold text-sm truncate">{inf?.name}</h3>
                        <span className="text-xs text-gray-400">
                          {formatRelative(chat.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    </div>
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
                <div className="flex items-center gap-3">
                  <img
                    src={
                      influencer?.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(influencer?.name || "User")}`
                    }
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900">{influencer?.name}</h3>
                    <p className="text-xs text-purple-600">{campaignTitle}</p>
                    {directChat && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Direct chat — assistant stepped back
                      </p>
                    )}
                  </div>
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
                  <p className="text-center text-gray-400 text-sm">Loading...</p>
                ) : (
                  messages.map((msg) => {
                    const mine = isFromMe(msg);
                    const label =
                      msg.displayName ||
                      (msg.messageType === "assistant_reply" ||
                      msg.messageType === "interest_prompt" ||
                      msg.messageType === "interest_handoff"
                        ? "Mashhoor Assistant"
                          : msg.messageType === "outreach"
                          ? "Your invitation"
                          : msg.messageType === "direct"
                            ? msg.sender?.name || influencer?.name
                            : msg.sender?.name);
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] p-4 shadow-sm ${
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
                    ? "Real-time chat with the influencer. The Mashhoor assistant no longer replies in this thread."
                    : "The influencer can ask the Mashhoor assistant about campaign details. You can send direct messages here anytime."}
                </p>
                <div className="flex gap-3 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Message influencer..."
                    disabled={sending}
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="p-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                  >
                    <img src="/assets/send.svg" alt="" width={18} height={18} />
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

export default Messages;
