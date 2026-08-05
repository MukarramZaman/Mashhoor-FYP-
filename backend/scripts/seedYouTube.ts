/**
 * seedYouTube.ts — Seeds the database with exactly the 47 specified YouTube channels.
 * Uses direct channel lookup by @handle or channel ID (no search quota needed).
 * Also fetches daysSinceLastUpload from the most recent video for Content Consistency scoring.
 * Run: npx ts-node scripts/seedYouTube.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/database";
import { getYouTubeApiKey } from "../src/config/youtube";
import { User } from "../src/models/User";
import { InfluencerProfile } from "../src/models/InfluencerProfile";
import { calculateTrustScore } from "../src/services/trustScoreService";
import { getRealEmailForInfluencer } from "../src/utils/influencerEmailsMap";

const API_KEY = getYouTubeApiKey();

// ─── Channel definitions ───────────────────────────────────────────────────────
// For each channel provide either a @handle OR a channel ID (starts with UC...)
// Both will be resolved via the YouTube channels API (no search quota used).
interface ChannelEntry {
  displayName: string;  // What we store as the handle/display name
  niche: string;
  handle?: string;      // YouTube @handle (e.g. "gsportspk")
  channelId?: string;   // YouTube channel ID (e.g. "UCxxxxxx")
}

const TARGET_CHANNELS: ChannelEntry[] = [
  // ── Cricket ──────────────────────────────────────────────────────────────────
  { displayName: "Pakistan Wheelchair Cricket Council", niche: "Cricket",    handle: "PakWheelchairCricket" },
  { displayName: "Cricket With Umer Afzaal 2.0",        niche: "Cricket",    handle: "CricketwithUmerAfzaal2.0" },
  { displayName: "GTV Sports",                           niche: "Cricket",    handle: "gsportspk" },
  { displayName: "World Sports",                         niche: "Cricket",    channelId: "UCkL5grIbPSBDNMzAf0HNXRA" },
  { displayName: "cricket lover Ali",                    niche: "Cricket",    handle: "cricketsocialclub" },
  { displayName: "Chacha Pakistani",                     niche: "Cricket",    handle: "Cricketnewschachapakistani" },
  { displayName: "Cricket with CH WALEED RAUF",          niche: "Cricket",    handle: "Cricketwithchwaleedrauf" },
  { displayName: "Pakistan Cricket",                     niche: "Cricket",    handle: "PakistanCricketOfficial" },
  { displayName: "CatchAndBatwithKamranAkmal",           niche: "Cricket",    handle: "CatchAndBatwithKamranAkmal" },
  // Furqan Bhatti — handle uses dot notation which YouTube supports
  { displayName: "FurqanBhatti.Cricket",                 niche: "Cricket",    handle: "FurqanBhatti.Cricket" },
  // ── Music ─────────────────────────────────────────────────────────────────────
  { displayName: "Top Folk Songs",                       niche: "Music",      handle: "TopFolkSongs" },
  { displayName: "Talented Singers Of Pakistan",         niche: "Music",      handle: "TalentedSingersOfPakistan" },
  // ── Entertainment ─────────────────────────────────────────────────────────────
  { displayName: "ShahveerJay",                          niche: "Entertainment", handle: "ShahveerJay" },
  { displayName: "NehaalNaseem",                         niche: "Entertainment", handle: "nehaalnaseem" },
  { displayName: "shehrmaindihat",                       niche: "Entertainment", handle: "shehrmaindihat" },
  { displayName: "GanjiSwag",                            niche: "Entertainment", handle: "GanjiSwag" },
  { displayName: "Sistrology",                           niche: "Entertainment", handle: "Sistrology" },
  { displayName: "DuckyBhai",                            niche: "Entertainment", handle: "DuckyBhai" },
  { displayName: "rajabbutt94",                          niche: "Entertainment", handle: "rajabbutt94" },
  // ── Food / Lifestyle ──────────────────────────────────────────────────────────
  { displayName: "Street Food Pakistan",                 niche: "Lifestyle",  handle: "streetfoodpk" },
  { displayName: "Yes In Pakistan",                      niche: "Lifestyle",  handle: "YesinPakistan" },
  { displayName: "WildlensbyAbrar",                      niche: "Lifestyle",  handle: "wildlensbyabrar" },
  // ── Fashion ───────────────────────────────────────────────────────────────────
  { displayName: "SAPPHIRE Pakistan",                    niche: "Fashion",    handle: "SAPPHIREPakistan" },
  { displayName: "Eastern Fashion Pakistan",             niche: "Fashion",    handle: "easternfashion.pk1" },
  { displayName: "Fashion In Pakistan",                  niche: "Fashion",    handle: "Fashion_in_pakistan" },
  // ── Tech / Education ──────────────────────────────────────────────────────────
  { displayName: "Aptech Learning Pakistan Official",    niche: "Tech",       handle: "aptechlearningpakistan" },
  { displayName: "Pak Science Club",                     niche: "Tech",       handle: "PakScienceClub" },
  { displayName: "MAS TECH",                             niche: "Tech",       handle: "MASTECHOfficial" },

  { displayName: "Pakistan Time News Official",          niche: "Politics",   handle: "PakistanTimeNewsOfficial" },
  { displayName: "GEO SUPER",                            niche: "Politics",   handle: "GeoSuper" },
  { displayName: "DawnNews English",                     niche: "Politics",   handle: "dawnnewsenglish" },
  { displayName: "GNN",                                  niche: "Politics",   handle: "gnnhdofficial" },
  { displayName: "365 Plus",                             niche: "Politics",   handle: "365Plus" },
  { displayName: "SUNO NEWS HD",                         niche: "Politics",   handle: "SUNONewsHD" },
  // ── Gaming ────────────────────────────────────────────────────────────────────
  { displayName: "Star ANONYMOUS",                       niche: "Gaming",     handle: "StarANONYMOUS" },
  { displayName: "GT ESPORTS",                           niche: "Gaming",     handle: "GTEsportsPakistan" },
  { displayName: "Garena Free Fire Pakistan",            niche: "Gaming",     handle: "FreeFirePakistanOfficial" },
  { displayName: "pakistani gamer",                      niche: "Gaming",     handle: "Pakistanithegamer" },
  { displayName: "P9 GAMING YT",                        niche: "Gaming",     handle: "P9GAMINGYT" },
  { displayName: "MrJayPlays",                           niche: "Gaming",     handle: "MrJayPlays" },

  // ── Newly Added Channels ──────────────────────────────────────────────────────
  { displayName: "Video Wali Sarkar",                    niche: "Tech",       handle: "VideoWaliSarkar1" },
  { displayName: "PakWheels",                            niche: "Tech",       handle: "PakWheels" },
  { displayName: "Young Stunners",                       niche: "Music",      handle: "YoungStunners" },
  { displayName: "Nadir Ali",                            niche: "Entertainment", handle: "Nadiraliofficial" },
  { displayName: "Kaifi Khalil",                         niche: "Music",      handle: "KaifiKhalil" },
  { displayName: "Zalmi Plays",                          niche: "Entertainment", handle: "ZalmiPlays" },
  { displayName: "Ducky Reloaded",                       niche: "Gaming",     handle: "DuckyReloaded1" },
  { displayName: "Rana Hamza Saif",                      niche: "Lifestyle",  handle: "RanaHamzaSaifRHS" },
  { displayName: "Bhadar Gang",                          niche: "Lifestyle",  handle: "BhadarGang" },
  { displayName: "Ali Zafar",                            niche: "Music",      handle: "AliZafarofficial" }
];

// ─── YouTube API helpers ──────────────────────────────────────────────────────
interface ChannelData {
  id: string;
  title: string;
  description: string;
  avatar: string;
  subscribers: number;
  views: number;
  videoCount: number;
  daysSinceLastUpload?: number;  // For Content Consistency scoring
}

async function getDaysSinceLastUpload(channelId: string): Promise<number | undefined> {
  if (!API_KEY) return undefined;
  try {
    // Get the channel's uploads playlist ID
    const chanRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
    );
    const chanData = await chanRes.json() as any;
    const uploadsPlaylistId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return undefined;

    // Get the most recent video from uploads playlist
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1&key=${API_KEY}`
    );
    const playlistData = await playlistRes.json() as any;
    const latestVideoDate = playlistData.items?.[0]?.contentDetails?.videoPublishedAt;
    if (!latestVideoDate) return undefined;

    const lastUploadMs = new Date(latestVideoDate).getTime();
    const nowMs = Date.now();
    return Math.floor((nowMs - lastUploadMs) / (1000 * 60 * 60 * 24));
  } catch {
    return undefined;
  }
}

async function fetchChannelData(entry: ChannelEntry): Promise<ChannelData | null> {
  if (!API_KEY) return null;

  let url: string;
  if (entry.channelId) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${entry.channelId}&key=${API_KEY}`;
  } else if (entry.handle) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(entry.handle)}&key=${API_KEY}`;
  } else {
    return null;
  }

  const res = await fetch(url);
  const data = await res.json() as any;

  if (data.error) {
    console.warn(`  ⚠️  API error for "${entry.displayName}": ${data.error.message}`);
    return null;
  }

  const ch = data.items?.[0];
  if (!ch) {
    console.warn(`  ⚠️  Not found: "${entry.displayName}" (handle: ${entry.handle || entry.channelId})`);
    return null;
  }

  const subscribers = parseInt(ch.statistics?.subscriberCount || "0", 10);
  const views = parseInt(ch.statistics?.viewCount || "0", 10);
  const videoCount = parseInt(ch.statistics?.videoCount || "0", 10);
  const avatar =
    ch.snippet?.thumbnails?.high?.url ||
    ch.snippet?.thumbnails?.medium?.url ||
    ch.snippet?.thumbnails?.default?.url || "";

  // Fetch days since last upload for Content Consistency scoring
  const daysSinceLastUpload = await getDaysSinceLastUpload(ch.id);

  return {
    id: ch.id,
    title: ch.snippet?.title || entry.displayName,
    description: (ch.snippet?.description || "").substring(0, 500),
    avatar,
    subscribers,
    views,
    videoCount,
    daysSinceLastUpload,
  };
}

async function makeUniqueEmail(email: string, username: string, currentUserId?: string): Promise<string> {
  if (email.endsWith(".test")) return email;
  const existingUser = await User.findOne({
    email,
    ...(currentUserId ? { _id: { $ne: currentUserId } } : {})
  });
  if (existingUser) {
    const parts = email.split("@");
    if (parts.length === 2) {
      const cleanTag = username.toLowerCase().replace(/[^a-z0-9]/g, "");
      return `${parts[0]}+${cleanTag}@${parts[1]}`;
    }
  }
  return email;
}

// ─── Main seeder ─────────────────────────────────────────────────────────────
async function seedYouTubeDatabase() {
  if (!API_KEY) {
    console.error("❌ YOUTUBE_API_KEY is not set in .env");
    process.exit(1);
  }

  await connectDB();
  console.log("\n🎬 Starting YouTube channel seeding...");
  console.log(`   Targeting ${TARGET_CHANNELS.length} channels\n`);

  let successCount = 0;
  let failCount = 0;

  for (const entry of TARGET_CHANNELS) {
    console.log(`🔍 Fetching: "${entry.displayName}"...`);

    try {
      let channelData = await fetchChannelData(entry);

      if (!channelData) {
        console.warn(`  ⚠️ Could not fetch live API data for "${entry.displayName}" (using DB fallback)`);
        let profile = await InfluencerProfile.findOne({ "platforms.youtube.handle": entry.displayName });
        if (profile) {
          const resolvedEmail = getRealEmailForInfluencer(entry.handle || "", entry.displayName);
          if (resolvedEmail) {
            let user = await User.findById(profile.user);
            if (user) {
              const uniqueEmail = await makeUniqueEmail(resolvedEmail.toLowerCase(), entry.displayName, user._id.toString());
              user.email = uniqueEmail;
              await user.save();
              console.log(`  ✅ Updated email for existing influencer "${entry.displayName}" to ${uniqueEmail} (API quota fallback)`);
              successCount++;
              continue;
            }
          }
        }
        failCount++;
        continue;
      }

      const daysText = channelData.daysSinceLastUpload !== undefined
        ? `last upload ${channelData.daysSinceLastUpload}d ago`
        : "upload date unknown";
      console.log(`  ✔ Found: "${channelData.title}" — ${(channelData.subscribers / 1000).toFixed(0)}K subs, ${channelData.videoCount} videos, ${daysText}`);

      const resolvedEmail = getRealEmailForInfluencer(entry.handle || "", entry.displayName);
      let email = resolvedEmail ? resolvedEmail.toLowerCase() : `${channelData.id.toLowerCase()}@youtube.test`;

      // Upsert User & Profile by finding profile by handle first (to support email changes without duplicates)
      let profile = await InfluencerProfile.findOne({ "platforms.youtube.handle": entry.displayName });
      let user;

      if (profile) {
        // Retrieve and update existing user record
        user = await User.findById(profile.user);
        if (user) {
          user.name = channelData.title;
          user.email = await makeUniqueEmail(email, entry.displayName, user._id.toString());
          user.avatar = channelData.avatar || user.avatar;
          await user.save();
        } else {
          // Fallback if user record somehow went missing
          email = await makeUniqueEmail(email, entry.displayName);
          user = await User.create({
            name: channelData.title,
            email,
            password: "Password123!",
            role: "influencer",
            avatar: channelData.avatar,
            isVerified: true,
            hasSignedUp: false,
          });
          profile.user = user._id;
        }
      } else {
        // No profile exists yet: find user by email or create new
        email = await makeUniqueEmail(email, entry.displayName);
        user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            name: channelData.title,
            email,
            password: "Password123!",
            role: "influencer",
            avatar: channelData.avatar,
            isVerified: true,
            hasSignedUp: false,
          });
        }
      }

      // Compute metrics
      const avgViews = Math.floor(channelData.views / (channelData.videoCount || 1)) || 0;
      const engagementRate = channelData.subscribers > 0
        ? Math.min(100, Number(((avgViews / channelData.subscribers) * 100).toFixed(2)))
        : 0;

      if (!profile) {
        profile = await InfluencerProfile.create({
          user: user._id,
          niche: [entry.niche],
          location: "Pakistan",
          country: "Pakistan",
          bio: channelData.description,
          platforms: {
            youtube: {
              handle: entry.displayName,  // stored as our display name for filtering
              subscribers: channelData.subscribers,
              avgViews,
              engagementRate,
              daysSinceLastUpload: channelData.daysSinceLastUpload,  // Content Consistency
              videoCount: channelData.videoCount,                      // Content Consistency
            },
          },
          trustScore: 0,
          isVerified: true,
        });
      } else {
        profile.niche = [entry.niche];
        profile.bio = channelData.description || profile.bio;
        if (!profile.platforms) profile.platforms = {} as any;
        profile.platforms.youtube = {
          handle: entry.displayName,
          subscribers: channelData.subscribers,
          avgViews,
          engagementRate,
          daysSinceLastUpload: channelData.daysSinceLastUpload,
          videoCount: channelData.videoCount,
        };
        await profile.save();
      }

      // Compute & save trust score (daysSinceLastUpload → Content Consistency is now real)
      const { score, breakdown } = await calculateTrustScore(profile);
      profile.trustScore = score;
      profile.trustScoreBreakdown = breakdown;
      await profile.save();

      console.log(`  ✅ Seeded "${channelData.title}" — Trust Score: ${score}/100 | Content Consistency: ${breakdown?.contentConsistency ?? 0}%\n`);
      successCount++;

      // Small delay to be kind to the API
      await new Promise((r) => setTimeout(r, 250));

    } catch (err: any) {
      console.error(`  ❌ Error seeding "${entry.displayName}":`, err?.message || err);
      failCount++;
    }
  }

  console.log(`\n🏆 YouTube seeding complete! ✅ ${successCount} seeded, ❌ ${failCount} failed.`);
  await mongoose.disconnect();
}

seedYouTubeDatabase().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
