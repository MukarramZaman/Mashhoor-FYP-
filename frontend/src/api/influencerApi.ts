import api from "./client";

export type InfluencerPlatforms = {
  instagram?: { handle: string; followers: number; engagementRate: number };
  youtube?: { handle: string; subscribers: number; avgViews: number };
  tiktok?: { handle: string; followers: number; engagementRate: number };
};

export type InfluencerProfile = {
  _id: string;
  user: { _id: string; name: string; email: string; avatar?: string; hasSignedUp?: boolean };
  niche: string[];
  location: string;
  country: string;
  bio: string;
  platforms: InfluencerPlatforms;
  trustScore: number;
  trustScoreBreakdown: {
    engagementAuthenticity: number;
    followerQuality: number;
    contentConsistency: number;
    collaborationHistory: number;
  };
  isVerified: boolean;
  tags: string[];
  totalFollowers: number;
  avgEngagementRate: number;
  systemCategory?: string;
};

export type InfluencerFilters = {
  niche?: string;
  country?: string;
  platform?: "instagram" | "youtube" | "";
  minFollowers?: number;
  maxFollowers?: number;
  minTrustScore?: number;
  minEngagement?: number;
  sort?: "trustScore" | "followers" | "engagement" | "newest";
  search?: string;
  page?: number;
  limit?: number;
};

export type PaginatedInfluencers = {
  data: InfluencerProfile[];
  pagination: { total: number; page: number; limit: number; pages: number };
};

export type ROIPredictionResult = {
  estimatedRevenue: number;
  predictedROI: number;
  roiPercentage: number;
  summary: string;
  aiModelMetrics?: {
    r2Score: number;
    meanAbsoluteError: number;
    modelType: string;
  };
};

export const influencerApi = {
  getAll: async (filters: InfluencerFilters = {}): Promise<PaginatedInfluencers> => {
    const { data } = await api.get("/influencers", { params: filters });
    return data;
  },

  getById: async (userId: string): Promise<InfluencerProfile> => {
    const { data } = await api.get(`/influencers/${userId}`);
    return data.data;
  },

  updateMyProfile: async (
    updates: Partial<Omit<InfluencerProfile, "_id" | "user" | "trustScore" | "totalFollowers" | "avgEngagementRate" | "systemCategory">>
  ): Promise<InfluencerProfile & { youtubeSynced?: boolean }> => {
    const { data } = await api.put("/influencers/profile", updates);
    return data.data;
  },

  getRecommendations: async (filters: InfluencerFilters = {}): Promise<InfluencerProfile[]> => {
    const { data } = await api.get("/influencers/recommendations", { params: filters });
    return data.data;
  },

  categorizeInfluencers: async (): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await api.post("/influencers/categorize");
    return data;
  },

  calculateTrustScore: async (userId: string): Promise<{ trustScore: number, breakdown: any, aiModelMetrics?: any }> => {
    const { data } = await api.post(`/influencers/${userId}/calculate-trust-score`);
    return data.data;
  },

  predictROI: async (userId: string, payload: { investment: number; productValue: number }): Promise<ROIPredictionResult> => {
    const { data } = await api.post(`/influencers/${userId}/predict-roi`, payload);
    return data.data;
  },
};
