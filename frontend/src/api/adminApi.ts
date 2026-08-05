import api from "./client";

export type AdminStats = {
  totalInfluencers: number;
  totalBusinesses: number;
  totalCampaigns: number;
  activeCampaigns: number;
  pendingVerification: number;
  totalOutreach: number;
  pendingOutreach: number;
  recentActivity: {
    id: string;
    type: "user" | "campaign" | "verification" | "report" | "system";
    text: string;
    time: string;
  }[];
  userGrowth: {
    month: string;
    count: number;
  }[];
};

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const { data } = await api.get("/admin/stats");
    return data.data;
  },
  getPendingVerifications: async () => {
    const { data } = await api.get("/admin/verifications/pending");
    return data.data;
  },
  verifyUser: async (id: string) => {
    const { data } = await api.put(`/admin/verifications/${id}/approve`);
    return data.data;
  },
  rejectUser: async (id: string) => {
    const { data } = await api.delete(`/admin/verifications/${id}/reject`);
    return data.data;
  },
};
