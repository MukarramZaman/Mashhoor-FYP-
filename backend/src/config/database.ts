import mongoose from "mongoose";
import { InfluencerProfile } from "../models/InfluencerProfile";

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI) as string);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Enforce exactly one category/niche per influencer (no multiple categories allowed)
    try {
      const profiles = await InfluencerProfile.find({ "niche.1": { $exists: true } });
      if (profiles.length > 0) {
        console.log(`🧹 Database Migration: Found ${profiles.length} profiles with multiple categories. Cleaning up...`);
        for (const p of profiles) {
          if (p.niche && p.niche.length > 1) {
            p.niche = [p.niche[0]];
            await p.save();
          }
        }
        console.log("✅ Database Migration: Enforced exactly one category per influencer successfully.");
      }
    } catch (migErr) {
      console.warn("⚠️ Failed to run database niches migration:", migErr);
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});

export default connectDB;
