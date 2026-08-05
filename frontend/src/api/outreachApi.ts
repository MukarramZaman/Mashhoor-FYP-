import api from "./client";

// ─── Outreach ─────────────────────────────────────────────────────────────────

export type OutreachStatus = "pending" | "sent" | "opened" | "replied" | "accepted" | "rejected";
export type SentimentLabel = "positive" | "neutral" | "negative";

export type Outreach = {
  _id: string;
  campaign: { _id: string; title: string; description: string; budget: object; timeline: object };
  business: { _id: string; name: string; email: string; avatar?: string };
  influencer: { _id: string; name: string; email: string; avatar?: string };
  message: string;
  isAiGenerated: boolean;
  status: OutreachStatus;
  influencerReply?: string;
  sentiment?: { label: SentimentLabel; score: number; analyzedAt: string };
  createdAt: string;
};

export type EmailInviteResult = {
  _id: string;
  email: string;
  influencerName: string;
  inviteToken: string;
  status: string;
};

export type SendOutreachResult = {
  outreach: Outreach;
  emailInvite?: EmailInviteResult | null;
};

/** Seeded/demo placeholder inboxes — need a real email in the modal. */
export const isPlaceholderInfluencerEmail = (email?: string) =>
  !email || /@(youtube|instagram)\.test$/i.test(email);

/** True when we have a real inbox to email (not @youtube.test / @instagram.test). */
export const hasDeliverableEmail = (email?: string) =>
  !!email?.trim() && !isPlaceholderInfluencerEmail(email);

export const resolveOutreachContactEmail = (
  influencerEmail?: string,
  contactEmail?: string
): string | undefined => {
  const contact = contactEmail?.trim();
  if (contact) return contact;
  if (hasDeliverableEmail(influencerEmail)) return influencerEmail!.trim();
  return undefined;
};
/** True only after the influencer signed up on Mashhoor (not imported/seeded). */
export const isRegisteredOnPlatform = (user?: { hasSignedUp?: boolean }) =>
  user?.hasSignedUp === true;

export const outreachApi = {
  send: async (
    campaignId: string,
    influencerId: string,
    message: string,
    isAiGenerated = false,
    contactEmail?: string
  ): Promise<SendOutreachResult & { channel?: "platform" | "email" }> => {
    const { data } = await api.post("/outreach", {
      campaignId,
      influencerId,
      message,
      isAiGenerated,
      contactEmail,
    });
    return data.data;
  },

  getByCampaign: async (campaignId: string): Promise<Outreach[]> => {
    const { data } = await api.get(`/outreach/campaign/${campaignId}`);
    return data.data;
  },

  getMyRequests: async (status?: OutreachStatus): Promise<Outreach[]> => {
    const { data } = await api.get("/outreach/my-requests", {
      params: status ? { status } : {},
    });
    return data.data;
  },

  reply: async (outreachId: string, reply: string, accept?: boolean): Promise<Outreach> => {
    const { data } = await api.put(`/outreach/${outreachId}/reply`, { reply, accept });
    return data.data;
  },
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export type MessageType =
  | "direct"
  | "outreach"
  | "assistant_query"
  | "assistant_reply"
  | "interest_prompt"
  | "interest_handoff";

export type Message = {
  _id: string;
  sender?: { _id: string; name: string; avatar?: string; role?: string };
  receiver?: string;
  content: string;
  messageType?: MessageType;
  isAssistant?: boolean;
  displayName?: string;
  assistantTrace?: string;
  isRead: boolean;
  createdAt: string;
};

export type Conversation = {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }>;
  campaign?: { _id: string; title: string };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: Record<string, number>;
  directChatActive?: boolean;
  archived?: boolean;
};

export const messageApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const { data } = await api.get("/messages/conversations");
    return data.data;
  },

  getMessages: async (conversationId: string, page = 1): Promise<Message[]> => {
    const { data } = await api.get(`/messages/${conversationId}`, {
      params: { page },
    });
    return data.data;
  },

  send: async (receiverId: string, content: string, campaignId?: string): Promise<Message> => {
    const { data } = await api.post("/messages/send", {
      receiverId,
      content,
      campaignId,
    });
    return data.data;
  },

  askAssistant: async (
    conversationId: string,
    content: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> => {
    const { data } = await api.post(`/messages/${conversationId}/ask-assistant`, {
      content,
    });
    return data.data;
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    await api.delete(`/messages/${conversationId}`);
  },
};
