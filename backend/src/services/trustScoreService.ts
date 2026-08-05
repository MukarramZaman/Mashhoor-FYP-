import { IInfluencerProfile } from "../models/InfluencerProfile";
import { Campaign } from "../models/Campaign";
import { User } from "../models/User";
import { calculateTrustScoreWithML } from "./mlService";
import {
  getUnifiedPlatformMetrics,
  type PrimaryPlatform,
} from "./platformMetricsService";

function scoreEngagementAuthenticity(
  platform: PrimaryPlatform,
  followers: number,
  engagementRate: number,
  isVerified: boolean
): number {
  const boost = isVerified ? 5 : 0;

  if (platform === "instagram") {
    if (followers < 10000) {
      if (engagementRate >= 2 && engagementRate <= 12) return 95 + boost;
      if (engagementRate > 25) return 35;
      if (engagementRate < 0.3) return 8;
      return 72 + boost;
    }
    if (followers < 100000) {
      if (engagementRate >= 1 && engagementRate <= 6) return 95 + boost;
      if (engagementRate > 15) return 38;
      if (engagementRate < 0.15) return 6;
      return 70 + boost;
    }
    if (engagementRate >= 0.5 && engagementRate <= 4) return 92 + boost;
    if (engagementRate > 10) return 40;
    if (engagementRate < 0.1) return 5;
    return 68 + boost;
  }

  // YouTube (default)
  if (followers < 10000) {
    if (engagementRate >= 3 && engagementRate <= 15) return 95 + boost;
    if (engagementRate > 30) return 40;
    if (engagementRate < 0.5) return 10;
    return 75 + boost;
  }
  if (engagementRate >= 1.5 && engagementRate <= 8) return 95 + boost;
  if (engagementRate > 20) return 35;
  if (engagementRate < 0.2) return 5;
  return 75 + boost;
}

function scoreFollowerQuality(
  platform: PrimaryPlatform,
  followers: number,
  interactionRate: number,
  avgLikes: number,
  avgComments: number
): number {
  if (platform === "instagram") {
    const rate = interactionRate > 0 ? interactionRate : 0;
    if (followers > 0 && avgLikes === 0 && avgComments === 0 && rate === 0) {
      return followers < 500 ? 12 : 8;
    }
    if (rate >= 0.04) return Math.min(100, 88 + Math.floor(rate * 250));
    if (rate >= 0.015) return 72 + Math.floor((rate - 0.015) * 1200);
    if (rate >= 0.005) return 45 + Math.floor((rate - 0.005) * 2700);
    if (rate > 0) return Math.max(12, Math.floor(rate * 8000));
    return followers < 500 ? 15 : 6;
  }

  // YouTube: views-to-subscriber ratio
  const viewRatio = interactionRate;
  if (viewRatio >= 0.15) return Math.min(100, 85 + Math.floor(viewRatio * 50));
  if (viewRatio >= 0.05) return 70 + Math.floor((viewRatio - 0.05) * 150);
  if (viewRatio > 0) return Math.max(10, Math.floor(viewRatio * 1400));
  return followers < 500 ? 15 : 5;
}

function scoreContentConsistency(
  platform: PrimaryPlatform,
  followers: number,
  daysSinceLastContent: number | undefined,
  contentCount: number | undefined,
  engagementRate: number,
  avgLikes: number,
  isVerified: boolean
): number {
  const boost = isVerified ? 5 : 0;

  if (contentCount !== undefined && contentCount === 0) return 0;

  if (daysSinceLastContent !== undefined && daysSinceLastContent >= 0) {
    if (daysSinceLastContent <= 3) return 95 + boost;
    if (daysSinceLastContent <= 7) return 90 + boost;
    if (daysSinceLastContent <= 14) return 82 + boost;
    if (daysSinceLastContent <= 30) return 75 - Math.floor(daysSinceLastContent / 4) + boost;
    if (daysSinceLastContent <= 60) return 55 - Math.floor((daysSinceLastContent - 30) / 3) + boost;
    if (daysSinceLastContent <= 90) return 35 - Math.floor((daysSinceLastContent - 60) / 5) + boost;
    return Math.max(5, 18 - Math.floor(daysSinceLastContent / 30));
  }

  if (platform === "instagram") {
    if (avgLikes > 0 && engagementRate >= 1) {
      const base = 65 + Math.min(25, Math.floor(engagementRate * 2));
      return Math.min(95, base + boost);
    }
    if (followers > 1000 && engagementRate > 0) return 50 + boost;
    if (followers > 0 && avgLikes === 0) return 25;
    return followers < 500 ? 10 : 35;
  }

  if (contentCount !== undefined && contentCount > 0) {
    return Math.min(60, 30 + contentCount * 2);
  }

  return followers < 500 ? 10 : 40;
}

export const calculateTrustScore = async (
  profile: IInfluencerProfile
): Promise<{ score: number; breakdown: any; aiModelMetrics?: any }> => {
  const metrics = getUnifiedPlatformMetrics(profile);
  const {
    primaryPlatform,
    followers,
    engagementRate,
    interactionRate,
    daysSinceLastContent,
    contentCount,
    avgLikes,
    avgComments,
  } = metrics;

  const isVerified = profile.isVerified || false;

  // Only count collaborations if the influencer has signed up on the platform
  const user = await User.findById(profile.user).select("hasSignedUp");
  const isRegistered = user?.hasSignedUp === true;

  const pastCampaigns = isRegistered
    ? await Campaign.find({ selectedInfluencers: profile.user })
    : [];
  const campaignCount = pastCampaigns.length;
  let collaborationHistory = 0;

  if (campaignCount > 0) {
    const influencerReviews = pastCampaigns.flatMap((c) =>
      (c.reviews || []).filter((r) => r.influencer.toString() === profile.user.toString())
    );
    if (influencerReviews.length > 0) {
      const avgRating =
        influencerReviews.reduce((sum, r) => sum + r.rating, 0) / influencerReviews.length;
      collaborationHistory = Math.round((avgRating / 5) * 100);
    } else {
      collaborationHistory = Math.min(100, 70 + campaignCount * 10);
    }
  }

  const engagementAuthenticity = scoreEngagementAuthenticity(
    primaryPlatform,
    followers,
    engagementRate,
    isVerified
  );

  const followerQuality = scoreFollowerQuality(
    primaryPlatform,
    followers,
    interactionRate,
    avgLikes,
    avgComments
  );

  const contentConsistency = scoreContentConsistency(
    primaryPlatform,
    followers,
    daysSinceLastContent,
    contentCount,
    engagementRate,
    avgLikes,
    isVerified
  );

  const breakdown = {
    engagementAuthenticity: Math.round(
      Math.max(0, Math.min(100, engagementAuthenticity))
    ),
    followerQuality: Math.round(Math.max(0, Math.min(100, followerQuality))),
    contentConsistency: Math.round(Math.max(0, Math.min(100, contentConsistency))),
    collaborationHistory: Math.round(Math.max(0, Math.min(100, collaborationHistory))),
  };

  const mlResult = calculateTrustScoreWithML(
    breakdown.followerQuality,
    breakdown.engagementAuthenticity,
    breakdown.contentConsistency,
    breakdown.collaborationHistory
  );

  let activePillarAverage = 0;
  if (campaignCount > 0) {
    activePillarAverage =
      (breakdown.engagementAuthenticity +
        breakdown.followerQuality +
        breakdown.contentConsistency +
        breakdown.collaborationHistory) /
      4;
  } else {
    activePillarAverage =
      (breakdown.engagementAuthenticity +
        breakdown.followerQuality +
        breakdown.contentConsistency) /
      3;
  }

  const mlWeight = 0.3;
  const pillarWeight = 0.7;
  const accurateScore = Math.round(
    mlWeight * mlResult.trustScore + pillarWeight * activePillarAverage
  );

  return {
    score: Math.max(0, Math.min(100, accurateScore)),
    breakdown,
    aiModelMetrics: {
      ...mlResult.aiModelMetrics,
      primaryPlatform,
    },
  };
};
