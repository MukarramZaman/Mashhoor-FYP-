import mongoose from "mongoose";
import { Campaign } from "../models/Campaign";
import { Outreach } from "../models/Outreach";
import { User } from "../models/User";
import { EmailInvite } from "../models/EmailInvite";
import { AppError } from "../middleware/errorHandler";
import {
  generateInviteToken,
  isRegisteredOnPlatform,
  resolveInviteEmail,
  sendCampaignInvitationEmail,
  shouldSendEmailInvite,
} from "./invitationEmailService";
import { isEmailConfigured } from "./emailService";
import { ICampaign } from "../models/Campaign";
import { bootstrapPlatformCampaignMessaging } from "./messagingService";
import { Notification } from "../models/Notification";

export type InviteChannel = "platform" | "email";

export type CampaignInviteResult = {
  channel: InviteChannel;
  campaign: ICampaign;
  outreach: InstanceType<typeof Outreach>;
  emailInvite: InstanceType<typeof EmailInvite> | null;
};

async function deliverInvitationEmail(params: {
  campaignId: string;
  campaignTitle: string;
  businessId: string;
  businessName: string;
  influencerName: string;
  email: string;
  message: string;
  influencerId?: string;
  outreachId?: unknown;
}) {
  if (!isEmailConfigured()) {
    throw new AppError("Email service is not configured. Add SMTP credentials to .env", 503);
  }

  const inviteToken = generateInviteToken();

  const duplicateInvite = await EmailInvite.findOne({
    campaign: params.campaignId,
    email: params.email,
  });
  if (duplicateInvite) {
    // Instead of throwing an error, delete the old invite so we can send a new one
    await EmailInvite.deleteOne({ _id: duplicateInvite._id });
  }

  await sendCampaignInvitationEmail({
    to: params.email,
    influencerName: params.influencerName,
    campaignName: params.campaignTitle,
    businessName: params.businessName,
    campaignId: params.campaignId,
    inviteToken,
    personalMessage: params.message,
  });

  const emailInvite = await EmailInvite.create({
    campaign: params.campaignId,
    business: params.businessId,
    influencer: params.influencerId,
    influencerName: params.influencerName,
    email: params.email,
    message: params.message,
    inviteToken,
    status: "sent",
    outreach: params.outreachId,
    sentAt: new Date(),
  });

  console.log(`📧 Campaign invitation email queued for ${params.email} (${params.campaignTitle})`);
  return emailInvite;
}

/**
 * Add influencer to campaign and invite them:
 * - Registered on Mashhoor → in-platform outreach only
 * - Not registered (e.g. seeded @youtube.test) → email invitation automatically
 */
export async function inviteInfluencerToCampaign(params: {
  campaignId: string;
  businessId: string;
  influencerId: string;
  message: string;
  contactEmail?: string;
  isAiGenerated?: boolean;
}): Promise<CampaignInviteResult> {
  const { campaignId, businessId, influencerId, message, contactEmail, isAiGenerated = false } =
    params;

  if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(influencerId)) {
    throw new AppError("Invalid campaign or influencer id", 400);
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new AppError("Campaign not found", 404);

  if (campaign.business.toString() !== businessId) {
    throw new AppError("Not authorized", 403);
  }

  const influencer = await User.findById(influencerId).select("name email role hasSignedUp");
  if (!influencer || influencer.role !== "influencer") {
    throw new AppError("Influencer not found", 404);
  }

  const business = await User.findById(businessId);
  const businessName = business?.name || "A Mashhoor business";

  const alreadyAdded = campaign.selectedInfluencers.some(
    (id) => id.toString() === influencerId
  );
  if (!alreadyAdded) {
    campaign.selectedInfluencers.push(new mongoose.Types.ObjectId(influencerId));
    await campaign.save();
  }

  let outreach = await Outreach.findOne({ campaign: campaignId, influencer: influencerId });
  if (!outreach) {
    outreach = await Outreach.create({
      campaign: campaignId,
      business: businessId,
      influencer: influencerId,
      message,
      isAiGenerated,
      status: "sent",
    });
  } else if (message && outreach.message !== message) {
    outreach.message = message;
    await outreach.save();
  }

  const registered = isRegisteredOnPlatform(influencer);
  const useEmail = shouldSendEmailInvite(influencer, contactEmail);

  if (registered && !useEmail) {
    await bootstrapPlatformCampaignMessaging({
      outreach,
      campaign,
      business: business!,
      influencer,
    });

    const existingAlert = await Notification.findOne({
      user: influencer._id,
      type: "campaign_invite",
      outreach: outreach._id,
    });
    if (!existingAlert) {
      await Notification.create({
        user: influencer._id,
        type: "campaign_invite",
        title: "New campaign invitation",
        body: `${businessName} invited you to "${campaign.title}". Review the request and chat with the Mashhoor assistant.`,
        campaign: campaign._id,
        influencer: influencer._id,
        outreach: outreach._id,
        isRead: false,
      });
    }

    return {
      channel: "platform",
      campaign,
      outreach,
      emailInvite: null,
    };
  }

  if (!useEmail) {
    throw new AppError(
      "This influencer is not registered on Mashhoor. Enter their real email address so we can send the invitation.",
      400
    );
  }

  const emailTo = resolveInviteEmail(influencer.email, contactEmail)!;

  if (!isEmailConfigured()) {
    throw new AppError(
      "Email service is not configured. Add SMTP_LOGIN and SMTP_PASSWORD to backend/.env",
      503
    );
  }

  console.log(`📨 Sending campaign email invite to ${emailTo} (influencer ${influencerId}, campaign ${campaignId})`);

  const emailInvite = await deliverInvitationEmail({
    campaignId,
    campaignTitle: campaign.title,
    businessId,
    businessName,
    influencerId,
    influencerName: influencer.name,
    email: emailTo,
    message,
    outreachId: outreach._id,
  });

  outreach.status = "sent";
  await outreach.save();

  return {
    channel: "email",
    campaign,
    outreach,
    emailInvite,
  };
}
