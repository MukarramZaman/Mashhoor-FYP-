import mongoose, { Document, Schema } from "mongoose";

export type MessageType =
  | "direct"
  | "outreach"
  | "assistant_query"
  | "assistant_reply"
  | "interest_prompt"
  | "interest_handoff";

export interface IMessage extends Document {
  sender?: mongoose.Types.ObjectId;
  receiver?: mongoose.Types.ObjectId;
  campaign?: mongoose.Types.ObjectId;
  outreach?: mongoose.Types.ObjectId;
  content: string;
  messageType: MessageType;
  assistantTrace?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  campaign?: mongoose.Types.ObjectId;
  outreach?: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: Map<string, number>;
  /** Increments when influencer asks another campaign question after an interest prompt. */
  interestCycle?: number;
  interestPromptSentInCycle?: boolean;
  interestCheckAt?: Date;
  lastCampaignChatAt?: Date;
  businessNotifiedInterested?: boolean;
  /** After interest handoff — only direct messages between brand and influencer. */
  directChatActive?: boolean;
  archived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    receiver: { type: Schema.Types.ObjectId, ref: "User" },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    outreach: { type: Schema.Types.ObjectId, ref: "Outreach" },
    content: { type: String, required: true, maxlength: 4000 },
    messageType: {
      type: String,
      enum: [
        "direct",
        "outreach",
        "assistant_query",
        "assistant_reply",
        "interest_prompt",
        "interest_handoff",
      ],
      default: "direct",
    },
    assistantTrace: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ campaign: 1, createdAt: -1 });

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    outreach: { type: Schema.Types.ObjectId, ref: "Outreach" },
    lastMessage: String,
    lastMessageAt: Date,
    unreadCount: { type: Map, of: Number, default: {} },
    interestCycle: { type: Number, default: 0 },
    interestPromptSentInCycle: { type: Boolean, default: false },
    interestCheckAt: Date,
    lastCampaignChatAt: Date,
    businessNotifiedInterested: { type: Boolean, default: false },
    directChatActive: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, campaign: 1 });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
