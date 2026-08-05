import mongoose, { Document, Schema } from "mongoose";
import { CampaignStatus } from "../types";

export interface ICampaign extends Document {
  _id: mongoose.Types.ObjectId;
  business: mongoose.Types.ObjectId;           // ref: User
  title: string;
  description: string;
  niche: string[];
  targetLocations: string[];
  budget: {
    total: number;
    spent: number;
    currency: string;
  };
  requirements: {
    minFollowers: number;
    minTrustScore: number;
    platforms: string[];
    contentType: string[];                      // "reel", "post", "story", "video"
  };
  timeline: {
    startDate: Date;
    endDate: Date;
  };
  status: CampaignStatus;
  selectedInfluencers: mongoose.Types.ObjectId[];   // ref: User
  goals: string;
  progress: number;                             // 0-100
  reviews?: {
    influencer: mongoose.Types.ObjectId;
    rating: number;                             // 1 to 5
    comment: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Campaign title is required"],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 2000,
    },
    niche: { type: [String], required: true },
    targetLocations: [String],
    budget: {
      total: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0 },
      currency: { type: String, default: "PKR" },
    },
    requirements: {
      minFollowers: { type: Number, default: 0 },
      minTrustScore: { type: Number, default: 0, min: 0, max: 100 },
      platforms: [String],
      contentType: [String],
    },
    timeline: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "cancelled"],
      default: "draft",
    },
    selectedInfluencers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    goals: { type: String, maxlength: 500 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    reviews: [
      {
        influencer: { type: Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

CampaignSchema.index({ business: 1, status: 1 });
CampaignSchema.index({ niche: 1, status: 1 });

export const Campaign = mongoose.model<ICampaign>("Campaign", CampaignSchema);
