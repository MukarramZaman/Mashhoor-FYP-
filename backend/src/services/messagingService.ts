import mongoose from "mongoose";
import { Conversation, Message } from "../models/Message";
import { ICampaign } from "../models/Campaign";
import { IOutreach } from "../models/Outreach";
import { IUser } from "../models/User";
import { generateAssistantWelcome } from "./campaignAssistantService";
import { scheduleInterestCheck } from "./campaignInterestService";

export async function findOrCreateCampaignConversation(params: {
  businessId: mongoose.Types.ObjectId;
  influencerId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  outreachId?: mongoose.Types.ObjectId;
}): Promise<InstanceType<typeof Conversation>> {
  const { businessId, influencerId, campaignId, outreachId } = params;

  let convo = await Conversation.findOne({
    participants: { $all: [businessId, influencerId] },
    campaign: campaignId,
  });

  if (!convo) {
    convo = await Conversation.create({
      participants: [businessId, influencerId],
      campaign: campaignId,
      outreach: outreachId,
      unreadCount: new Map(),
    });
  } else if (outreachId && !convo.outreach) {
    convo.outreach = outreachId;
    await convo.save();
  }

  return convo;
}

/** Seed business outreach + Mashhoor assistant welcome when a registered influencer is invited. */
export async function bootstrapPlatformCampaignMessaging(params: {
  outreach: IOutreach;
  campaign: ICampaign;
  business: IUser;
  influencer: IUser;
}): Promise<InstanceType<typeof Conversation>> {
  const { outreach, campaign, business, influencer } = params;
  const businessId = business._id;
  const influencerId = influencer._id;
  const campaignId = campaign._id;

  const convo = await findOrCreateCampaignConversation({
    businessId,
    influencerId,
    campaignId,
    outreachId: outreach._id,
  });

  const existingOutreach = await Message.findOne({
    campaign: campaignId,
    messageType: "outreach",
    outreach: outreach._id,
  });

  if (!existingOutreach) {
    await Message.create({
      sender: businessId,
      receiver: influencerId,
      campaign: campaignId,
      outreach: outreach._id,
      content: outreach.message,
      messageType: "outreach",
    });

    const welcome = await generateAssistantWelcome(campaign, business.name);
    await Message.create({
      receiver: influencerId,
      campaign: campaignId,
      outreach: outreach._id,
      content: welcome,
      messageType: "assistant_reply",
    });

    const influencerKey = influencerId.toString();
    const prev = convo.unreadCount.get(influencerKey) ?? 0;
    convo.unreadCount.set(influencerKey, prev + 2);
    convo.lastMessage = welcome.slice(0, 120);
    convo.lastMessageAt = new Date();
    scheduleInterestCheck(convo);
    await convo.save();
  }

  return convo;
}
