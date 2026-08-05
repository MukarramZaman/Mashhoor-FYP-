import { Response, NextFunction } from "express";
import { Message, Conversation } from "../models/Message";
import { Campaign } from "../models/Campaign";
import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import mongoose from "mongoose";
import { runCampaignAssistantPipeline } from "../services/campaignAssistantService";
import {
  handleInfluencerMessageForInterest,
  processDueInterestChecks,
  scheduleInterestCheck,
  sendInterestPromptIfDue,
} from "../services/campaignInterestService";
import {
  isCampaignFollowUpQuestion,
  isInterestedReply,
} from "../utils/sentimentAnalysis";
import { isDirectChatActive } from "../services/directChatService";

const formatMessage = (msg: InstanceType<typeof Message>) => {
  const m = msg.toObject();
  const isAssistant =
    msg.messageType === "assistant_reply" ||
    msg.messageType === "assistant_query" ||
    msg.messageType === "interest_prompt" ||
    msg.messageType === "interest_handoff";
  return {
    ...m,
    isAssistant,
    displayName:
      msg.messageType === "assistant_reply" ||
      msg.messageType === "interest_prompt" ||
      msg.messageType === "interest_handoff"
        ? "Mashhoor Assistant"
        : msg.messageType === "outreach"
          ? "Campaign invitation"
          : undefined,
  };
};

// GET /api/messages/conversations
export const getConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.userId);

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "name email avatar role")
      .populate("campaign", "title status")
      .sort({ lastMessageAt: -1 });

    res.status(200).json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
};

// GET /api/messages/:conversationId
export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) return next(new AppError("Conversation not found", 404));

    const isParticipant = convo.participants.some(
      (p) => p.toString() === req.user?.userId
    );
    if (!isParticipant) return next(new AppError("Not authorized", 403));

    if (convo.campaign && !(await isDirectChatActive(convo))) {
      await sendInterestPromptIfDue(convo);
      await processDueInterestChecks();
    }

    const filter: Record<string, unknown> = convo.campaign
      ? { campaign: convo.campaign }
      : {
          $or: [
            {
              sender: convo.participants[0],
              receiver: convo.participants[1],
            },
            {
              sender: convo.participants[1],
              receiver: convo.participants[0],
            },
          ],
        };

    const messages = await Message.find(filter)
      .populate("sender", "name avatar role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    await Message.updateMany(
      {
        receiver: req.user?.userId,
        isRead: false,
        campaign: convo.campaign,
      },
      { isRead: true, readAt: new Date() }
    );

    convo.unreadCount.set(req.user!.userId, 0);
    await convo.save();

    res.status(200).json({
      success: true,
      data: messages.reverse().map(formatMessage),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/messages/send — direct human-to-human message
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { receiverId, content, campaignId } = req.body;
    if (!receiverId || !content) {
      return next(new AppError("receiverId and content are required", 400));
    }

    const senderId = new mongoose.Types.ObjectId(req.user?.userId);
    const receiverObjId = new mongoose.Types.ObjectId(receiverId);

    let convo = await Conversation.findOne({
      participants: { $all: [senderId, receiverObjId] },
      ...(campaignId ? { campaign: campaignId } : {}),
    });

    if (!convo) {
      convo = await Conversation.create({
        participants: [senderId, receiverObjId],
        ...(campaignId ? { campaign: campaignId } : {}),
        unreadCount: new Map(),
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverObjId,
      content,
      messageType: "direct",
      ...(campaignId ? { campaign: campaignId } : {}),
    });

    convo.lastMessage = content;
    convo.lastMessageAt = new Date();
    const receiverUnread = convo.unreadCount.get(receiverId) ?? 0;
    convo.unreadCount.set(receiverId, receiverUnread + 1);
    await convo.save();

    const populated = await message.populate("sender", "name avatar");

    res.status(201).json({ success: true, data: formatMessage(populated) });
  } catch (err) {
    next(err);
  }
};

// POST /api/messages/:conversationId/ask-assistant — influencer asks campaign chatbot
export const askCampaignAssistant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return next(new AppError("Message content is required", 400));
    }

    const userId = req.user?.userId;
    if (req.user?.role !== "influencer") {
      return next(new AppError("Only influencers can chat with the campaign assistant", 403));
    }

    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) return next(new AppError("Conversation not found", 404));

    const isParticipant = convo.participants.some((p) => p.toString() === userId);
    if (!isParticipant) return next(new AppError("Not authorized", 403));

    if (!convo.campaign) {
      return next(new AppError("No campaign linked to this conversation", 400));
    }

    if (await isDirectChatActive(convo)) {
      return next(
        new AppError(
          "The Mashhoor assistant has stepped back. Message the brand directly in this chat.",
          403
        )
      );
    }

    const campaign = await Campaign.findById(convo.campaign);
    if (!campaign) return next(new AppError("Campaign not found", 404));

    const businessId = convo.participants.find((p) => p.toString() !== userId);
    const business = businessId ? await User.findById(businessId) : null;

    const trimmed = content.trim();
    const answeringInterestPrompt =
      convo.interestPromptSentInCycle &&
      isInterestedReply(trimmed) &&
      !isCampaignFollowUpQuestion(trimmed);

    const userMsg = await Message.create({
      sender: new mongoose.Types.ObjectId(userId),
      receiver: businessId,
      campaign: campaign._id,
      outreach: convo.outreach,
      content: trimmed,
      messageType: "assistant_query",
    });

    if (answeringInterestPrompt) {
      await handleInfluencerMessageForInterest({
        conversationId: convo._id,
        influencerId: userId!,
        content: trimmed,
      });

      const handoffMsg = await Message.findOne({
        campaign: campaign._id,
        messageType: "interest_handoff",
        receiver: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .limit(1);

      const populatedUser = await userMsg.populate("sender", "name avatar role");

      res.status(201).json({
        success: true,
        data: {
          userMessage: formatMessage(populatedUser),
          assistantMessage: handoffMsg
            ? formatMessage(handoffMsg)
            : formatMessage(
                await Message.create({
                  receiver: new mongoose.Types.ObjectId(userId),
                  campaign: campaign._id,
                  outreach: convo.outreach,
                  content:
                    "You're all set — you can now chat directly with the brand in this thread.",
                  messageType: "interest_handoff",
                })
              ),
        },
      });
      return;
    }

    const priorMessages = await Message.find({
      campaign: campaign._id,
      messageType: { $in: ["assistant_query", "assistant_reply"] },
    })
      .sort({ createdAt: 1 })
      .limit(12);

    const chatHistory: { user: string; bot: string }[] = [];
    for (let i = 0; i < priorMessages.length; i++) {
      const m = priorMessages[i];
      if (m.messageType === "assistant_query") {
        const next = priorMessages[i + 1];
        if (next?.messageType === "assistant_reply") {
          chatHistory.push({ user: m.content, bot: next.content });
        }
      }
    }

    const { reply, trace } = await runCampaignAssistantPipeline({
      userMessage: trimmed,
      chatHistory,
      campaign,
      businessName: business?.name,
    });

    const botMsg = await Message.create({
      receiver: new mongoose.Types.ObjectId(userId),
      campaign: campaign._id,
      outreach: convo.outreach,
      content: reply,
      messageType: "assistant_reply",
      assistantTrace: trace,
    });

    convo.lastMessage = reply.slice(0, 160);
    convo.lastMessageAt = new Date();
    if (reply.includes("Are you interested?")) {
      convo.interestPromptSentInCycle = true;
      convo.interestCheckAt = undefined;
    } else {
      scheduleInterestCheck(convo);
    }
    await convo.save();

    await handleInfluencerMessageForInterest({
      conversationId: convo._id,
      influencerId: userId!,
      content: trimmed,
    });

    const populatedUser = await userMsg.populate("sender", "name avatar role");

    res.status(201).json({
      success: true,
      data: {
        userMessage: formatMessage(populatedUser),
        assistantMessage: formatMessage(botMsg),
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/messages/:conversationId
export const deleteConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) return next(new AppError("Conversation not found", 404));

    const isParticipant = convo.participants.some(
      (p) => p.toString() === req.user?.userId
    );
    if (!isParticipant) return next(new AppError("Not authorized", 403));

    const filter: Record<string, unknown> = convo.campaign
      ? { campaign: convo.campaign }
      : {
          $or: [
            { sender: convo.participants[0], receiver: convo.participants[1] },
            { sender: convo.participants[1], receiver: convo.participants[0] },
          ],
        };

    await Message.deleteMany(filter);
    await convo.deleteOne();

    res.status(200).json({ success: true, message: "Chat deleted" });
  } catch (err) {
    next(err);
  }
};
