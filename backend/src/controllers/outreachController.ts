import { Response, NextFunction } from "express";
import { Outreach } from "../models/Outreach";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { analyzeSentiment } from "../utils/sentimentAnalysis";
import { addInfluencerToCampaign } from "../utils/campaignHelpers";
import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { enableDirectChatForCampaignParticipants } from "../services/directChatService";
import { Campaign } from "../models/Campaign";
import { inviteInfluencerToCampaign } from "../services/campaignInviteService";

// POST /api/outreach — same flow as adding to campaign (platform vs email auto)
export const sendOutreach = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId, influencerId, message, isAiGenerated = false, contactEmail } = req.body;

    if (!campaignId || !influencerId || !message) {
      return next(new AppError("campaignId, influencerId, and message are required", 400));
    }

    const result = await inviteInfluencerToCampaign({
      campaignId,
      businessId: req.user!.userId,
      influencerId,
      message,
      contactEmail,
      isAiGenerated,
    });

    const responseMessage =
      result.channel === "email"
        ? "Invitation sent by email — creator is not registered on Mashhoor yet."
        : "Invitation sent inside Mashhoor.";

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        outreach: result.outreach,
        emailInvite: result.emailInvite,
        channel: result.channel,
        campaign: result.campaign,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/outreach/campaign/:campaignId
export const getOutreachByCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const outreaches = await Outreach.find({ campaign: req.params.campaignId })
      .populate("influencer", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: outreaches });
  } catch (err) {
    next(err);
  }
};

// GET /api/outreach/my-requests  (influencer sees their incoming requests)
export const getMyRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = { influencer: req.user?.userId };
    if (status) filter.status = status;

    const outreaches = await Outreach.find(filter)
      .populate("campaign", "title description budget timeline")
      .populate("business", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: outreaches });
  } catch (err) {
    next(err);
  }
};

// PUT /api/outreach/:id/reply  (influencer replies)
export const replyToOutreach = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reply, accept } = req.body;
    if (!reply) return next(new AppError("Reply message is required", 400));

    const outreach = await Outreach.findById(req.params.id);
    if (!outreach) return next(new AppError("Outreach not found", 404));

    if (outreach.influencer.toString() !== req.user?.userId) {
      return next(new AppError("Not authorized", 403));
    }

    outreach.influencerReply = reply;
    outreach.status = accept === true ? "accepted" : accept === false ? "rejected" : "replied";
    outreach.repliedAt = new Date();

    const sentiment = analyzeSentiment(reply);
    outreach.sentiment = { ...sentiment, analyzedAt: new Date() };

    await outreach.save();

    if (accept === true) {
      const campaign = await Campaign.findById(outreach.campaign);
      if (campaign) {
        campaign.selectedInfluencers = addInfluencerToCampaign(
          campaign.selectedInfluencers,
          outreach.influencer
        );
        if (campaign.status === "draft") {
          campaign.status = "active";
        }
        await campaign.save();

        const influencer = await User.findById(outreach.influencer).select("name");
        await Notification.create({
          user: outreach.business,
          type: "outreach_accepted",
          title: "Influencer accepted your campaign",
          body: `${influencer?.name || "An influencer"} accepted "${campaign.title}". Open Messages to coordinate next steps.`,
          campaign: campaign._id,
          influencer: outreach.influencer,
          outreach: outreach._id,
          isRead: false,
        });

        await enableDirectChatForCampaignParticipants({
          businessId: outreach.business,
          influencerId: outreach.influencer,
          campaignId: campaign._id,
        });
      }
    } else if (accept === false) {
      const campaign = await Campaign.findById(outreach.campaign);
      if (campaign) {
        campaign.selectedInfluencers = campaign.selectedInfluencers.filter(
          (id) => id.toString() !== outreach.influencer.toString()
        );
        await campaign.save();
      }
    }

    const populated = await Outreach.findById(outreach._id)
      .populate("campaign", "title description budget timeline requirements")
      .populate("business", "name email avatar")
      .populate("influencer", "name email avatar");

    res.status(200).json({ success: true, message: "Reply submitted", data: populated ?? outreach });
  } catch (err) {
    next(err);
  }
};

// PUT /api/outreach/:id/status  (mark as opened, etc.)
export const updateOutreachStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const outreach = await Outreach.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(status === "opened" ? { openedAt: new Date() } : {}),
      },
      { new: true }
    );
    if (!outreach) return next(new AppError("Outreach not found", 404));
    res.status(200).json({ success: true, data: outreach });
  } catch (err) {
    next(err);
  }
};
