import type { AccountSignal, Company, IndustrySignal } from "./types";
import { getCompanies, getCompanyHistory, getIndustrySignals, getPipelineState, slugify } from "./data";
import { tierWeight } from "./segments";

// How the Opportunity Queue ranks thousands of mostly-quiet accounts:
// every signal contributes weight by strength, decays with age, and is
// multiplied by account tier. Industry signals add a smaller boost to every
// account in an affected segment. Accounts above SURFACE_THRESHOLD rise into
// the queue on their own; everything else stays in the quiet table.

const HALF_LIFE_DAYS = 14;
const LOOKBACK_DAYS = 90;
const INDUSTRY_WINDOW_DAYS = 30;
const SEGMENT_BOOST = 0.5; // per relevance point of a segment-matched industry signal
// Segment-wide news boosts ranking but can't surface an account on its own —
// otherwise one big HIPAA rule would flood the queue with every account.
const SEGMENT_BOOST_CAP = 1.8; // × enterprise 1.5 = 2.7, still under the threshold
const MENTION_WEIGHT = 10; // an industry item that names the account counts like a direct signal
export const SURFACE_THRESHOLD = 3;

const SCORE_WEIGHT: Record<number, number> = { 2: 10, 1: 5, 0: 0.5, [-1]: 6, [-2]: 12 };
// Press and awards are real (advocacy asks) but shouldn't outrank a lawsuit or an acquisition.
const TYPE_MULTIPLIER: Record<string, number> = { brand: 0.5 };
// A strong risk this recent keeps the account flagged at risk, even if newer good news outweighs it.
const RISK_STICKY_DAYS = 45;

function ageDays(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function decay(iso: string): number {
  return Math.pow(0.5, ageDays(iso) / HALF_LIFE_DAYS);
}

export interface RankedSignal {
  signal: AccountSignal;
  at: string;
  weight: number;
}

export interface AccountPriority {
  company: Company;
  slug: string;
  priority: number;
  surfaced: boolean;
  status: "expansion" | "risk" | "watch" | "quiet";
  topSignal: RankedSignal | null;
  recentSignals: RankedSignal[];
  industryMatches: IndustrySignal[];
  lastSignalAt: string | null;
  lastCheckedAt: string | null;
}

// A signal's own article date when known, else the run it was found in.
function signalDate(s: AccountSignal, runAt: string): string {
  return s.publishedAt && !Number.isNaN(Date.parse(s.publishedAt)) ? s.publishedAt : runAt;
}

export function industryMatchesFor(company: Company, industry: IndustrySignal[]): IndustrySignal[] {
  return industry.filter(
    (i) =>
      i.mentionedAccounts.includes(company.name) ||
      (company.segment != null && i.segments.includes(company.segment)),
  );
}

export function getAccountPriorities(): AccountPriority[] {
  const industry = getIndustrySignals().filter((i) => ageDays(i.publishedAt) <= INDUSTRY_WINDOW_DAYS);
  const state = getPipelineState();

  return getCompanies()
    .map((company) => {
      const slug = slugify(company.name);
      const history = getCompanyHistory(slug);

      const recentSignals: RankedSignal[] = history
        .flatMap((run) => run.signals.map((signal) => ({ signal, at: signalDate(signal, run.runAt) })))
        .filter((r) => ageDays(r.at) <= LOOKBACK_DAYS)
        .map((r) => ({
          ...r,
          weight: SCORE_WEIGHT[r.signal.score] * (TYPE_MULTIPLIER[r.signal.updateType ?? ""] ?? 1) * decay(r.at),
        }))
        .sort((a, b) => b.weight - a.weight);

      const industryMatches = industryMatchesFor(company, industry);
      let mentionWeight = 0;
      let segmentWeight = 0;
      for (const i of industryMatches) {
        if (i.mentionedAccounts.includes(company.name)) mentionWeight += MENTION_WEIGHT * decay(i.publishedAt);
        else segmentWeight += SEGMENT_BOOST * i.relevance * decay(i.publishedAt);
      }
      const industryWeight = mentionWeight + Math.min(segmentWeight, SEGMENT_BOOST_CAP);

      const signalWeight = recentSignals.reduce((sum, r) => sum + r.weight, 0);
      const priority = Math.round((signalWeight + industryWeight) * tierWeight(company.tier) * 10) / 10;
      let topSignal = recentSignals[0] ?? null;
      const surfaced = priority >= SURFACE_THRESHOLD;

      let status: AccountPriority["status"] = "quiet";
      if (surfaced) {
        const riskWeight = recentSignals.filter((r) => r.signal.score < 0).reduce((sum, r) => sum + r.weight, 0);
        const upWeight = recentSignals.filter((r) => r.signal.score > 0).reduce((sum, r) => sum + r.weight, 0);
        const recentStrongRisk = recentSignals.some((r) => r.signal.score === -2 && ageDays(r.at) <= RISK_STICKY_DAYS);
        if (recentStrongRisk || (riskWeight > 0 && riskWeight >= upWeight)) {
          status = "risk";
          topSignal = recentSignals.find((r) => r.signal.score < 0) ?? topSignal;
        }
        else if (upWeight > 0) status = "expansion";
        else status = "watch";
      }

      const allDates = history.flatMap((run) => run.signals.map((s) => signalDate(s, run.runAt)));
      const lastSignalAt = allDates.length
        ? allDates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
        : null;

      return {
        company,
        slug,
        priority,
        surfaced,
        status,
        topSignal,
        recentSignals,
        industryMatches,
        lastSignalAt,
        lastCheckedAt: state.accounts[slug]?.lastCheckedAt ?? null,
      };
    })
    .sort((a, b) => b.priority - a.priority || a.company.name.localeCompare(b.company.name));
}
