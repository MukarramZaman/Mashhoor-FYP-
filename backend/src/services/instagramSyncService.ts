import { IInfluencerProfile } from "../models/InfluencerProfile";
import { ApifyClient } from "apify-client";
import { User } from "../models/User";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;
const client = new ApifyClient({ token: APIFY_API_TOKEN });

async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return "https://via.placeholder.com/150";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (e) {
    return "https://via.placeholder.com/150";
  }
}

export async function syncInstagramForProfile(
  profile: IInfluencerProfile,
  userEmail?: string
): Promise<boolean> {
  const handle = profile.platforms?.instagram?.handle?.trim();
  if (!handle) return false;

  try {
    console.log(`🚀 Fetching realtime Instagram data for @${handle} via Apify...`);

    const input = {
      "usernames": [handle],
      "resultsLimit": 12,
      "includeAboutSection": false
    };

    const run = await client.actor("dSCLg0C3YEZ83HzYX").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (items.length === 0) {
      console.log(`No Instagram data returned for @${handle}`);
      return false;
    }

    const igData: any = items[0];

    if (!profile.platforms) {
      profile.platforms = {};
    }
    if (!profile.platforms.instagram) {
      profile.platforms.instagram = {
        handle: handle,
        followers: 0,
        engagementRate: 0,
        avgLikes: 0,
        avgComments: 0,
      };
    }

    const followers = igData.followersCount || 0;
    profile.platforms.instagram.followers = followers;
    profile.platforms.instagram.postCount = igData.postsCount || 0;

    const bio = igData.biography ? igData.biography.substring(0, 500) : "";
    if (!profile.bio || profile.bio.length < 10) {
      profile.bio = bio;
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
        profile.platforms.instagram.daysSinceLastPost = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      }
    }

    profile.platforms.instagram.avgLikes = latestPosts.length > 0 ? Math.floor(totalLikes / latestPosts.length) : 0;
    profile.platforms.instagram.avgComments = latestPosts.length > 0 ? Math.floor(totalComments / latestPosts.length) : 0;
    profile.platforms.instagram.engagementRate = Number(Math.min(100, finalEngagementRate).toFixed(2));

    profile.totalFollowers = profile.platforms.instagram.followers;
    profile.avgEngagementRate = profile.platforms.instagram.engagementRate || profile.avgEngagementRate;

    // Fix Profile picture broken CDN URLs forever by converting to base64
    const rawAvatarUrl = igData.profilePicUrlHd || igData.profilePicUrl;
    if (rawAvatarUrl && profile.user) {
      const safeBase64Avatar = await imageToBase64(rawAvatarUrl);
      const userId = (profile.user as any)._id || profile.user;

      // Update in DB silently
      await User.updateOne({ _id: userId }, { $set: { avatar: safeBase64Avatar } });

      // Also update the in-memory object so UI responds immediately
      if ((profile.user as any).avatar !== undefined) {
        (profile.user as any).avatar = safeBase64Avatar;
      }
    }

    console.log(`✅ Realtime Instagram data for @${handle} fetched successfully!`);
    return true;
  } catch (err) {
    console.error("Failed to sync Instagram profile via Apify:", err);
    return false;
  }
}
