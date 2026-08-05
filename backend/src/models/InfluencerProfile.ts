import mongoose, { Document, Schema } from "mongoose";

export interface IInfluencerProfile extends Document {
  user: mongoose.Types.ObjectId;
  niche: string[];
  location: string;
  country: string;
  bio: string;
  platforms: {
    instagram?: {
      handle: string;
      followers: number;
      engagementRate: number;
      avgLikes: number;
      avgComments: number;
      daysSinceLastPost?: number;
      postCount?: number;
    };
    youtube?: {
      handle: string;
      subscribers: number;
      avgViews: number;
      engagementRate: number;
      daysSinceLastUpload?: number;
      videoCount?: number;
    };
    tiktok?: {
      handle: string;
      followers: number;
      engagementRate: number;
    };
  };
  // AI-computed Trust Score (0-100)
  trustScore: number;
  trustScoreBreakdown: {
    engagementAuthenticity: number; // fake engagement detection
    followerQuality: number;        // real vs bot followers
    contentConsistency: number;     // posting frequency & quality
    collaborationHistory: number;   // past campaign performance
  };
  isVerified: boolean;
  tags: string[];
  totalFollowers: number;           // computed sum across platforms
  avgEngagementRate: number;        // computed average
  systemCategory?: string;          // AI-clustered category
  createdAt: Date;
  updatedAt: Date;
}

const InfluencerProfileSchema = new Schema<IInfluencerProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    niche: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one niche is required",
      },
    },
    location: { type: String, trim: true },
    country: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    platforms: {
      instagram: {
        handle: String,
        followers: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
        avgLikes: { type: Number, default: 0 },
        avgComments: { type: Number, default: 0 },
        daysSinceLastPost: { type: Number, default: undefined },
        postCount: { type: Number, default: undefined },
      },
      youtube: {
        handle: String,
        subscribers: { type: Number, default: 0 },
        avgViews: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
        daysSinceLastUpload: { type: Number, default: 0 },
        videoCount: { type: Number, default: 0 },
      },
      tiktok: {
        handle: String,
        followers: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
      },
    },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    trustScoreBreakdown: {
      engagementAuthenticity: { type: Number, default: 0 },
      followerQuality: { type: Number, default: 0 },
      contentConsistency: { type: Number, default: 0 },
      collaborationHistory: { type: Number, default: 0 },
    },
    isVerified: { type: Boolean, default: false },
    tags: [String],
    totalFollowers: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    systemCategory: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index for discovery queries
InfluencerProfileSchema.index({ niche: 1, country: 1, trustScore: -1 });
InfluencerProfileSchema.index({ totalFollowers: -1 });
InfluencerProfileSchema.index({ avgEngagementRate: -1 });

// Auto-compute totalFollowers and avgEngagementRate before save
InfluencerProfileSchema.pre("save", function (next) {
  const p = this.platforms;
  const igFollowers = p.instagram?.followers ?? 0;
  const ttFollowers = p.tiktok?.followers ?? 0;
  const ytSubs = p.youtube?.subscribers ?? 0;
  this.totalFollowers = igFollowers + ttFollowers + ytSubs;

  const rates: number[] = [];
  if (p.instagram?.engagementRate) rates.push(p.instagram.engagementRate);
  if (p.tiktok?.engagementRate) rates.push(p.tiktok.engagementRate);
  if (p.youtube?.engagementRate) rates.push(p.youtube.engagementRate);
  this.avgEngagementRate =
    rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

  next();
});

export const InfluencerProfile = mongoose.model<IInfluencerProfile>(
  "InfluencerProfile",
  InfluencerProfileSchema
);
