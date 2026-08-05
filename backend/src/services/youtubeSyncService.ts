import { IInfluencerProfile } from "../models/InfluencerProfile";
import { getYouTubeApiKey } from "../config/youtube";

/** Fetch with an automatic timeout (default 8 s) to avoid hanging on network issues. */
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeHandle(raw: string): string {
  let handle = raw.trim();
  if (handle.includes("youtube.com/")) {
    handle = handle.split("/").pop() || handle;
  }
  if (handle.startsWith("@")) handle = handle.slice(1);
  return handle.replace(/^@/, "");
}

type ChannelStats = {
  subscribers: number;
  avgViews: number;
  engagementRate: number;
  videoCount: number;
  daysSinceLastUpload: number;
  title: string;
  description: string;
};

async function fetchChannelStats(handle: string, apiKey: string): Promise<ChannelStats | null> {
  // Use forHandle or forUsername which costs 1 quota instead of search which costs 100.
  const handleWithAt = handle.startsWith("@") ? handle : `@${handle}`;
  let statsURL = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,contentDetails&forHandle=${encodeURIComponent(handleWithAt)}&key=${apiKey}`;
  let statsRes = await fetchWithTimeout(statsURL);
  let statsData = (await statsRes.json()) as any;

  if (statsData.error || !statsData.items || statsData.items.length === 0) {
    // Fallback to forUsername if forHandle didn't work
    statsURL = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,contentDetails&forUsername=${encodeURIComponent(handle)}&key=${apiKey}`;
    statsRes = await fetchWithTimeout(statsURL);
    statsData = await statsRes.json();
  }

  // Search API has been completely removed because it costs 100 quota units
  // and causes immediate "Quota Exceeded" errors for the entire application.
  
  if (statsData.error || !statsData.items || statsData.items.length === 0) {
    // We do NOT use console.error here to avoid spamming the terminal for missing handles
    return null;
  }

  const channelData = statsData.items[0];
  const subs = parseInt(channelData.statistics.subscriberCount || "0", 10);
  const views = parseInt(channelData.statistics.viewCount || "0", 10);
  const videoCount = parseInt(channelData.statistics.videoCount || "0", 10);
  const avgViews = Math.floor(views / (videoCount || 1)) || 0;
  const engagementRate = Math.min(
    100,
    Number(((avgViews / (subs || 1)) * 100).toFixed(2))
  );

  let daysSinceLastUpload = 0;
  const uploadsPlaylistId = channelData.contentDetails?.relatedPlaylists?.uploads;
  if (uploadsPlaylistId) {
    try {
      const playlistRes = await fetchWithTimeout(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1&key=${apiKey}`
      );
      const playlistData = (await playlistRes.json()) as {
        items?: Array<{ snippet?: { publishedAt?: string } }>;
      };
      const publishedAt = playlistData.items?.[0]?.snippet?.publishedAt;
      if (publishedAt) {
        const diff = Date.now() - new Date(publishedAt).getTime();
        daysSinceLastUpload = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      }
    } catch {
      /* optional */
    }
  }

  return {
    subscribers: subs,
    avgViews,
    engagementRate,
    videoCount,
    daysSinceLastUpload,
    title: channelData.snippet.title,
    description: (channelData.snippet.description || "").substring(0, 490),
  };
}

/** Sync YouTube analytics from handle or @youtube.test channel id email. */
export async function syncYouTubeForProfile(
  profile: IInfluencerProfile,
  userEmail?: string
): Promise<boolean> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) return false;

  if (!profile.platforms) {
    profile.platforms = {};
  }
  if (!profile.platforms.youtube) {
    profile.platforms.youtube = {
      handle: "",
      subscribers: 0,
      avgViews: 0,
      engagementRate: 0,
    };
  }

  let stats: ChannelStats | null = null;
  const handle = profile.platforms.youtube.handle?.trim();

  if (handle) {
    stats = await fetchChannelStats(normalizeHandle(handle), apiKey);
  }

  if (!stats && userEmail?.endsWith("@youtube.test")) {
    const channelId = userEmail.split("@")[0];
    const statsURL = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,contentDetails&id=${channelId}&key=${apiKey}`;
    const statsRes = await fetchWithTimeout(statsURL);
    const statsData = (await statsRes.json()) as {
      items?: Array<{
        statistics: Record<string, string>;
        snippet: { title: string; description?: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }>;
    };
    const channelData = statsData.items?.[0];
    if (channelData) {
      const subs = parseInt(channelData.statistics.subscriberCount || "0", 10);
      const views = parseInt(channelData.statistics.viewCount || "0", 10);
      const videoCount = parseInt(channelData.statistics.videoCount || "0", 10);
      stats = {
        subscribers: subs,
        avgViews: Math.floor(views / (videoCount || 1)) || 0,
        engagementRate: Math.min(
          100,
          Number(
            (
              (Math.floor(views / (videoCount || 1)) / (subs || 1)) *
              100
            ).toFixed(2)
          )
        ),
        videoCount,
        daysSinceLastUpload: profile.platforms.youtube.daysSinceLastUpload ?? 0,
        title: channelData.snippet.title,
        description: (channelData.snippet.description || "").substring(0, 490),
      };
    }
  }

  if (!stats) return false;

  profile.platforms.youtube.subscribers = stats.subscribers;
  profile.platforms.youtube.avgViews = stats.avgViews;
  profile.platforms.youtube.engagementRate = stats.engagementRate;
  profile.platforms.youtube.videoCount = stats.videoCount;
  profile.platforms.youtube.daysSinceLastUpload = stats.daysSinceLastUpload;
  // Keep the user's handle as they typed it, don't overwrite it with the channel title!
  profile.platforms.youtube.handle = handle || profile.platforms.youtube.handle;

  profile.totalFollowers = stats.subscribers;
  profile.avgEngagementRate = stats.engagementRate;

  const defaultBio =
    "Fashion enthusiast and lifestyle content creator based in Dubai. Specializing in sustainable fashion, beauty reviews, and lifestyle vlogs.";
  if (!profile.bio || profile.bio === defaultBio) {
    profile.bio = stats.description || profile.bio;
  }

  return true;
}
