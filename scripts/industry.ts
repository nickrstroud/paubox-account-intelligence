import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fetchFederalRegister, fetchNews, fetchRss, type NewsItem } from "./fetch-news.ts";
import { DATA_DIR, dedupe, loadCompanies, loadState, saveState, writeJson } from "./common.ts";
import { MODEL } from "./analyze.ts";
import { PAUBOX_CONTEXT, PLAY_ENUM, SEGMENT_ENUM, SEGMENT_TEXT, TAXONOMY_TEXT, UPDATE_TYPE_ENUM } from "./paubox-context.ts";
import type { Company, IndustrySignal } from "../lib/types.ts";

// Industry lane: sector-wide news (breaches, OCR enforcement, HIPAA/state
// privacy rules, CMS interoperability) that rarely names a customer but
// creates a reason to call every account in a segment.

const client = new Anthropic();
const INDUSTRY_FILE = path.join(DATA_DIR, "industry.json");
const BATCH_SIZE = 15;

const TOPIC_QUERIES = [
  '"HIPAA" (settlement OR "Office for Civil Rights")',
  '"HIPAA Security Rule"',
  'healthcare (phishing OR "business email compromise")',
  'healthcare "email" breach patients',
  '"health data" privacy law state',
  'CMS interoperability rule',
  'healthcare ransomware attack',
  'HIPAA compliant email marketing',
];

const SYSTEM_PROMPT = `You are an industry analyst supporting a customer success team.
You receive a batch of healthcare industry news items. Keep ONLY items that give a CSM a
concrete reason to reach out to customers in a segment (or a named account). Drop
everything else — generic listicles, vendor marketing, items unrelated to healthcare
data, email, security, privacy, compliance, or patient communication.

${PAUBOX_CONTEXT}

Good reasons to keep an item:
- A breach or phishing/BEC/ransomware incident at a healthcare org (a peer-pressure
  talking point for the whole segment; email-related incidents are the strongest)
- OCR/HHS/state AG enforcement actions and settlements (especially phishing/email/risk
  analysis failures)
- Proposed or final rules: HIPAA Privacy/Security Rule changes, state health-data privacy
  laws, CMS interoperability/patient-access rules, FTC health breach rules, AI/telehealth
  rules touching patient communications
- Threat intel showing attacks on a healthcare segment
- Market shifts that change how providers communicate with patients

Be selective. The connection to email security, PHI in email, patient communication,
or HIPAA compliance must be direct. If you have to stretch to connect it to Paubox,
drop it. Breaches only qualify when email/phishing/BEC is involved or they are large
(100k+ individuals) or they are in a segment trend worth naming.

For each kept item:
- relevance — use 3 sparingly (no more than 1-2 items per batch, often zero):
  3 = act this week: a final/proposed HIPAA or state rule with a compliance deadline, an
      OCR/AG enforcement action over phishing/email/risk analysis, or a major
      email-driven breach
  2 = worth a proactive touch to the affected segment
  1 = background context
- segments: only segments DIRECTLY affected. A breach at a dermatology clinic affects
  "specialty_practice", not every segment. Tag all segments only for truly universal items (e.g. a
  HIPAA Security Rule change). Segments:
${SEGMENT_TEXT}
- mentionedAccounts: exact names from the provided account list ONLY if that exact
  organization is named in the item. Similar or same-industry organizations do NOT count.
  Usually empty.
- pauboxAngle: 1-2 sentences on why this matters for a Paubox customer conversation.
- summary: 1-2 sentences, factual.

${TAXONOMY_TEXT}`;

const RECORD_TOOL: Anthropic.Tool = {
  name: "record_industry_signals",
  description: "Record the industry items worth surfacing to the CS team.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", description: "The [n] index of the item" },
            updateType: { type: "string", enum: UPDATE_TYPE_ENUM },
            relevance: { type: "integer", enum: [1, 2, 3] },
            summary: { type: "string" },
            pauboxAngle: { type: "string" },
            play: { type: "string", enum: PLAY_ENUM },
            segments: { type: "array", items: { type: "string", enum: SEGMENT_ENUM } },
            mentionedAccounts: { type: "array", items: { type: "string" } },
          },
          required: ["index", "updateType", "relevance", "summary", "pauboxAngle", "play", "segments", "mentionedAccounts"],
        },
      },
    },
    required: ["items"],
  },
};

async function analyzeBatch(batch: NewsItem[], companies: Company[]): Promise<IndustrySignal[]> {
  const accountList = companies.map((c) => c.name).join("; ");
  const itemBlock = batch
    .map((n, i) => `[${i}] ${n.title} (${n.source}, ${n.publishedAt})\n${n.snippet}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    tools: [RECORD_TOOL],
    tool_choice: { type: "tool", name: "record_industry_signals" },
    messages: [{ role: "user", content: `Account list: ${accountList}\n\nNews items:\n\n${itemBlock}` }],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];
  const parsed = toolUse.input as { items?: any[] };
  const names = new Set(companies.map((c) => c.name));
  const now = new Date().toISOString();

  return (parsed.items ?? [])
    .filter((it) => batch[it.index])
    .map((it) => {
      const src = batch[it.index];
      const published = new Date(src.publishedAt);
      return {
        id: Buffer.from(src.link).toString("base64url").slice(-24),
        title: src.title.replace(/\s+-\s+[^-]+$/, ""),
        link: src.link,
        sourceName: src.source,
        publishedAt: Number.isNaN(published.getTime()) ? now : published.toISOString(),
        analyzedAt: now,
        updateType: it.updateType,
        relevance: it.relevance,
        summary: it.summary,
        pauboxAngle: it.pauboxAngle,
        play: it.play,
        segments: it.segments ?? [],
        // Hard guard: a named mention outweighs a direct signal in ranking, so
        // the account's name must literally appear in the item.
        mentionedAccounts: (it.mentionedAccounts ?? []).filter(
          (n: string) => names.has(n) && `${src.title} ${src.snippet}`.toLowerCase().includes(n.toLowerCase()),
        ),
      };
    });
}

export interface IndustryOptions {
  hipaaJournalPages: number;
  topicWindow: string; // Google News `when:` value, e.g. "7d"
  fedRegDaysBack: number;
}

async function safe<T>(label: string, p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch (err) {
    console.error(`  ${label} failed: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

export async function runIndustry(opts: IndustryOptions) {
  const companies = await loadCompanies();
  const state = await loadState();
  const seen = new Set(state.industrySeenLinks);

  console.log("Industry: fetching sources...");
  const sources: NewsItem[] = [];
  for (let p = 1; p <= opts.hipaaJournalPages; p++) {
    const url = p === 1 ? "https://www.hipaajournal.com/feed/" : `https://www.hipaajournal.com/feed/?paged=${p}`;
    sources.push(...(await safe("HIPAA Journal", fetchRss(url, "The HIPAA Journal"))));
  }
  for (const q of TOPIC_QUERIES) {
    sources.push(...(await safe(`Google News "${q}"`, fetchNews(`${q} when:${opts.topicWindow}`, 15))));
  }
  const since = new Date(Date.now() - opts.fedRegDaysBack * 86_400_000).toISOString();
  sources.push(...(await safe("Federal Register", fetchFederalRegister(since))));

  const fresh = dedupe(sources).filter((n) => n.link && !seen.has(n.link));
  console.log(`Industry: ${sources.length} fetched, ${fresh.length} new to analyze`);

  const existing: IndustrySignal[] = JSON.parse(await readFile(INDUSTRY_FILE, "utf-8").catch(() => "[]"));
  const existingKeys = new Set(existing.map((e) => e.link));
  let added = 0;

  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    try {
      const signals = await analyzeBatch(batch, companies);
      for (const s of signals) {
        if (existingKeys.has(s.link)) continue;
        existing.push(s);
        existingKeys.add(s.link);
        added++;
      }
      batch.forEach((b) => seen.add(b.link));
      console.log(`  batch ${i / BATCH_SIZE + 1}: kept ${signals.length}/${batch.length}`);
    } catch (err) {
      console.error(`  batch ${i / BATCH_SIZE + 1} failed:`, err instanceof Error ? err.message : err);
    }
  }

  existing.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  await writeJson(INDUSTRY_FILE, existing);

  // Reload state: account runs may have written to it concurrently.
  const latest = await loadState();
  latest.industrySeenLinks = [...seen].slice(-3000);
  latest.lastIndustryRunAt = new Date().toISOString();
  await saveState(latest);
  console.log(`Industry: ${added} new signal(s) saved`);
}

if (import.meta.main) {
  runIndustry({ hipaaJournalPages: 2, topicWindow: "7d", fedRegDaysBack: 14 });
}
