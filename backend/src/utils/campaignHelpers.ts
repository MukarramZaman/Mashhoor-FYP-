import mongoose from "mongoose";

export function influencerSelectedOnCampaign(
  selectedInfluencers: mongoose.Types.ObjectId[],
  influencerId: mongoose.Types.ObjectId | string
): boolean {
  const target = influencerId.toString();
  return selectedInfluencers.some((id) => id.toString() === target);
}

export function addInfluencerToCampaign(
  selectedInfluencers: mongoose.Types.ObjectId[],
  influencerId: mongoose.Types.ObjectId
): mongoose.Types.ObjectId[] {
  if (influencerSelectedOnCampaign(selectedInfluencers, influencerId)) {
    return selectedInfluencers;
  }
  return [...selectedInfluencers, influencerId];
}

export function calculateCampaignProgress(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now < start) return 0;
  if (now > end) return 100;
  const duration = end - start;
  if (duration <= 0) return 0;
  return Math.round(((now - start) / duration) * 100);
}
