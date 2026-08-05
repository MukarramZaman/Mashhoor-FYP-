import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "influencer_interested"
  | "outreach_reply"
  | "outreach_accepted"
  | "campaign_invite"
  | "campaign";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  campaign?: mongoose.Types.ObjectId;
  influencer?: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  outreach?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "influencer_interested",
        "outreach_reply",
        "outreach_accepted",
        "campaign_invite",
        "campaign",
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    influencer: { type: Schema.Types.ObjectId, ref: "User" },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation" },
    outreach: { type: Schema.Types.ObjectId, ref: "Outreach" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
