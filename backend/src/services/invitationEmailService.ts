import crypto from "crypto";
import { invitationTemplate } from "../templates/invitationTemplate";
import { isEmailConfigured, sendEmail } from "./emailService";
import { AppError } from "../middleware/errorHandler";
import { getPublicClientUrl } from "../config/publicUrl";

const PLACEHOLDER_EMAIL_PATTERN = /@(youtube|instagram)\.test$/i;

export const isPlaceholderEmail = (email: string): boolean =>
  PLACEHOLDER_EMAIL_PATTERN.test(email.trim());

/** Pick a real inbox for an off-platform invite (contact field overrides seeded placeholder). */
export const resolveInviteEmail = (
  influencerEmail: string | undefined,
  contactEmail?: string
): string => {
  const contact = contactEmail?.trim().toLowerCase();
  if (contact && !isPlaceholderEmail(contact)) return contact;

  const stored = influencerEmail?.trim().toLowerCase();
  if (stored && !isPlaceholderEmail(stored)) return stored;

  return "";
};

/** Off-platform creators always get email; registered users get in-app invite only. */
export function shouldSendEmailInvite(
  influencer: { hasSignedUp?: boolean; email: string },
  contactEmail?: string
): boolean {
  if (isRegisteredOnPlatform(influencer)) return false;
  return !!resolveInviteEmail(influencer.email, contactEmail);
}

/** True only when the user completed signup on Mashhoor (not a seeded/imported profile). */
export const isRegisteredOnPlatform = (user: {
  hasSignedUp?: boolean;
}): boolean => user.hasSignedUp === true;

export const isRegisteredInfluencer = (email: string): boolean =>
  !isPlaceholderEmail(email);

export const buildInviteLink = (campaignId: string, inviteToken: string): string => {
  const clientUrl = getPublicClientUrl();
  const params = new URLSearchParams({
    role: "influencer",
    campaign: campaignId,
    invite: inviteToken,
  });
  return `${clientUrl}/signup?${params.toString()}`;
};

export const generateInviteToken = (): string => crypto.randomBytes(24).toString("hex");

export const sendCampaignInvitationEmail = async (params: {
  to: string;
  influencerName: string;
  campaignName: string;
  businessName: string;
  campaignId: string;
  inviteToken: string;
  personalMessage?: string;
}) => {
  if (!isEmailConfigured()) {
    throw new AppError("Email service is not configured. Add SMTP credentials to .env", 503);
  }

  const { to, influencerName, campaignName, businessName, campaignId, inviteToken, personalMessage } =
    params;

  const inviteLink = buildInviteLink(campaignId, inviteToken);
  console.log(`🔗 Invite link: ${inviteLink}`);
  const html = invitationTemplate(
    influencerName,
    campaignName,
    inviteLink,
    businessName,
    personalMessage
  );
  const subject = `${businessName} invited you to collaborate on Mashhoor`;
  const text = [
    `Hi ${influencerName},`,
    ``,
    `${businessName} invited you to collaborate on the campaign "${campaignName}" via Mashhoor.`,
    personalMessage ? `\nMessage from ${businessName}:\n${personalMessage}\n` : "",
    `Accept your invitation: ${inviteLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    return await sendEmail(to, subject, text, html);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new AppError(
      `Could not send invitation email (${detail}). Check SMTP_LOGIN, SMTP_PASSWORD, and EMAIL_FROM in backend/.env`,
      503
    );
  }
};
