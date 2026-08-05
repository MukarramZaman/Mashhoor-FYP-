import { Response, NextFunction } from "express";
import { User } from "../models/User";
import { Campaign } from "../models/Campaign";
import { Outreach } from "../models/Outreach";
import { InfluencerProfile } from "../models/InfluencerProfile";
import { ALLOWED_INSTAGRAM_HANDLES, ALLOWED_YOUTUBE_HANDLES } from "./influencerController";
import { AuthRequest } from "../types";

// GET /api/admin/stats
export const getAdminStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    void req;

    const signedUpUserDocs = await User.find({ role: "influencer", hasSignedUp: true }).select("_id");
    const signedUpUserIds = signedUpUserDocs.map(doc => doc._id);

    const influencerFilter = {
      $or: [
        { "platforms.instagram.handle": { $in: ALLOWED_INSTAGRAM_HANDLES } },
        { "platforms.youtube.handle": { $in: ALLOWED_YOUTUBE_HANDLES } },
        { user: { $in: signedUpUserIds } },
      ],
    };

    const activeProfiles = await InfluencerProfile.find(influencerFilter).select("user");
    const activeInfluencerUserIds = activeProfiles.map(p => p.user).filter(Boolean);
    const totalInfluencers = activeInfluencerUserIds.length;

    const [
      totalBusinesses,
      totalCampaigns,
      activeCampaigns,
      pendingVerification,
      totalOutreach,
      pendingOutreach,
      recentUsers,
      recentCampaigns,
    ] = await Promise.all([
      User.countDocuments({ role: "business" }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: "active" }),
      User.countDocuments({ _id: { $in: activeInfluencerUserIds }, isVerified: false }),
      Outreach.countDocuments(),
      Outreach.countDocuments({ status: "pending" }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name role createdAt"),
      Campaign.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title status createdAt")
        .populate("business", "name"),
    ]);

    const recentActivity = [
      ...recentUsers.map((u) => ({
        id: u._id.toString(),
        type: "user" as const,
        text: `New ${u.role} registered: ${u.name}`,
        time: u.createdAt,
      })),
      ...recentCampaigns.map((c) => ({
        id: c._id.toString(),
        type: "campaign" as const,
        text: `Campaign created: ${c.title}`,
        time: c.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
      .map((item) => ({
        ...item,
        time: formatRelativeTime(new Date(item.time)),
      }));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const userGrowth = userGrowthRaw.map(g => ({
      month: monthNames[g._id.month - 1],
      count: g.count
    }));

    res.status(200).json({
      success: true,
      data: {
        totalInfluencers,
        totalBusinesses,
        totalCampaigns,
        activeCampaigns,
        pendingVerification,
        totalOutreach,
        pendingOutreach,
        recentActivity,
        userGrowth,
      },
    });
  } catch (err) {
    next(err);
  }
};

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// GET /api/admin/verifications/pending
export const getPendingVerifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await User.find({ isVerified: false })
      .select("name email role createdAt avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/verifications/:id/approve
export const verifyUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );

    if (!user) {
       res.status(404).json({ success: false, message: "User not found" });
       return;
    }

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/verifications/:id/reject
export const rejectUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (user.role === "influencer") {
      await InfluencerProfile.deleteOne({ user: userId });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User rejected and deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

