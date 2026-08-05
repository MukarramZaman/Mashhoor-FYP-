import mongoose, { Document, Schema } from "mongoose";

export type EmailInviteStatus = "sent" | "opened" | "registered";

export interface IEmailInvite extends Document {
  campaign: mongoose.Types.ObjectId;
  business: mongoose.Types.ObjectId;
  influencer?: mongoose.Types.ObjectId;
  influencerName: string;
  email: string;
  message: string;
  inviteToken: string;
  status: EmailInviteStatus;
  outreach?: mongoose.Types.ObjectId;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailInviteSchema = new Schema<IEmailInvite>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    influencer: { type: Schema.Types.ObjectId, ref: "User" },
    influencerName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    message: { type: String, maxlength: 2000, default: "" },
    inviteToken: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["sent", "opened", "registered"],
      default: "sent",
    },
    outreach: { type: Schema.Types.ObjectId, ref: "Outreach" },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EmailInviteSchema.index({ campaign: 1, email: 1 });
EmailInviteSchema.index({ business: 1, createdAt: -1 });

export const EmailInvite = mongoose.model<IEmailInvite>("EmailInvite", EmailInviteSchema);
