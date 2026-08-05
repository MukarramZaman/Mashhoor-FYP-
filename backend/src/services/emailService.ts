import nodemailer from "nodemailer";

export let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_LOGIN,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 20_000,
});

export const isEmailConfigured = (): boolean =>
  !!(process.env.SMTP_LOGIN && process.env.SMTP_PASSWORD);

export const setupEmailService = async (): Promise<boolean> => {
  if (!isEmailConfigured()) {
    console.warn("⚠️  SMTP credentials missing (SMTP_LOGIN / SMTP_PASSWORD). Email invites disabled.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ Brevo SMTP connection successful");
    return true;
  } catch (err) {
    console.error("❌ Brevo SMTP failed. Check credentials and IP restrictions in Brevo.");
    if (process.env.NODE_ENV === "production") throw err;
    return false;
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  if (!isEmailConfigured()) {
    throw new Error("SMTP is not configured (SMTP_LOGIN / SMTP_PASSWORD missing)");
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Mashhoor <noreply@mashhoor.com>",
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send email to ${to}:`, message);
    throw err;
  }
};
