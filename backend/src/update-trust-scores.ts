import mongoose from "mongoose";
import dotenv from "dotenv";
import { InfluencerProfile } from "./models/InfluencerProfile";
import { calculateTrustScore } from "./services/trustScoreService";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Asaad:bulbul._.00@cluster0.c662lpl.mongodb.net/?appName=Cluster0";

async function updateTrustScores() {
  console.log("=== Repopulating Trust Scores with Upgraded AI Algorithm ===");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const profiles = await InfluencerProfile.find({});
    console.log(`📋 Found ${profiles.length} influencer profiles to update.`);

    let count = 0;
    for (const profile of profiles) {
      const { score, breakdown } = await calculateTrustScore(profile);
      profile.trustScore = score;
      profile.trustScoreBreakdown = breakdown;
      await profile.save();
      count++;
    }

    console.log(`✅ Successfully updated ${count} influencer profiles with new Trust Scores!`);

    // Print a quick sample of the new distribution
    const sample = await InfluencerProfile.find({}).limit(10).select("user trustScore totalFollowers avgEngagementRate").populate("user", "name");
    console.log("\n📊 Sample Distribution:");
    sample.forEach((p: any) => {
      console.log(`  - ${p.user?.name}: ${p.trustScore}/100 (Followers: ${p.totalFollowers}, Eng Rate: ${p.avgEngagementRate}%)`);
    });

  } catch (error) {
    console.error("❌ Failed to update trust scores:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

updateTrustScores();
