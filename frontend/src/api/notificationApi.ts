import api from "./client";

export type NotificationSummary = {
  unreadNotifications: number;
  pendingRequests: number;
  unreadMessages: number;
  newAcceptances: number;
};

export type AppNotification = {
  _id: string;
  type:
    | "influencer_interested"
    | "outreach_reply"
    | "outreach_accepted"
    | "campaign_invite"
    | "campaign";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  campaign?: { _id: string; title: string };
  influencer?: { _id: string; name: string; avatar?: string };
  conversation?: string;
};

export const notificationApi = {
  summary: async (): Promise<NotificationSummary> => {
    const { data } = await api.get("/notifications/summary");
    return data.data;
  },

  list: async (): Promise<AppNotification[]> => {
    const { data } = await api.get("/notifications");
    return data.data;
  },

  markAllRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },
};
