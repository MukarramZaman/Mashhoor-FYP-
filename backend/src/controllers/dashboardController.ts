import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types";
import { Campaign } from "../models/Campaign";
import { Outreach } from "../models/Outreach";
import { InfluencerProfile, IInfluencerProfile } from "../models/InfluencerProfile";
import { AppError } from "../middleware/errorHandler";
import { calculateTrustScore } from "../services/trustScoreService";
import { syncYouTubeForProfile } from "../services/youtubeSyncService";
import { getUnifiedPlatformMetrics } from "../services/platformMetricsService";
import { Notification } from "../models/Notification";
import { calculateCampaignProgress } from "../utils/campaignHelpers";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getLast6Months = () =>
  Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { month: months[d.getMonth()], year: d.getFullYear(), numericMonth: d.getMonth() };
  });

const toBusinessId = (userId: string) => new mongoose.Types.ObjectId(userId);

const toTimestamp = (value: Date | string | undefined) =>
  value ? new Date(value).getTime() : 0;

const YOUTUBE_SYNC_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Refresh YouTube stats — skipped if synced within the last hour to avoid hammering the API. */
async function refreshYouTubeAnalytics(profile: IInfluencerProfile): Promise<void> {
  const user = profile.user as { email?: string } | undefined;
  const hasHandle = !!profile.platforms?.youtube?.handle?.trim();
  const isSeeded = user?.email?.endsWith("@youtube.test");
  if (!hasHandle && !isSeeded) return;

  // Skip sync if the profile was updated recently (within TTL)
  const lastSynced = profile.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
  if (Date.now() - lastSynced < YOUTUBE_SYNC_TTL_MS) return;

  try {
    await syncYouTubeForProfile(profile, user?.email);
  } catch (err) {
    // Log a short warning only — full stack trace is not useful for network timeouts
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Dashboard YouTube sync skipped (network error): ${msg}`);
  }
}

export const getInfluencerDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new AppError("User ID missing", 400));
    const influencerId = new mongoose.Types.ObjectId(userId);

    let profile = await InfluencerProfile.findOne({ user: userId }).populate("user", "name email avatar");

    if (!profile) {
      profile = await InfluencerProfile.create({
        user: userId,
        niche: ["Unspecified"],
        location: "",
        country: "",
        bio: "",
        platforms: {},
      });
      await profile.populate("user", "name email avatar");
    }

    await refreshYouTubeAnalytics(profile);

    const { score, breakdown } = await calculateTrustScore(profile);
    profile.trustScore = score;
    profile.trustScoreBreakdown = breakdown;
    await profile.save();

    const last6Months = getLast6Months();

    const acceptedOutreachCount = await Outreach.countDocuments({
      influencer: influencerId,
      status: "accepted",
    });

    const activeCampaignsCount = await Campaign.countDocuments({
      selectedInfluencers: influencerId,
      status: { $in: ["active", "draft", "paused"] },
    });

    const activeCampaigns = Math.max(acceptedOutreachCount, activeCampaignsCount);

    const pendingRequestsCount = await Outreach.countDocuments({
      influencer: influencerId,
      status: { $in: ["pending", "sent", "opened"] },
    });

    const acceptedOutreaches = await Outreach.find({
      influencer: influencerId,
      status: "accepted",
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("campaign")
      .populate("business", "name");

    const recentCampaigns = acceptedOutreaches
      .map((o) => {
        const camp = o.campaign as { title?: string; toObject?: () => Record<string, unknown> } | null;
        if (!camp || !("title" in camp)) return null;
        const base = typeof camp.toObject === "function" ? camp.toObject() : { ...camp };
        return {
          ...base,
          business: o.business,
          outreachId: o._id,
          acceptedAt: o.repliedAt ?? o.updatedAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .slice(0, 3);

    const allAcceptedOutreaches = await Outreach.find({
      influencer: influencerId,
      status: "accepted",
    }).populate("campaign");

    let totalEarnings = 0;
    
    // We must map it with year so we can find it properly in the loop
    const earningsByMonth = last6Months.map((m) => ({ month: m.month, year: m.year, numericMonth: m.numericMonth, amount: 0 }));

    allAcceptedOutreaches.forEach((o) => {
      const camp = o.campaign as any;
      if (camp && camp.budget && camp.budget.total) {
        totalEarnings += camp.budget.total;
        
        const d = new Date(o.updatedAt);
        const mIndex = earningsByMonth.findIndex(
          (m) => m.month === months[d.getMonth()] && m.year === d.getFullYear()
        );
        if (mIndex !== -1) {
          earningsByMonth[mIndex].amount += camp.budget.total;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        activeCampaigns,
        pendingRequests: pendingRequestsCount,
        trustScore: profile.trustScore,
        recentCampaigns,
        earningsByMonth,
        profileAnalytics: {
          totalFollowers: profile.totalFollowers,
          avgEngagementRate: profile.avgEngagementRate,
          platforms: profile.platforms,
          trustScoreBreakdown: profile.trustScoreBreakdown,
          niche: profile.niche,
          isVerified: profile.isVerified,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getBusinessDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new AppError("User ID missing", 400));

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(new AppError("Invalid user ID", 400));
    }

    const businessId = toBusinessId(userId);

    const totalCampaigns = await Campaign.countDocuments({ business: businessId });
    const activeCampaigns = await Campaign.countDocuments({
      business: businessId,
      status: "active",
    });

    // Influencers contacted
    const influencersContacted = await Outreach.countDocuments({ business: businessId });

    // Shortlisted / Accepted
    const shortlisted = await Outreach.countDocuments({
      business: businessId,
      status: { $in: ["accepted", "replied"] },
    });

    // Recent campaigns for dashboard list
    const rawRecentCampaignsList = await Campaign.find({ business: businessId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title status createdAt budget progress timeline");

    const recentCampaignsList = await Promise.all(
      rawRecentCampaignsList.map(async (c) => {
        if (c.timeline && c.timeline.startDate && c.timeline.endDate) {
          const progress = calculateCampaignProgress(c.timeline.startDate, c.timeline.endDate);
          if (c.progress !== progress) {
            c.progress = progress;
            await Campaign.updateOne({ _id: c._id }, { $set: { progress } });
          }
        }
        return c;
      })
    );

    // Recent Activity (Campaign creations and Outreaches)
    const recentCampaigns = recentCampaignsList.slice(0, 2);
      
    const recentOutreaches = await Outreach.find({ business: businessId })
      .sort({ updatedAt: -1 })
      .limit(4)
      .populate("influencer", "name");

    const alertNotifications = await Notification.find({
      user: businessId,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("influencer", "name");

    const recentActivity = [
      ...recentCampaigns.map(c => ({
        id: c._id,
        type: "campaign",
        text: `Campaign '${c.title}' created`,
        date: c.createdAt,
      })),
      ...recentOutreaches.map((o) => {
        const inf = o.influencer as { name?: string } | undefined;
        let text = `Contacted @${inf?.name || "influencer"} for collaboration`;
        let type = "contact";

        if (o.status === "accepted") {
          text = `@${inf?.name || "influencer"} accepted your campaign request!`;
          type = "Approvals";
        } else if (o.status === "rejected") {
          text = `@${inf?.name || "influencer"} declined your request.`;
          type = "Messages";
        } else if (o.status === "replied") {
          text = `New message from @${inf?.name || "influencer"}`;
          type = "Messages";
        }

        return {
          id: String(o._id) + o.status,
          type,
          text,
          date: o.updatedAt,
        };
      }),
      ...alertNotifications.map((n) => ({
        id: n._id.toString(),
        type:
          n.type === "outreach_accepted" || n.type === "influencer_interested"
            ? "Approvals"
            : "Messages",
        text: n.body,
        date: n.createdAt,
      })),
    ]
      .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date))
      .slice(0, 8);

    // ─── Real-Time Charts Data Aggregation ───
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: months[d.getMonth()], year: d.getFullYear(), numericMonth: d.getMonth() };
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Campaign Activity
    const campaignsLast6Months = await Campaign.find({
      business: businessId,
      createdAt: { $gte: sixMonthsAgo },
    });

    const campaignActivity = last6Months.map(m => {
      const count = campaignsLast6Months.filter(c => {
        const d = new Date(c.createdAt);
        return d.getMonth() === m.numericMonth && d.getFullYear() === m.year;
      }).length;
      return { month: m.month, count };
    });

    // Engagement Trend
    const outreachesLast6Months = await Outreach.find({
      business: businessId,
      status: { $in: ["sent", "opened", "replied", "accepted"] },
      updatedAt: { $gte: sixMonthsAgo },
    }).populate("influencer", "_id");

    const influencerIds = outreachesLast6Months
      .map((o) => {
        const inf = o.influencer as mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
        if (inf && typeof inf === "object" && "_id" in inf && inf._id) return inf._id;
        return inf as mongoose.Types.ObjectId;
      })
      .filter(Boolean);
    const influencerProfiles = await InfluencerProfile.find({ user: { $in: influencerIds } });

    const engagementMap = new Map();
    influencerProfiles.forEach(p => {
      const metrics = getUnifiedPlatformMetrics(p);
      engagementMap.set(p.user.toString(), metrics.engagementRate || 0);
    });

    let totalEngagement = 0;
    let engagementCount = 0;

    const engagementTrend = last6Months.map(m => {
      const outreachesInMonth = outreachesLast6Months.filter(o => {
        const d = new Date(o.updatedAt);
        return d.getMonth() === m.numericMonth && d.getFullYear() === m.year;
      });

      let monthTotal = 0;
      let monthCount = 0;

      outreachesInMonth.forEach((o) => {
        const inf = o.influencer as mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
        const infId =
          inf && typeof inf === "object" && "_id" in inf && inf._id
            ? inf._id.toString()
            : (inf as mongoose.Types.ObjectId)?.toString?.() ?? "";
        const rate = engagementMap.get(infId) || 0;
        if (rate > 0) {
          monthTotal += rate;
          monthCount++;
          totalEngagement += rate;
          engagementCount++;
        }
      });

      return {
        month: m.month,
        rate: monthCount > 0 ? Number((monthTotal / monthCount).toFixed(1)) : 0
      };
    });

    const avgEngagement = engagementCount > 0 ? Number((totalEngagement / engagementCount).toFixed(1)) + "%" : "0.0%";

    res.status(200).json({
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        influencersContacted,
        shortlisted,
        avgEngagement,
        recentActivity,
        recentCampaigns: recentCampaignsList,
        campaignActivity,
        engagementTrend,
      },
    });
  } catch (err) {
    next(err);
  }
};
