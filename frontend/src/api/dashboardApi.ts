import api from "./client";

export type ProfileAnalytics = {
  totalFollowers: number;
  avgEngagementRate: number;
  platforms: {
    instagram?: { handle?: string; followers?: number; engagementRate?: number };
    youtube?: { handle?: string; subscribers?: number; avgViews?: number; engagementRate?: number };
    tiktok?: { handle?: string; followers?: number; engagementRate?: number };
  };
  trustScoreBreakdown: {
    engagementAuthenticity: number;
    followerQuality: number;
    contentConsistency: number;
    collaborationHistory: number;
  };
  niche: string[];
  isVerified: boolean;
};

export type InfluencerDashboardStats = {
  totalEarnings: number;
  activeCampaigns: number;
  pendingRequests: number;
  trustScore: number;
  recentCampaigns: unknown[];
  earningsByMonth: { month: string; amount: number }[];
  profileAnalytics: ProfileAnalytics;
};

export type DashboardCampaign = {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  budget?: { total?: number; currency?: string };
  progress?: number;
};

export type BusinessDashboardStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  influencersContacted: number;
  shortlisted: number;
  avgEngagement: string;
  recentActivity: { id: string; type: string; text: string; date: string }[];
  recentCampaigns: DashboardCampaign[];
  campaignActivity: { month: string; count: number }[];
  engagementTrend: { month: string; rate: number }[];
};

const defaultProfileAnalytics = (): ProfileAnalytics => ({
  totalFollowers: 0,
  avgEngagementRate: 0,
  platforms: {},
  trustScoreBreakdown: {
    engagementAuthenticity: 0,
    followerQuality: 0,
    contentConsistency: 0,
    collaborationHistory: 0,
  },
  niche: [],
  isVerified: false,
});

export const getInfluencerDashboardStats = async (): Promise<InfluencerDashboardStats> => {
  const { data } = await api.get("/dashboard/influencer");
  const stats = data.data ?? {};
  return {
    totalEarnings: stats.totalEarnings ?? 0,
    activeCampaigns: stats.activeCampaigns ?? 0,
    pendingRequests: stats.pendingRequests ?? 0,
    trustScore: stats.trustScore ?? 0,
    recentCampaigns: stats.recentCampaigns ?? [],
    earningsByMonth: stats.earningsByMonth ?? [],
    profileAnalytics: stats.profileAnalytics ?? defaultProfileAnalytics(),
  };
};

export const getBusinessDashboardStats = async (): Promise<BusinessDashboardStats> => {
  const { data } = await api.get("/dashboard/business");
  const stats = data?.data ?? {};
  return {
    totalCampaigns: stats.totalCampaigns ?? 0,
    activeCampaigns: stats.activeCampaigns ?? 0,
    influencersContacted: stats.influencersContacted ?? 0,
    shortlisted: stats.shortlisted ?? 0,
    avgEngagement: stats.avgEngagement ?? "0.0%",
    recentActivity: stats.recentActivity ?? [],
    recentCampaigns: stats.recentCampaigns ?? [],
    campaignActivity: stats.campaignActivity ?? [],
    engagementTrend: stats.engagementTrend ?? [],
  };
};

export const dashboardApi = {
  getInfluencerDashboardStats,
  getBusinessDashboardStats,
};
