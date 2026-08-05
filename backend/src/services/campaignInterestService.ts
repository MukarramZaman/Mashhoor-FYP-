import mongoose from "mongoose";
import { Conversation, Message } from "../models/Message";
import { Outreach } from "../models/Outreach";
import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { Campaign } from "../models/Campaign";
import {
  analyzeSentiment,
  isCampaignFollowUpQuestion,
  isInterestedReply,
} from "../utils/sentimentAnalysis";
import {
  enableDirectChatOnConversation,
  isDirectChatActive,
} from "./directChatService";

export const INTEREST_IDLE_MS = 2 * 60 * 1000;
export const INTEREST_PROMPT_TEXT = "Are you interested in the campaign?";

export function buildInterestHandoffMessage(businessName: string, campaignTitle: string): string {
  return (
    `Great — you're interested! From now on you have a real-time chat with ${businessName}, ` +
    `who wanted to hire you for "${campaignTitle}". ` +
    `Use this thread anytime to talk directly, agree on details, and move the collaboration forward. ` +
    `The Mashhoor assistant will step back so you and the brand can close the deal together.`
  );
}

export function scheduleInterestCheck(
  convo: InstanceType<typeof Conversation>
): void {
  convo.lastCampaignChatAt = new Date();
  convo.interestCheckAt = new Date(Date.now() + INTEREST_IDLE_MS);
}

export function restartInterestCycle(
  convo: InstanceType<typeof Conversation>
): void {
  convo.interestCycle = (convo.interestCycle ?? 0) + 1;
  convo.interestPromptSentInCycle = false;
  scheduleInterestCheck(convo);
}

export async function notifyBusinessInfluencerInterested(params: {
  businessId: mongoose.Types.ObjectId;
  influencerId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  outreachId?: mongoose.Types.ObjectId;
  influencerName: string;
  campaignTitle: string;
}): Promise<void> {
  const {
    businessId,
    influencerId,
    campaignId,
    conversationId,
    outreachId,
    influencerName,
    campaignTitle,
  } = params;

  const existing = await Notification.findOne({
    user: businessId,
    type: "influencer_interested",
    campaign: campaignId,
    influencer: influencerId,
  });

  if (existing) return;

  await Notification.create({
    user: businessId,
    type: "influencer_interested",
    title: "Influencer interested — ready to talk",
    body: `${influencerName} is interested in "${campaignTitle}" and wants a real conversation. Open Messages to discuss details and close the deal.`,
    campaign: campaignId,
    influencer: influencerId,
    conversation: conversationId,
    outreach: outreachId,
    isRead: false,
  });
}

export async function handleInfluencerMessageForInterest(params: {
  conversationId: mongoose.Types.ObjectId;
  influencerId: string;
  content: string;
}): Promise<void> {
  const convo = await Conversation.findById(params.conversationId);
  if (!convo?.campaign) return;

  if (await isDirectChatActive(convo)) return;

  const influencerId = new mongoose.Types.ObjectId(params.influencerId);
  const participantUsers = await User.find({ _id: { $in: convo.participants } }).select(
    "_id role name"
  );
  const businessUser = participantUsers.find((u) => u.role === "business");
  const influencerUser = participantUsers.find((u) => u._id.equals(influencerId));
  if (!businessUser) return;
  const businessId = businessUser._id;
  const content = params.content.trim();
  const sentiment = analyzeSentiment(content);

  if (convo.outreach) {
    const outreach = await Outreach.findById(convo.outreach);
    if (outreach) {
      outreach.sentiment = { ...sentiment, analyzedAt: new Date() };
      await outreach.save();
    }
  }

  if (convo.interestPromptSentInCycle) {
    if (isCampaignFollowUpQuestion(content)) {
      restartInterestCycle(convo);
      await convo.save();
      return;
    }

    // 1. Fetch past messages of this influencer
    const priorMsgs = await Message.find({
      campaign: convo.campaign,
      sender: influencerId,
    }).select("content");

    let sumScore = 0;
    let count = 0;
    for (const msg of priorMsgs) {
      const s = analyzeSentiment(msg.content);
      if (s.label === "positive") sumScore += s.score;
      else if (s.label === "negative") sumScore -= s.score;
      count++;
    }
    const averagePastSentiment = count > 0 ? sumScore / count : 0.0;

    // 2. Current response sentiment
    const currentSentiment = analyzeSentiment(content);
    let currentScore = 0.0;
    const isYes = isInterestedReply(content);
    const isNo = currentSentiment.label === "negative" || ["no", "nope", "not interested", "decline", "reject", "pass", "no thanks"].some(w => content.toLowerCase().includes(w));
    
    if (isYes) {
      currentScore = 1.0;
    } else if (isNo) {
      currentScore = -1.0;
    }

    // 3. Combined score (25% history, 75% current reply)
    const finalInterestScore = (0.25 * averagePastSentiment) + (0.75 * currentScore);

    if (finalInterestScore > 0.15) {
      if (convo.outreach) {
        const outreach = await Outreach.findById(convo.outreach);
        if (outreach) {
          outreach.status = "replied";
          outreach.influencerReply = content;
          outreach.repliedAt = new Date();
          await outreach.save();
        }
      }

      const campaign = await Campaign.findById(convo.campaign).select("title");
      const campaignTitle = campaign?.title || "this campaign";
      const businessName = businessUser.name || "the brand";

      if (!convo.businessNotifiedInterested) {
        await notifyBusinessInfluencerInterested({
          businessId,
          influencerId,
          campaignId: convo.campaign,
          conversationId: convo._id,
          outreachId: convo.outreach,
          influencerName: influencerUser?.name || "Influencer",
          campaignTitle,
        });
        convo.businessNotifiedInterested = true;
      }

      const handoffExists = await Message.findOne({
        campaign: convo.campaign,
        messageType: "interest_handoff",
        receiver: influencerId,
      });
      if (!handoffExists) {
        const handoffText = buildInterestHandoffMessage(businessName, campaignTitle);
        await Message.create({
          receiver: influencerId,
          campaign: convo.campaign,
          outreach: convo.outreach,
          content: handoffText,
          messageType: "interest_handoff",
        });

        const influencerKey = influencerId.toString();
        const prevUnread = convo.unreadCount.get(influencerKey) ?? 0;
        convo.unreadCount.set(influencerKey, prevUnread + 1);
        convo.lastMessage = handoffText.slice(0, 160);
        convo.lastMessageAt = new Date();
        convo.interestPromptSentInCycle = false;
        convo.interestCheckAt = undefined;
        enableDirectChatOnConversation(convo);
      }
    } else if (finalInterestScore < -0.15) {
      convo.archived = true;
      convo.interestPromptSentInCycle = false;
      convo.interestCheckAt = undefined;

      const closingMsgText = "No problem! We've archived this conversation. Let us know if you change your mind in the future.";
      await Message.create({
        receiver: influencerId,
        campaign: convo.campaign,
        outreach: convo.outreach,
        content: closingMsgText,
        messageType: "direct",
      });

      convo.lastMessage = closingMsgText.slice(0, 160);
      convo.lastMessageAt = new Date();
    }
  } else {
    scheduleInterestCheck(convo);
  }

  await convo.save();
}

export async function sendInterestPromptIfDue(
  convo: InstanceType<typeof Conversation>
): Promise<boolean> {
  if (await isDirectChatActive(convo)) return false;

  if (!convo.campaign || convo.interestPromptSentInCycle || !convo.interestCheckAt) {
    return false;
  }
  if (convo.interestCheckAt.getTime() > Date.now()) return false;

  const participantUsers = await User.find({ _id: { $in: convo.participants } }).select(
    "_id role"
  );
  const influencerUser = participantUsers.find((u) => u.role === "influencer");
  const influencerUserId = influencerUser?._id;
  if (!influencerUserId) return false;

  await Message.create({
    receiver: influencerUserId,
    campaign: convo.campaign,
    outreach: convo.outreach,
    content: INTEREST_PROMPT_TEXT,
    messageType: "interest_prompt",
  });

  const influencerKey = influencerUserId.toString();
  const prev = convo.unreadCount.get(influencerKey) ?? 0;
  convo.unreadCount.set(influencerKey, prev + 1);
  convo.interestPromptSentInCycle = true;
  convo.interestCheckAt = undefined;
  convo.lastMessage = INTEREST_PROMPT_TEXT;
  convo.lastMessageAt = new Date();
  await convo.save();
  return true;
}

export async function processDueInterestChecks(): Promise<void> {
  const now = new Date();
  const convos = await Conversation.find({
    campaign: { $exists: true, $ne: null },
    directChatActive: { $ne: true },
    interestPromptSentInCycle: false,
    interestCheckAt: { $lte: now },
  }).limit(30);

  for (const convo of convos) {
    try {
      await sendInterestPromptIfDue(convo);
    } catch (err) {
      console.error("Interest check failed for conversation", convo._id, err);
    }
  }
}
