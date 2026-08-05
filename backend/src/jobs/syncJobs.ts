import cron from "node-cron";
import { ApifyClient } from "apify-client";
import { InfluencerProfile } from "../models/InfluencerProfile";
import { User } from "../models/User";
import { getYouTubeApiKey } from "../config/youtube";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;
const client = new ApifyClient({ token: APIFY_API_TOKEN });

// Utility to safely convert avatar to Base64 (preventing 403 errors when loading images)
async function imageToBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (e) {
        return null;
    }
}

/**
 * Runs a bulk update for all Instagram influencers currently in the database.
 * We extract all their handles, pass them to the Apify Actor in one go, 
 * and then update their profiles with the latest live data.
 */
async function syncAllInstagramData() {
    console.log(`\n[CRON] 🚀 Starting 24-hour Background Instagram Data Sync...`);

    try {
        // Find all profiles that have an Instagram handle
        const profiles = await InfluencerProfile.find({ "platforms.instagram.handle": { $exists: true, $ne: "" } });

        if (profiles.length === 0) {
            console.log("[CRON] No Instagram profiles found in DB. Skipping sync.");
            return;
        }

        const usernames = profiles.map(p => p.platforms?.instagram?.handle);
        console.log(`[CRON] Found ${usernames.length} Instagram profiles to sync. Sending batch to Apify...`);

        const input = {
            "usernames": usernames,
            "resultsLimit": 12,
            "includeAboutSection": false
        };

        const run = await client.actor("dSCLg0C3YEZ83HzYX").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`[CRON] Received live data for ${items.length} profiles from Apify.`);

        for (const item of items) {
            const igData: any = item;
            const handle = igData.username?.toLowerCase();
            if (!handle) continue;

            const profileToUpdate = profiles.find(
                p => p.platforms?.instagram?.handle?.toLowerCase() === handle
            );

            if (!profileToUpdate || !profileToUpdate.platforms?.instagram) continue;

            const followers = igData.followersCount || 0;
            profileToUpdate.platforms.instagram.followers = followers;
            profileToUpdate.platforms.instagram.postCount = igData.postsCount || 0;

            const bio = igData.biography ? igData.biography.substring(0, 500) : "";
            if (!profileToUpdate.bio || profileToUpdate.bio.length < 10) {
                profileToUpdate.bio = bio;
            }

            const latestPosts = igData.latestPosts || [];
            let totalLikes = 0;
            let totalComments = 0;
            let totalViews = 0;
            let finalEngagementRate = 0;

            if (latestPosts.length > 0) {
                latestPosts.forEach((post: any) => {
                    totalLikes += (post.likesCount || 0);
                    totalComments += (post.commentsCount || 0);
                    totalViews += (post.videoViewCount || post.playCount || 0);
                });

                const avgLikesPerPost = totalLikes / latestPosts.length;
                const avgCommentsPerPost = totalComments / latestPosts.length;
                const avgViewsPerPost = totalViews / latestPosts.length;

                const estimatedReach = Math.max(avgViewsPerPost, (avgLikesPerPost + avgCommentsPerPost) * 2);

                if (followers > 0) {
                    finalEngagementRate = (estimatedReach / followers) * 100;
                }

                const lastPostTimestamp = latestPosts[0]?.timestamp;
                if (lastPostTimestamp) {
                    const diff = Date.now() - new Date(lastPostTimestamp).getTime();
                    profileToUpdate.platforms.instagram.daysSinceLastPost = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                }
            }

            profileToUpdate.platforms.instagram.avgLikes = latestPosts.length > 0 ? Math.floor(totalLikes / latestPosts.length) : 0;
            profileToUpdate.platforms.instagram.avgComments = latestPosts.length > 0 ? Math.floor(totalComments / latestPosts.length) : 0;
            profileToUpdate.platforms.instagram.engagementRate = Number(Math.min(100, finalEngagementRate).toFixed(2));

            profileToUpdate.totalFollowers = profileToUpdate.platforms.instagram.followers;
            profileToUpdate.avgEngagementRate = profileToUpdate.platforms.instagram.engagementRate;

            await profileToUpdate.save();

            // Optionally sync avatar if missing or empty
            const rawAvatarUrl = igData.profilePicUrlHd || igData.profilePicUrl;
            if (rawAvatarUrl) {
                const safeBase64Avatar = await imageToBase64(rawAvatarUrl);
                if (safeBase64Avatar) {
                    await User.updateOne(
                        { _id: profileToUpdate.user },
                        { $set: { avatar: safeBase64Avatar } }
                    );
                }
            }
        }

        console.log("[CRON] ✅ 24-hour Background Instagram Data Sync completed successfully!");

    } catch (error) {
        console.error("[CRON] ❌ Scheduled Instagram Sync failed:", error);
    }
}

/**
 * Runs a bulk update for all YouTube influencers currently in the database.
 * Fetches their latest statistics from the official YouTube API and updates the DB.
 */
async function syncAllYouTubeData() {
    console.log(`\n[CRON] 🚀 Starting 24-hour Background YouTube Data Sync...`);

    const apiKey = getYouTubeApiKey();
    if (!apiKey) {
        console.warn("[CRON] YOUTUBE_API_KEY not configured. Skipping YouTube sync.");
        return;
    }

    try {
        const profiles = await InfluencerProfile.find({ "platforms.youtube.handle": { $exists: true, $ne: "" } });

        if (profiles.length === 0) {
            console.log("[CRON] No YouTube profiles found in DB. Skipping sync.");
            return;
        }

        console.log(`[CRON] Found ${profiles.length} YouTube profiles to sync.`);
        let count = 0;

        for (const profile of profiles) {
            if (!profile.platforms?.youtube?.handle) continue;

            let handle = profile.platforms.youtube.handle;
            if (handle.includes("youtube.com/")) {
                handle = handle.split("/").pop() || handle;
            }
            handle = handle.replace("@", "");

            try {
                const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(handle)}&key=${apiKey}`;
                const searchRes = await fetch(searchURL);
                const searchData = await searchRes.json() as any;

                if (searchData.items && searchData.items.length > 0) {
                    const channelId = searchData.items[0].snippet.channelId;
                    const statsURL = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
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

                        if (!profile.bio || profile.bio.length < 10) {
                            profile.bio = description || profile.bio;
                        }

                        await profile.save();
                        count++;
                    }
                }
            } catch (err) {
                console.error(`[CRON] ❌ Error syncing YouTube channel "${handle}":`, err);
            }
        }

        console.log(`[CRON] ✅ 24-hour Background YouTube Data Sync completed! Updated ${count} profiles.`);
    } catch (error) {
        console.error("[CRON] ❌ Scheduled YouTube Sync failed:", error);
    }
}

export function setupCronJobs() {
    // Run exactly at Midnight (00:00) every single day
    cron.schedule("0 0 * * *", async () => {
        try {
            await syncAllInstagramData();
        } catch (err) {
            console.error("[CRON] Instagram Sync job error:", err);
        }

        try {
            await syncAllYouTubeData();
        } catch (err) {
            console.error("[CRON] YouTube Sync job error:", err);
        }
    });

    console.log("⏰ Cron jobs initialized. Background data sync scheduled for midnight daily.");
}
