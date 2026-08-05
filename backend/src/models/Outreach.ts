import mongoose, { Document, Schema } from "mongoose";
import { OutreachStatus, SentimentLabel } from "../types";

export interface IOutreach extends Document {
  campaign: mongoose.Types.ObjectId;
  business: mongoose.Types.ObjectId;
  influencer: mongoose.Types.ObjectId;
  message: string;                        // AI-generated or manual outreach message
  isAiGenerated: boolean;
  status: OutreachStatus;
  influencerReply?: string;
  sentiment?: {
    label: SentimentLabel;
    score: number;                        // confidence 0-1
    analyzedAt: Date;
  };
  openedAt?: Date;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutreachSchema = new Schema<IOutreach>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    influencer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, maxlength: 2000 },
    isAiGenerated: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "sent", "opened", "replied", "accepted", "rejected"],
      default: "pending",
    },
    influencerReply: { type: String, maxlength: 2000 },
    sentiment: {
      label: { type: String, enum: ["positive", "neutral", "negative"] },
      score: { type: Number, min: 0, max: 1 },
      analyzedAt: Date,
    },
    openedAt: Date,
    repliedAt: Date,
  },
  { timestamps: true }
);

OutreachSchema.index({ campaign: 1, influencer: 1 }, { unique: true });
OutreachSchema.index({ business: 1, status: 1 });

export const Outreach = mongoose.model<IOutreach>("Outreach", OutreachSchema);
