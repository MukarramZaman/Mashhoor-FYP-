import { IInfluencerProfile } from "../models/InfluencerProfile";

export type PrimaryPlatform = "youtube" | "instagram" | "tiktok" | "mixed";

export interface UnifiedPlatformMetrics {
  primaryPlatform: PrimaryPlatform;
  followers: number;
  engagementRate: number;
  campaignReach: number;
  interactionRate: number;
  daysSinceLastContent?: number;
  contentCount?: number;
  avgLikes: number;
  avgComments: number;
}

function platformScores(profile: IInfluencerProfile) {
  const ig = profile.platforms?.instagram?.followers ?? 0;
  const yt = profile.platforms?.youtube?.subscribers ?? 0;
  const tt = profile.platforms?.tiktok?.followers ?? 0;
  return { ig, yt, tt };
}

export function getPrimaryPlatform(profile: IInfluencerProfile): PrimaryPlatform {
  const { ig, yt, tt } = platformScores(profile);
  const max = Math.max(ig, yt, tt);
  if (max === 0) {
    if (profile.platforms?.instagram?.handle) return "instagram";
    if (profile.platforms?.youtube?.handle) return "youtube";
    if (profile.platforms?.tiktok?.handle) return "tiktok";
    return "mixed";
  }
  const leaders: PrimaryPlatform[] = [];
  if (ig === max) leaders.push("instagram");
  if (yt === max) leaders.push("youtube");
  if (leaders.length > 1) return "mixed";
  return leaders[0];
}

function resolveDominantPlatform(profile: IInfluencerProfile): Exclude<PrimaryPlatform, "mixed"> {
  const primary = getPrimaryPlatform(profile);
  if (primary !== "mixed") return primary;

  const { ig, yt, tt } = platformScores(profile);
  if (ig >= yt && ig >= tt && ig > 0) return "instagram";
  if (yt >= ig && yt >= tt && yt > 0) return "youtube";
  if (tt > 0) return "tiktok";
  if (profile.platforms?.instagram?.handle) return "instagram";
  if (profile.platforms?.youtube?.handle) return "youtube";
  return "youtube";
}

function resolveInstagramEngagement(
  ig: NonNullable<IInfluencerProfile["platforms"]["instagram"]>
): number {
  if (ig.engagementRate && ig.engagementRate > 0) return ig.engagementRate;
  const followers = ig.followers ?? 0;
  const likes = ig.avgLikes ?? 0;
  const comments = ig.avgComments ?? 0;
  if (followers > 0 && (likes > 0 || comments > 0)) {
    return Math.min(100, Number((((likes + comments) / followers) * 100).toFixed(2)));
  }
  return 0;
}

function instagramCampaignReach(
  ig: NonNullable<IInfluencerProfile["platforms"]["instagram"]>,
  engagementRate: number
): number {
  const likes = ig.avgLikes ?? 0;
  const comments = ig.avgComments ?? 0;
  const followers = ig.followers ?? 0;

  if (likes > 0 || comments > 0) {
    // We use a conservative 2x multiplier for engagements when views are not available
    return Math.round((likes + comments) * 2);
  }
  if (followers > 0 && engagementRate > 0) {
    return Math.round(followers * (engagementRate / 100));
  }
  return Math.round(followers * 0.15);
}

function youtubeCampaignReach(
  yt: NonNullable<IInfluencerProfile["platforms"]["youtube"]>
): number {
  if (yt.avgViews && yt.avgViews > 0) return yt.avgViews;
  const subs = yt.subscribers ?? 0;
  const er = yt.engagementRate ?? 0;
  if (subs > 0 && er > 0) return Math.round(subs * (er / 100));
  return Math.round(subs * 0.1);
}

function metricsForInstagram(
  profile: IInfluencerProfile,
  reportedPrimary: PrimaryPlatform
): UnifiedPlatformMetrics {
  const ig = profile.platforms?.instagram ?? {
    handle: "",
    followers: 0,
    engagementRate: 0,
    avgLikes: 0,
    avgComments: 0,
  };
  const engagementRate =
    resolveInstagramEngagement(ig) || profile.avgEngagementRate || 0;
  const followers = ig.followers ?? 0;

  return {
    primaryPlatform: reportedPrimary,
    followers: followers || profile.totalFollowers,
    engagementRate,
    campaignReach: instagramCampaignReach(ig, engagementRate),
    interactionRate:
      followers > 0
        ? ((ig.avgLikes ?? 0) + (ig.avgComments ?? 0)) / followers
        : 0,
    daysSinceLastContent: ig.daysSinceLastPost,
    contentCount: ig.postCount,
    avgLikes: ig.avgLikes ?? 0,
    avgComments: ig.avgComments ?? 0,
  };
}

function metricsForYoutube(
  profile: IInfluencerProfile,
  reportedPrimary: PrimaryPlatform
): UnifiedPlatformMetrics {
  const yt = profile.platforms?.youtube ?? {
    handle: "",
    subscribers: 0,
    avgViews: 0,
    engagementRate: 0,
  };
  const followers = yt.subscribers ?? profile.totalFollowers ?? 0;
  const engagementRate = yt.engagementRate || profile.avgEngagementRate || 0;
  const avgViews = yt.avgViews ?? 0;

  return {
    primaryPlatform: reportedPrimary,
    followers,
    engagementRate,
    campaignReach: youtubeCampaignReach(yt),
    interactionRate: followers > 0 ? avgViews / followers : 0,
    daysSinceLastContent: yt.daysSinceLastUpload,
    contentCount: yt.videoCount,
    avgLikes: 0,
    avgComments: 0,
  };
}

function metricsForTiktok(
  profile: IInfluencerProfile,
  reportedPrimary: PrimaryPlatform
): UnifiedPlatformMetrics {
  const tt = profile.platforms?.tiktok ?? { handle: "", followers: 0, engagementRate: 0 };
  const followers = tt.followers ?? 0;
  const engagementRate = tt.engagementRate || profile.avgEngagementRate || 0;
  const campaignReach =
    followers > 0 && engagementRate > 0
      ? Math.round(followers * (engagementRate / 100))
      : Math.round(followers * 0.12);

  return {
    primaryPlatform: reportedPrimary,
    followers,
    engagementRate,
    campaignReach,
    interactionRate: followers > 0 ? campaignReach / followers : 0,
    avgLikes: 0,
    avgComments: 0,
  };
}

export function getUnifiedPlatformMetrics(
  profile: IInfluencerProfile
): UnifiedPlatformMetrics {
  const reportedPrimary = getPrimaryPlatform(profile);
  const dominant = resolveDominantPlatform(profile);

  if (dominant === "instagram") {
    return metricsForInstagram(profile, reportedPrimary);
  }
  if (dominant === "tiktok") {
    return metricsForTiktok(profile, reportedPrimary);
  }
  return metricsForYoutube(profile, reportedPrimary);
}

export function getCampaignReachForROI(profile: IInfluencerProfile): number {
  return Math.max(1, getUnifiedPlatformMetrics(profile).campaignReach);
}
