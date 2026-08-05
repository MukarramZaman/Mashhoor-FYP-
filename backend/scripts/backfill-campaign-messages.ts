/**
 * Backfill conversations for existing platform outreaches (registered influencers).
 * Run: npx ts-node scripts/backfill-campaign-messages.ts
 */
import "dotenv/config";
import connectDB from "../src/config/database";
import { Outreach } from "../src/models/Outreach";
import { Campaign } from "../src/models/Campaign";
import { User } from "../src/models/User";
import { bootstrapPlatformCampaignMessaging } from "../src/services/messagingService";
import { isRegisteredOnPlatform } from "../src/services/invitationEmailService";

async function main() {
  await connectDB();
  const outreaches = await Outreach.find({ status: { $in: ["sent", "opened", "pending"] } });
  let count = 0;
  for (const outreach of outreaches) {
    const [campaign, influencer, business] = await Promise.all([
      Campaign.findById(outreach.campaign),
      User.findById(outreach.influencer),
      User.findById(outreach.business),
    ]);
    if (!campaign || !influencer || !business) continue;
    if (!isRegisteredOnPlatform(influencer)) continue;
    await bootstrapPlatformCampaignMessaging({
      outreach,
      campaign,
      business,
      influencer,
    });
    count++;
  }
  console.log(`✅ Backfilled messaging for ${count} registered influencer outreaches.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
