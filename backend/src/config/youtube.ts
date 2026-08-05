/** YouTube Data API key — set YOUTUBE_API_KEY in backend/.env */
export function getYouTubeApiKey(): string | null {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (key) return key;

  if (process.env.NODE_ENV !== "production") {
    const fallback = process.env.YOUTUBE_API_KEY_FALLBACK?.trim();
    if (fallback) return fallback;
    console.warn(
      "⚠️  YOUTUBE_API_KEY not set — YouTube analytics sync disabled. Add YOUTUBE_API_KEY to backend/.env"
    );
  }
  return null;
}
