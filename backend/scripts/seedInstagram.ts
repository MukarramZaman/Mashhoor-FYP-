import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User";
import { InfluencerProfile } from "../src/models/InfluencerProfile";
import connectDB from "../src/config/database";
import { ApifyClient } from "apify-client";
import { getRealEmailForInfluencer } from "../src/utils/influencerEmailsMap";
import { calculateTrustScore } from "../src/services/trustScoreService";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;
const client = new ApifyClient({ token: APIFY_API_TOKEN });

const PAKISTANI_INFLUENCERS = [
    // Tech
    "bilalmunir1995", "xeetechcare", "minoqtopus",
    // Music
    "talhahanjum", "talhahyunus", "asimazhar", "alisethiofficial",
    // Cricket
    "babarazam", "ishaheenafridi10", "furqanbhatti.cricket", "saimayubb",
    "safridiofficial", "mrizwanpak", "harisraufofficial", "inaseemshah",
    "fakharzaman719", "realshoaibmalik", "m_hafeez8", "wasimakramliveofficial",
    // Gaming
    "theanonymousxd", "mrjayplays", "arslan.ash",
    // Fashion
    "hemayal", "ayeshabeigs", "hussain.tareen",
    // Entertainment (General)
    "waseembadami_official", "ganjiswag", "irfanjunejo", "flkkkk.iso",
    "haniaheheofficial", "mahirahkhan", "ayezakhan.ak", "official_mayaali",
    "sajalaly", "mawrellous", "yumnazaidiofficial", "wahaj.official",
    "bilalabbas_khan", "danishtaimoor16", "muneeb_butt", "iiqraaziz",
    "farhan_saeed", "ferozekhan", "duckybhai", "rajab.butt94", "sistrology___",
    "shahveerjay", "umarkhan", "zaidalit", "wildlensbyabrar", "inkleftunsaid"
];

const getNicheForUsername = (username: string) => {
    const tech = ["bilalmunir1995", "xeetechcare", "minoqtopus"];
    const music = ["talhahanjum", "talhahyunus", "asimazhar", "alisethiofficial"];
    const cricket = [
        "babarazam", "ishaheenafridi10", "furqanbhatti.cricket", "saimayubb",
        "safridiofficial", "mrizwanpak", "harisraufofficial", "inaseemshah",
        "fakharzaman719", "realshoaibmalik", "m_hafeez8", "wasimakramliveofficial"
    ];
    const gaming = ["theanonymousxd", "mrjayplays", "arslan.ash"];
    const fashion = ["hemayal", "ayeshabeigs", "hussain.tareen"];

    if (tech.includes(username)) return "Tech";
    if (music.includes(username)) return "Music";
    if (cricket.includes(username)) return "Cricket";
    if (gaming.includes(username)) return "Gaming";
    if (fashion.includes(username)) return "Fashion";
    return "Entertainment";
};

// Utility function to convert secure Instagram URLs to permanent Base64 data strings
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

export async function seedInstagramDatabase() {
    console.log(`\n🚀 Initializing Apify Engine...`);

    try {
        if (process.env.NODE_ENV !== "test") {
            await connectDB();
        }

        console.log("🧹 Clearing existing Instagram influencer data...");
        const allIgProfiles = await InfluencerProfile.find({ "platforms.instagram.handle": { $exists: true, $ne: "" } });
        
        const userIdsToDelete: any[] = [];
        const profileIdsToDelete: any[] = [];

        for (const p of allIgProfiles) {
            const hasYoutube = p.platforms?.youtube?.handle;
            const hasTiktok = p.platforms?.tiktok?.handle;
            if (hasYoutube || hasTiktok) {
                if (p.platforms) {
                    p.platforms.instagram = undefined;
                }
                await p.save();
            } else {
                userIdsToDelete.push(p.user);
                profileIdsToDelete.push(p._id);
            }
        }

        if (profileIdsToDelete.length > 0) {
            await InfluencerProfile.deleteMany({ _id: { $in: profileIdsToDelete } });
        }
        if (userIdsToDelete.length > 0) {
            await User.deleteMany({ _id: { $in: userIdsToDelete } });
        }

        // CRITICAL UPDATE: resultsLimit forces the actor to pull the timeline posts payload
        const input = {
            "usernames": PAKISTANI_INFLUENCERS,
            "resultsLimit": 12,
            "includeAboutSection": false
        };

        const run = await client.actor("dSCLg0C3YEZ83HzYX").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`\n============ LIVE DATA RECEIVED (${items.length} Profiles) ============ \n`);

        for (let i = 0; i < items.length; i++) {
            const profile: any = items[i];
            const username = profile.username?.toLowerCase();
            if (!username) continue;

            const resolvedEmail = getRealEmailForInfluencer(username);
            let email = resolvedEmail ? resolvedEmail.toLowerCase() : `${username}@instagram.test`;
            const name = profile.fullName || profile.username;
            const followers = profile.followersCount || 0;

            // 1. Download and convert image directly to bypass 403 hotlinking issues permanently
            console.log(`Converting avatar for @${username}...`);
            const rawAvatarUrl = profile.profilePicUrlHd || profile.profilePicUrl;
            const safeBase64Avatar = rawAvatarUrl ? await imageToBase64(rawAvatarUrl) : "https://via.placeholder.com/150";

            const bio = profile.biography ? profile.biography.substring(0, 500) : "";

            // 2. Extract and parse real post statistics
            const latestPosts = profile.latestPosts || [];
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

                // Estimate Reach: max of (actual views) or (engagements * 2) for a more conservative estimate
                const estimatedReach = Math.max(avgViewsPerPost, (avgLikesPerPost + avgCommentsPerPost) * 2);

                // Unified Formula: (Avg Reach / Followers) * 100
                // This perfectly matches the YouTube formula (Avg Views / Subscribers)
                if (followers > 0) {
                    finalEngagementRate = (estimatedReach / followers) * 100;
                }
            }

            const calculatedAvgLikes = latestPosts.length > 0 ? Math.floor(totalLikes / latestPosts.length) : 0;
            const calculatedAvgComments = latestPosts.length > 0 ? Math.floor(totalComments / latestPosts.length) : 0;

            let influencerProfile = await InfluencerProfile.findOne({ 
                $or: [
                    { "platforms.instagram.handle": username },
                    { "platforms.instagram.handle": profile.username }
                ]
            });
            let user;

            if (influencerProfile) {
                user = await User.findById(influencerProfile.user);
                if (user) {
                    user.name = name;
                    user.email = await makeUniqueEmail(email, username, user._id.toString());
                    user.avatar = safeBase64Avatar || user.avatar;
                    await user.save();
                } else {
                    email = await makeUniqueEmail(email, username);
                    user = await User.create({
                        name: name,
                        email: email,
                        password: "Password123!",
                        role: "influencer",
                        avatar: safeBase64Avatar,
                        isVerified: profile.isVerified || false
                    });
                    influencerProfile.user = user._id;
                }
            } else {
                email = await makeUniqueEmail(email, username);
                user = await User.findOne({ email });
                if (!user) {
                    user = await User.create({
                        name: name,
                        email: email,
                        password: "Password123!",
                        role: "influencer",
                        avatar: safeBase64Avatar,
                        isVerified: profile.isVerified || false
                    });
                }
                
                // Fallback: Check if this user already has an existing profile (e.g. seeded via YouTube)
                influencerProfile = await InfluencerProfile.findOne({ user: user._id });
            }

            if (!influencerProfile) {
                influencerProfile = await InfluencerProfile.create({
                    user: user._id,
                    niche: [getNicheForUsername(username)],
                    location: "Pakistan",
                    country: "Pakistan",
                    bio: bio,
                    platforms: {
                        instagram: {
                            handle: profile.username,
                            followers: followers,
                            engagementRate: Number(Math.min(100, finalEngagementRate).toFixed(2)),
                            avgLikes: calculatedAvgLikes,
                            avgComments: calculatedAvgComments
                        }
                    },
                    trustScore: 0,
                    isVerified: profile.isVerified || false
                });
            } else {
                influencerProfile.bio = bio || influencerProfile.bio;
                if (!influencerProfile.platforms) influencerProfile.platforms = {} as any;
                influencerProfile.platforms.instagram = {
                    handle: profile.username,
                    followers: followers,
                    engagementRate: Number(Math.min(100, finalEngagementRate).toFixed(2)),
                    avgLikes: calculatedAvgLikes,
                    avgComments: calculatedAvgComments
                };
                await influencerProfile.save();
            }

            const { score, breakdown } = await calculateTrustScore(influencerProfile);
            influencerProfile.trustScore = score;
            influencerProfile.trustScoreBreakdown = breakdown;
            await influencerProfile.save();
            console.log(`✅ Verified, scored (${score}/100) and stored @${username} [Real Engagement: ${finalEngagementRate.toFixed(2)}%]`);
        }

        console.log("\n🏆 Instagram Data Seeding completely successful!");

    } catch (error) {
        console.error("❌ Pipeline failed:", error);
    }
}

if (require.main === module) {
    seedInstagramDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
