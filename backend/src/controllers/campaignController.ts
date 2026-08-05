import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Campaign } from "../models/Campaign";
import { Outreach } from "../models/Outreach";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { inviteInfluencerToCampaign } from "../services/campaignInviteService";
import { calculateCampaignProgress } from "../utils/campaignHelpers";

// GET /api/campaigns  (business sees their own)
export const getMyCampaigns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, page = "1", limit = "10" } = req.query as Record<string, string>;
    const userId = req.user?.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return next(new AppError("Invalid user session", 401));
    }
    const filter: Record<string, unknown> = { business: new mongoose.Types.ObjectId(userId) };
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Campaign.countDocuments(filter),
    ]);

    const updatedCampaigns = await Promise.all(
      campaigns.map(async (c) => {
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

    res.status(200).json({
      success: true,
      data: updatedCampaigns,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/campaigns/:id
export const getCampaignById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate(
      "selectedInfluencers",
      "name email avatar"
    );
    if (!campaign) return next(new AppError("Campaign not found", 404));

    if (campaign.timeline && campaign.timeline.startDate && campaign.timeline.endDate) {
      const progress = calculateCampaignProgress(campaign.timeline.startDate, campaign.timeline.endDate);
      if (campaign.progress !== progress) {
        campaign.progress = progress;
        await Campaign.updateOne({ _id: campaign._id }, { $set: { progress } });
      }
    }

    // Business can only see their own; influencers see campaigns they're selected for
    const userId = req.user?.userId;
    const isOwner = campaign.business.toString() === userId;
    const isSelected = campaign.selectedInfluencers.some(
      (inf) => inf._id?.toString() === userId
    );

    let hasOutreach = false;
    if (!isOwner && !isSelected) {
      hasOutreach = (await Outreach.exists({
        campaign: campaign._id,
        influencer: userId
      })) !== null;
    }

    if (!isOwner && !isSelected && !hasOutreach) {
      return next(new AppError("Not authorized to view this campaign", 403));
    }

    res.status(200).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};

// POST /api/campaigns
export const createCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title, description, niche, targetLocations,
      budget, requirements, timeline, goals,
    } = req.body;

    if (!title || !description || !niche || !budget || !timeline) {
      return next(new AppError("title, description, niche, budget, and timeline are required", 400));
    }

    if (!timeline.startDate || !timeline.endDate) {
      return next(new AppError("startDate and endDate are required in timeline", 400));
    }

    const parseDateString = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseDateString(timeline.startDate);
    const end = parseDateString(timeline.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return next(new AppError("Start date must be today or in the future", 400));
    }

    if (start.getTime() === end.getTime()) {
      return next(new AppError("End date cannot be the same as the start date", 400));
    }

    if (end < start) {
      return next(new AppError("End date must be after the start date", 400));
    }

    const userId = req.user?.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return next(new AppError("Invalid user session", 401));
    }

    const campaign = await Campaign.create({
      business: new mongoose.Types.ObjectId(userId),
      title,
      description,
      niche,
      targetLocations,
      budget,
      requirements,
      timeline,
      goals,
      status: "draft",
    });

    res.status(201).json({
      success: true,
      message: "Campaign created",
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/campaigns/:id
export const updateCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(new AppError("Campaign not found", 404));

    if (campaign.business.toString() !== req.user?.userId) {
      return next(new AppError("Not authorized", 403));
    }

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return next(new AppError("Cannot edit a completed or cancelled campaign", 400));
    }

    if (req.body.timeline) {
      const { startDate, endDate } = req.body.timeline;
      if (startDate && endDate) {
        const parseDateString = (dateStr: string) => {
          const [year, month, day] = dateStr.split("-").map(Number);
          return new Date(year, month - 1, day);
        };
        const start = parseDateString(startDate);
        const end = parseDateString(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
          return next(new AppError("Start date must be today or in the future", 400));
        }
        if (start.getTime() === end.getTime()) {
          return next(new AppError("End date cannot be the same as the start date", 400));
        }
        if (end < start) {
          return next(new AppError("End date must be after the start date", 400));
        }
      }
    }

    const allowedFields = [
      "title", "description", "niche", "targetLocations",
      "budget", "requirements", "timeline", "goals", "status", "progress",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await Campaign.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: "Campaign updated", data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/campaigns/:id
export const deleteCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(new AppError("Campaign not found", 404));

    if (campaign.business.toString() !== req.user?.userId) {
      return next(new AppError("Not authorized", 403));
    }

    await campaign.deleteOne();
    res.status(200).json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/campaigns/:id/influencers
// Adds influencer + sends invite (in-app if registered, email if not)
export const addInfluencerToCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { influencerId, message, contactEmail } = req.body;

    if (!influencerId || !message?.trim()) {
      return next(new AppError("influencerId and message are required", 400));
    }

    const result = await inviteInfluencerToCampaign({
      campaignId: req.params.id,
      businessId: req.user!.userId,
      influencerId,
      message: message.trim(),
      contactEmail,
    });

    const responseMessage =
      result.channel === "email"
        ? "Influencer added. Mashhoor sent them an email invitation to join the platform."
        : "Influencer added. They will receive your invitation inside Mashhoor.";

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        campaign: result.campaign,
        outreach: result.outreach,
        emailInvite: result.emailInvite,
        channel: result.channel,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/campaigns/influencer  (influencer sees campaigns they're part of)
export const getInfluencerCampaigns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaigns = await Campaign.find({
      selectedInfluencers: req.user?.userId,
      status: { $in: ["active", "completed"] },
    })
      .populate("business", "name email avatar")
      .sort({ createdAt: -1 });

    const updatedCampaigns = await Promise.all(
      campaigns.map(async (c) => {
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

    res.status(200).json({ success: true, data: updatedCampaigns });
  } catch (err) {
    next(err);
  }
};


