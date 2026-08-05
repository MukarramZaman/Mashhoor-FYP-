import mongoose from "mongoose";
import { Conversation, Message } from "../models/Message";

/** Real-time brand ↔ influencer chat is active; the Mashhoor assistant must not reply. */
export async function isDirectChatActive(
  convo: InstanceType<typeof Conversation>
): Promise<boolean> {
  if (convo.directChatActive) return true;
  if (convo.businessNotifiedInterested) return true;
  if (!convo.campaign) return false;

  const handoff = await Message.exists({
    campaign: convo.campaign,
    messageType: "interest_handoff",
  });
  return !!handoff;
}

export function enableDirectChatOnConversation(
  convo: InstanceType<typeof Conversation>
): void {
  convo.directChatActive = true;
  convo.interestPromptSentInCycle = false;
  convo.interestCheckAt = undefined;
}

export async function enableDirectChatForCampaignParticipants(params: {
  businessId: mongoose.Types.ObjectId | string;
  influencerId: mongoose.Types.ObjectId | string;
  campaignId: mongoose.Types.ObjectId | string;
}): Promise<void> {
  const businessOid = new mongoose.Types.ObjectId(params.businessId);
  const influencerOid = new mongoose.Types.ObjectId(params.influencerId);
  const campaignOid = new mongoose.Types.ObjectId(params.campaignId);

  const convo = await Conversation.findOne({
    participants: { $all: [businessOid, influencerOid] },
    campaign: campaignOid,
  });

  if (!convo) return;

  enableDirectChatOnConversation(convo);
  await convo.save();
}
