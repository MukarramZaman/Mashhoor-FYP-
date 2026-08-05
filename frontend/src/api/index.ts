export { default as api } from "./client";
export { authApi } from "./authApi";
export { influencerApi } from "./influencerApi";
export { campaignApi } from "./campaignApi";
export { outreachApi, messageApi } from "./outreachApi";
export * as dashboardApi from "./dashboardApi";

export type { AuthUser, AuthResponse, UserRole } from "./authApi";
export type { InfluencerProfile, InfluencerFilters, PaginatedInfluencers } from "./influencerApi";
export type { Campaign, CreateCampaignPayload, CampaignStatus } from "./campaignApi";
export type { Outreach, OutreachStatus, Message, Conversation, EmailInviteResult } from "./outreachApi";
export { isPlaceholderInfluencerEmail, isRegisteredOnPlatform, hasDeliverableEmail, resolveOutreachContactEmail } from "./outreachApi";
