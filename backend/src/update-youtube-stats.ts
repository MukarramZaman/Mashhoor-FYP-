import mongoose from "mongoose";
import dotenv from "dotenv";
import { InfluencerProfile } from "./models/InfluencerProfile";

dotenv.config();

import { getYouTubeApiKey } from "./config/youtube";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function updateYouTubeStats() {
  const API_KEY = getYouTubeApiKey();
  if (!API_KEY) {
    console.error("❌ YOUTUBE_API_KEY is required in .env");
    process.exit(1);
  }
  if (!MONGO_URI) {
    console.error("❌ MONGODB_URI is required in .env");
    process.exit(1);
  }

  console.log("=== Synchronizing All Influencers with Live YouTube Data API ===");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const profiles = await InfluencerProfile.find({});
    console.log(`📋 Found ${profiles.length} influencer profiles to synchronize.`);

    let count = 0;
    for (const profile of profiles) {
      if (profile.platforms && profile.platforms.youtube && profile.platforms.youtube.handle) {
        let handle = profile.platforms.youtube.handle;
        if (handle.includes('youtube.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '');

        try {
          console.log(`🔍 Searching live YouTube API for handle: "${handle}"...`);
          const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(handle)}&key=${API_KEY}`;
          const searchRes = await fetch(searchURL);
          const searchData = await searchRes.json() as any;

          if (searchData.items && searchData.items.length > 0) {
            const channelId = searchData.items[0].snippet.channelId;
            const statsURL = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${API_KEY}`;
            const statsRes = await fetch(statsURL);
            const statsData = await statsRes.json() as any;
            const channelData = statsData.items?.[0];

            if (channelData) {
              const subs = parseInt(channelData.statistics.subscriberCount || "0", 10);
              const views = parseInt(channelData.statistics.viewCount || "0", 10);
              const videoCount = parseInt(channelData.statistics.videoCount || "0", 10);
              const description = channelData.snippet.description;

              const avgViews = Math.floor(views / (videoCount || 1)) || 0;
              const engagementRate = Math.min(100, Number(((avgViews / (subs || 1)) * 100).toFixed(2)));

              profile.platforms.youtube.subscribers = subs;
              profile.platforms.youtube.avgViews = avgViews;
              profile.platforms.youtube.engagementRate = engagementRate;
              profile.totalFollowers = subs;
              profile.avgEngagementRate = engagementRate;
              if (!profile.bio || profile.bio.includes("Fashion enthusiast")) {
                profile.bio = description || profile.bio;
              }

              await profile.save();
              console.log(`  ✓ Updated "${handle}": Subscribers=${subs.toLocaleString()}, AvgViews=${avgViews.toLocaleString()}, EngagementRate=${engagementRate}%`);
              count++;
            }
          } else {
            console.log(`  ⚠️ No live YouTube channel found for handle: "${handle}"`);
          }
        } catch (err) {
          console.error(`  ❌ Error fetching YouTube data for "${handle}":`, err);
        }
      }
    }

    console.log(`\n✅ Successfully synchronized ${count} influencer profiles with live YouTube API data!`);

  } catch (error) {
    console.error("❌ Failed to synchronize YouTube stats:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

updateYouTubeStats();
