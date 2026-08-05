/** Public frontend URL used in emails (invite links, password reset). */
export function getPublicClientUrl(): string {
  const url =
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "https://mashhoor-frontend.vercel.app";
  return url.replace(/\/$/, "");
}
