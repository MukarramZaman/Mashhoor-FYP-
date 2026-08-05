import { ICampaign } from "../models/Campaign";

export type CampaignRecord = {
  campaign_name: string;
  campaign_description: string;
  target_niche: string;
  target_region: string;
  campaign_budget: string;
  campaign_start_date: string;
  campaign_end_date: string;
  campaign_objective: string;
  influencer_task: string;
  influencer_requirements: string;
};

const SCHEMA_KEYWORDS: Record<keyof CampaignRecord, string[]> = {
  campaign_budget: ["budget", "pay", "cost", "payout", "money", "cash", "fee", "compensation", "payment"],
  campaign_start_date: ["start", "begin", "launch", "starting"],
  campaign_end_date: ["end", "conclude", "finish", "deadline", "ending"],
  target_region: ["region", "location", "where", "country", "city", "pakistan"],
  target_niche: ["niche", "category", "type of content", "audience"],
  campaign_description: ["describe", "summary", "brief", "about", "overview", "product"],
  influencer_task: ["do", "task", "deliverable", "deliverables", "role", "expected", "work"],
  influencer_requirements: ["requirement", "requirements", "criteria", "follower", "followers", "trust", "score"],
  campaign_name: ["campaign", "name", "title"],
  campaign_objective: ["objective", "goal", "purpose", "metrics"],
};

const OUT_OF_SCOPE = [
  "python", "president", "cricket", "football", "recipe", "weather", "joke",
  "stock", "java", "c++", "prime minister", "global warming",
];

export function campaignToRecord(campaign: ICampaign, businessName?: string): CampaignRecord {
  const budget = campaign.budget;
  const budgetStr = budget
    ? `${budget.currency || "PKR"} ${budget.total?.toLocaleString?.() ?? budget.total} (spent: ${budget.spent ?? 0})`
    : "N/A";

  const start = campaign.timeline?.startDate
    ? new Date(campaign.timeline.startDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";
  const end = campaign.timeline?.endDate
    ? new Date(campaign.timeline.endDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const niche = Array.isArray(campaign.niche) ? campaign.niche.join(", ") : String(campaign.niche ?? "");
  const region = Array.isArray(campaign.targetLocations)
    ? campaign.targetLocations.join(", ")
    : "Pakistan";

  const reqs = campaign.requirements;
  
  const taskParts: string[] = [];
  if (reqs?.contentType?.length) taskParts.push(`Content: ${reqs.contentType.join(", ")}`);
  if (reqs?.platforms?.length) taskParts.push(`Platforms: ${reqs.platforms.join(", ")}`);
  const influencer_task = taskParts.length > 0 ? taskParts.join(". ") : "N/A";

  const reqParts: string[] = [];
  if (reqs?.minFollowers) reqParts.push(`Min followers: ${reqs.minFollowers}`);
  if (reqs?.minTrustScore) reqParts.push(`Min trust score: ${reqs.minTrustScore}%`);
  const influencer_requirements = reqParts.length > 0 ? reqParts.join(". ") : "N/A";

  return {
    campaign_name: campaign.title,
    campaign_description: campaign.description,
    target_niche: niche || "General",
    target_region: region,
    campaign_budget: budgetStr,
    campaign_start_date: start,
    campaign_end_date: end,
    campaign_objective: campaign.goals || `Brand collaboration managed by ${businessName || "the business"}.`,
    influencer_task,
    influencer_requirements,
  };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[?!.,#>]/g, "").trim();
}

function scoreField(input: string, keywords: string[]): number {
  const words = input.split(/\s+/);
  let hits = 0;
  for (const kw of keywords) {
    if (input.includes(kw) || words.some((w) => kw.includes(w) && w.length > 2)) hits++;
  }
  return Math.min(1, hits / Math.max(2, keywords.length * 0.35));
}

function computeRelevance(input: string): number {
  let maxScore = 0;
  for (const keywords of Object.values(SCHEMA_KEYWORDS)) {
    maxScore = Math.max(maxScore, scoreField(input, keywords));
  }
  if (OUT_OF_SCOPE.some((n) => input.includes(n))) return Math.min(maxScore, 0.2);
  return maxScore;
}

function pickTopField(input: string): { field: keyof CampaignRecord; score: number } {
  let best: keyof CampaignRecord = "campaign_description";
  let bestScore = 0;
  for (const [field, keywords] of Object.entries(SCHEMA_KEYWORDS) as [
    keyof CampaignRecord,
    string[],
  ][]) {
    const s = scoreField(input, keywords);
    if (s > bestScore) {
      bestScore = s;
      best = field;
    }
  }
  return { field: best, score: bestScore };
}

function buildFacts(input: string, record: CampaignRecord): { facts: string[]; missing: string[] } {
  const facts: string[] = [];
  const missing: string[] = [];

  const askedBudget = ["budget", "pay", "cost", "money", "fee", "compensation", "payment"].some((w) => input.includes(w));
  const askedDates = ["start", "begin", "launch", "starting", "end", "finish", "deadline", "conclude", "ending", "date", "dates", "timeline", "schedule", "when"].some((w) => input.includes(w));
  const askedRegion = ["region", "location", "where", "country", "city"].some((w) => input.includes(w));
  const askedNiche = ["niche", "category", "type of content", "audience"].some((w) => input.includes(w));
  const askedTask = ["task", "deliverable", "deliverables", "do", "expected", "role", "work"].some((w) => input.includes(w));
  const askedReqs = ["requirement", "requirements", "criteria", "follower", "followers", "trust", "score"].some((w) => input.includes(w));
  const askedObjective = ["objective", "goal", "purpose", "metrics"].some((w) => input.includes(w));
  const askedAbout = ["about", "describe", "summary", "brief", "overview", "product"].some((w) => input.includes(w));

  if (askedBudget) {
    if (record.campaign_budget && record.campaign_budget !== "N/A" && record.campaign_budget !== "0") {
      facts.push(`The budget for this campaign is ${record.campaign_budget}.`);
    } else {
      missing.push("budget");
    }
  }

  if (askedDates) {
    const hasStart = record.campaign_start_date && record.campaign_start_date !== "N/A";
    const hasEnd = record.campaign_end_date && record.campaign_end_date !== "N/A";
    if (hasStart && hasEnd) {
      facts.push(`The campaign is scheduled to run from ${record.campaign_start_date} to ${record.campaign_end_date}.`);
    } else if (hasStart) {
      facts.push(`It is scheduled to start on ${record.campaign_start_date}.`);
    } else if (hasEnd) {
      facts.push(`The campaign will wrap up by ${record.campaign_end_date}.`);
    } else {
      missing.push("dates");
    }
  }

  if (askedRegion) {
    if (record.target_region && record.target_region !== "N/A") {
      facts.push(`The target region for this campaign is ${record.target_region}.`);
    } else {
      missing.push("target region");
    }
  }

  if (askedNiche) {
    if (record.target_niche && record.target_niche !== "N/A") {
      facts.push(`The content niche for this campaign is ${record.target_niche}.`);
    } else {
      missing.push("content niche");
    }
  }

  if (askedTask) {
    if (record.influencer_task && record.influencer_task !== "N/A") {
      facts.push(`Your expected deliverables are: ${record.influencer_task}.`);
    } else {
      missing.push("deliverables");
    }
  }

  if (askedReqs) {
    if (record.influencer_requirements && record.influencer_requirements !== "N/A") {
      facts.push(`The campaign requirements are: ${record.influencer_requirements}.`);
    } else {
      missing.push("requirements");
    }
  }

  if (askedObjective) {
    if (record.campaign_objective && record.campaign_objective !== "N/A") {
      facts.push(`The campaign objective is: ${record.campaign_objective}.`);
    } else {
      missing.push("objective");
    }
  }

  if (facts.length === 0 && (askedAbout || missing.length === 0)) {
    if (record.campaign_description && record.campaign_description !== "N/A") {
      facts.push(`Here is a quick overview of the campaign: ${record.campaign_description}`);
    } else {
      facts.push(`This is the "${record.campaign_name}" campaign.`);
    }
  }

  return { facts, missing };
}

function runLocalPipeline(
  userMessage: string,
  chatHistory: { user: string; bot: string }[],
  record: CampaignRecord
): { reply: string; trace?: string } {
  const cleaned = normalize(userMessage);
  if (!cleaned) {
    return { reply: "Please type a valid question regarding the campaign." };
  }

  const acks = ["yes", "no", "ok", "okay", "sure", "thanks", "thank you", "great", "understood"];
  if (acks.includes(cleaned)) {
    return {
      reply:
        "Understood! Please let me know if you have any questions about the campaign budget, timeline, target region, content niche, or deliverables. I'm here to help!",
    };
  }

  if (["hi", "hello", "hey", "aoa", "salam", "hy"].some((g) => cleaned === g || cleaned.startsWith(g + " "))) {
    return {
      reply: `Hi there! I'm the Mashhoor assistant for the "${record.campaign_name}" campaign. I can help answer any questions you have regarding the budget, timeline, target region, niche, or expected deliverables. What would you like to know?`,
    };
  }

  const relevance = computeRelevance(cleaned);
  const { field, score } = pickTopField(cleaned);

  if (relevance < 0.22 && score < 0.2) {
    return {
      reply: `I can only help with questions related to the "${record.campaign_name}" campaign, such as its budget, timeline, niche, or deliverables. Let me know if you have any questions about those!`,
      trace: "Out-Of-Scope Guardrail Triggered",
    };
  }

  const { facts, missing } = buildFacts(cleaned, record);

  if (missing.length > 0 && facts.length === 0) {
    const readable = missing.join(", ");
    if (missing.includes("deliverables") || missing.includes("requirements")) {
      return {
        reply: `I don't have details about the campaign deliverables or requirements on file right now. Would you like to start a real-time chat with the brand to discuss these? Are you interested?`,
        trace: `Missing: ${readable}`,
      };
    }
    return {
      reply: `I don't have the details for the campaign ${readable} on file at the moment. Let me know if you have other questions!`,
      trace: `Missing: ${readable}`,
    };
  }

  const factText = facts.join(" ");
  const closingText = chatHistory.length > 0
    ? ` Let me know if you need details on any other aspect of "${record.campaign_name}"!`
    : ` Let me know if you have any other questions about the campaign!`;

  return {
    reply: `${factText}${closingText}`,
    trace: `Matched: ${field}`,
  };
}

export async function generateAssistantWelcome(
  campaign: ICampaign,
  businessName?: string
): Promise<string> {
  const record = campaignToRecord(campaign, businessName);
  return (
    `Hi! You've been invited to collaborate on "${record.campaign_name}" by ${businessName || "a brand"} on Mashhoor. ` +
    `I'm your campaign assistant — ask me about the budget (${record.campaign_budget}), timeline (${record.campaign_start_date} – ${record.campaign_end_date}), ` +
    `target region (${record.target_region}), niche (${record.target_niche}), or what you need to deliver. ` +
    `Feel free to ask me any questions you have about this campaign!`
  );
}

export async function runCampaignAssistantPipeline(params: {
  userMessage: string;
  chatHistory: { user: string; bot: string }[];
  campaign: ICampaign;
  businessName?: string;
}): Promise<{ reply: string; trace?: string }> {
  const record = campaignToRecord(params.campaign, params.businessName);
  const aiUrl = process.env.AI_SERVICE_URL?.replace(/\/$/, "");

  if (aiUrl) {
    try {
      const res = await fetch(`${aiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: params.userMessage,
          chat_history: params.chatHistory,
          campaign_record: record,
        }),
        signal: AbortSignal.timeout(Number(process.env.AI_SERVICE_TIMEOUT_MS) || 120000),
      });
      if (res.ok) {
        const json = (await res.json()) as { reply: string; trace?: string };
        if (json.reply) return { reply: json.reply, trace: json.trace };
      }
    } catch (err) {
      console.warn("AI service unavailable, using local campaign assistant:", err);
    }
  }

  return runLocalPipeline(params.userMessage, params.chatHistory, record);
}
