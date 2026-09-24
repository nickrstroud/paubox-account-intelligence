import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "./fetch-news.ts";
import type { AccountSignal, Company, CompanyAnalysis } from "../lib/types.ts";
import { segmentLabel } from "../lib/segments.ts";
import { PAUBOX_CONTEXT, PLAY_ENUM, TAXONOMY_TEXT, UPDATE_TYPE_ENUM } from "./paubox-context.ts";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
export const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are an account-intelligence analyst supporting a customer
success team. Given recent public news about ONE customer account, extract signals
relevant to the vendor relationship — not general news summarization.

${PAUBOX_CONTEXT}

Score each distinct signal from -2 (strong renewal/relationship risk) to +2 (strong
expansion opportunity):

- Breach, phishing/BEC incident, or ransomware at the account -> +2 if it involves email
  (urgent inbound-security/DLP conversation), otherwise +1. Also flag the account is
  under pressure: keep the tone helpful, not opportunistic.
- OCR investigation, HIPAA settlement, or breach lawsuit -> +1 (compliance posture review)
- New locations, acquiring practices/hospitals, funding, new service lines -> +1/+2 (seats,
  sites, marketing, forms)
- Launching patient-facing digital programs, apps, or patient marketing -> +1 (Marketing,
  Email API, Forms)
- Migrating email platforms (e.g. to Microsoft 365/Google Workspace), EHR changes -> +1
  if it opens a door, -1 if it may displace Paubox
- New CIO/CISO/compliance leader -> 0 or +1 (re-introduction; new leaders review vendors)
- Named champion leaving -> -1
- Being acquired by a larger system -> -2 (vendor consolidation risk)
- Layoffs, closures, bankruptcy, financial distress -> -1/-2
- A competing secure-email vendor mentioned -> -1
- Awards, "best places to work", positive press -> 0/+1 (advocacy / case-study ask)
- Materiality: judge size relative to the account. One office opening or closing at a
  large multi-site organization (dozens+ locations) is routine: 0 for a closure, +1 at
  most for an opening. For a single-site practice the same event is material.

IMPORTANT relevance rules:
- Only use articles clearly about THIS organization. Namesakes and unrelated entities
  with a similar name must be ignored. The account's name may be styled differently in
  articles (capitalization, accents, a shorter brand name, e.g. "OURA" = "Oura" = "ŌURA");
  those are the same organization.
- Every account is a customer; judge news by what it means for the relationship, even
  for consumer-facing companies (funding/IPO, lawsuits, partnerships all matter).
- If nothing is relevant, return an empty signals array. Most accounts are quiet on
  most days — that is the expected outcome, not a failure.
- One signal per distinct event, even if several articles cover it.

${TAXONOMY_TEXT}

The account itself is the Paubox customer. Its own customers, partners, and investors are
not. Frame actions around the account (e.g. "their customer win means more patient
email volume through their platform"), never around the third party's Paubox usage.
The play field must match the product the suggestedAction proposes.

suggestedAction: one concrete next step a CSM would take this week, written for this
account (e.g. "Email the practice manager a phishing-readiness checklist and offer an
Inbound Security trial"), not a generic platitude.`;

const RECORD_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "record_analysis",
  description: "Record the account-relationship analysis for this account's recent news.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", description: "One-line summary of this run's overall picture" },
      signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", description: "Short label, e.g. 'Phishing incident', 'New clinic opening'" },
            updateType: { type: "string", enum: UPDATE_TYPE_ENUM },
            play: { type: "string", enum: PLAY_ENUM },
            score: { type: "integer", enum: [-2, -1, 0, 1, 2] },
            summary: { type: "string" },
            suggestedAction: { type: "string" },
            articleIndex: { type: "integer", description: "The [n] index of the main supporting article" },
          },
          required: ["category", "updateType", "play", "score", "summary", "suggestedAction", "articleIndex"],
        },
      },
    },
    required: ["headline", "signals"],
  },
};

export interface AnalyzeOptions {
  runAt?: string;
  source?: "daily" | "backfill";
  periodLabel?: string;
}

export async function analyzeCompany(
  company: Company,
  news: NewsItem[],
  opts: AnalyzeOptions = {},
): Promise<CompanyAnalysis> {
  const articleBlock = news
    .map((n, i) => `[${i}] ${n.title} (${n.source}, ${n.publishedAt})\n${n.snippet}`)
    .join("\n\n");

  const profile = [
    `Account: ${company.name}`,
    `Website: ${company.website}`,
    `Segment: ${segmentLabel(company.segment)}`,
    company.newsQuery ? `News search used: ${company.newsQuery}` : null,
    company.products?.length ? `Current Paubox products: ${company.products.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [RECORD_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [
      {
        role: "user",
        content: `${profile}\n\n${opts.periodLabel ?? "Recent"} articles:\n\n${articleBlock}`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`no tool_use block in response for ${company.name} (stop_reason=${message.stop_reason})`);
  }
  const parsed = toolUse.input as {
    headline?: string;
    signals?: (Omit<AccountSignal, "sourceName" | "sourceLink"> & { articleIndex: number })[];
  };

  // Source attribution comes from our own article list, not model output, so
  // links can't be hallucinated.
  const signals: AccountSignal[] = (parsed.signals ?? []).map(({ articleIndex, ...s }) => {
    const article = news[articleIndex] ?? news[0];
    return {
      ...s,
      sourceName: article?.source,
      sourceLink: article?.link ?? "",
      publishedAt: article?.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    };
  });

  return {
    company: company.name,
    runAt: opts.runAt ?? new Date().toISOString(),
    source: opts.source ?? "daily",
    headline: parsed.headline ?? "",
    signals,
  };
}
