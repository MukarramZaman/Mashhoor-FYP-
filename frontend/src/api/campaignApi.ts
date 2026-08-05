import api from "./client";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "cancelled";

export type Campaign = {
  _id: string;
  business: { _id: string; name: string; email: string; avatar?: string } | string;
  title: string;
  description: string;
  niche: string[];
  targetLocations: string[];
  budget: { total: number; spent: number; currency: string };
  requirements: {
    minFollowers: number;
    minTrustScore: number;
    platforms: string[];
    contentType: string[];
  };
  timeline: { startDate: string; endDate: string };
  status: CampaignStatus;
  selectedInfluencers: string[];
  goals: string;
  roiPrediction?: {
    estimatedReach: number;
    estimatedEngagement: number;
    estimatedROI: number;
    confidence: number;
  };
  progress: number;
  createdAt: string;
};

export type CreateCampaignPayload = {
  title: string;
  description: string;
  niche: string[];
  targetLocations?: string[];
  budget: { total: number; currency?: string };
  requirements?: {
    minFollowers?: number;
    minTrustScore?: number;
    platforms?: string[];
    contentType?: string[];
  };
  timeline: { startDate: string; endDate: string };
  goals?: string;
};

export const campaignApi = {
  getMyCampaigns: async (status?: CampaignStatus): Promise<{ data: Campaign[]; pagination: object }> => {
    const { data } = await api.get("/campaigns", { params: status ? { status } : {} });
    return data;
  },

  create: async (payload: CreateCampaignPayload): Promise<Campaign> => {
    const { data } = await api.post("/campaigns", payload);
    return data.data;
  },

  update: async (
    id: string,
    updates: Partial<CreateCampaignPayload & { status: CampaignStatus; progress: number }>
  ): Promise<Campaign> => {
    const { data } = await api.put(`/campaigns/${id}`, updates);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },

  addInfluencer: async (
    campaignId: string,
    influencerId: string,
    message: string,
    contactEmail?: string
  ): Promise<{
    campaign: Campaign;
    outreach: unknown;
    channel: "platform" | "email";
    emailInvite?: unknown;
  }> => {
    const { data } = await api.post(`/campaigns/${campaignId}/influencers`, {
      influencerId,
      message,
      contactEmail,
    });
    return data.data;
  },

  getMyInfluencerCampaigns: async (): Promise<Campaign[]> => {
    const { data } = await api.get("/campaigns/my-campaigns");
    return data.data;
  },

  getById: async (id: string): Promise<Campaign> => {
    const { data } = await api.get(`/campaigns/${id}`);
    return data.data;
  },
};
