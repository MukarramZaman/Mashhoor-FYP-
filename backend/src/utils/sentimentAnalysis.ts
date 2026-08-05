import { SentimentLabel } from "../types";

export function analyzeSentiment(text: string): { label: SentimentLabel; score: number } {
  const lower = text.toLowerCase();
  const positiveWords = [
    "great",
    "happy",
    "love",
    "interested",
    "yes",
    "absolutely",
    "excited",
    "sure",
    "definitely",
    "sounds good",
    "let's do",
    "lets do",
    "count me in",
    "i'm in",
    "im in",
    "would love",
  ];
  const negativeWords = [
    "no thanks",
    "not interested",
    "decline",
    "reject",
    "pass on",
    "unfortunately",
    "can't",
    "cannot",
    "not for me",
    "no,",
    "nope",
  ];

  const posCount = positiveWords.filter((w) => lower.includes(w)).length;
  const negCount = negativeWords.filter((w) => lower.includes(w)).length;

  if (posCount > negCount) return { label: "positive", score: Math.min(0.95, 0.7 + posCount * 0.05) };
  if (negCount > posCount) return { label: "negative", score: Math.min(0.95, 0.7 + negCount * 0.05) };
  return { label: "neutral", score: 0.5 };
}

/** True when the influencer is answering the interest prompt affirmatively. */
export function isInterestedReply(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const { label } = analyzeSentiment(text);
  if (label === "negative") return false;
  const affirmatives = [
    "yes",
    "yeah",
    "yep",
    "sure",
    "interested",
    "i am in",
    "i'm in",
    "im in",
    "sounds good",
    "let's talk",
    "lets talk",
    "happy to",
    "would love",
    "definitely",
    "absolutely",
    "count me in",
  ];
  return label === "positive" || affirmatives.some((a) => lower.includes(a));
}

/** Influencer continued the Q&A instead of answering the interest question. */
export function isCampaignFollowUpQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  if (text.includes("?")) return true;
  const cues = [
    "what",
    "how",
    "when",
    "where",
    "who",
    "budget",
    "pay",
    "payment",
    "deliverable",
    "timeline",
    "deadline",
    "location",
    "niche",
    "requirement",
    "tell me",
    "can you explain",
    "more about",
  ];
  return cues.some((c) => lower.includes(c));
}
