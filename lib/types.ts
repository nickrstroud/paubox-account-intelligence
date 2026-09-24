// Shared shapes for the pipeline (scripts/) and the dashboard (app/).

export interface Company {
  name: string;
  website: string;
  segment?: string; // lib/segments.ts SEGMENT_OPTIONS value
  segmentInferred?: boolean; // true when scripts/enrich.ts filled it in
  newsQuery?: string; // defaults to "\"<name>\""
  // Illustrative demo fields, not real account data.
  arr?: number; // USD
  renewalDate?: string; // "YYYY-MM-DD"
}

export interface AccountSignal {
  category: string;
  updateType?: string;
  score: -2 | -1 | 0 | 1 | 2;
  summary: string;
  suggestedAction: string;
  play?: string; // lib/filters.ts PLAY_OPTIONS value
  sourceName?: string;
  sourceLink: string;
  publishedAt?: string;
}

export interface CompanyAnalysis {
  company: string;
  runAt: string;
  headline: string;
  signals: AccountSignal[];
  source?: "daily" | "backfill";
}

export interface IndustrySignal {
  id: string;
  title: string;
  link: string;
  sourceName: string;
  publishedAt: string;
  analyzedAt: string;
  updateType: string;
  relevance: 1 | 2 | 3; // 3 = act on it this week
  summary: string;
  pauboxAngle: string; // why it matters for a Paubox CS conversation
  play: string;
  segments: string[]; // SEGMENT_OPTIONS values it affects
  mentionedAccounts: string[]; // exact names from companies.json
}

// Pipeline bookkeeping — what's already been sent to Claude, so daily runs
// only pay for genuinely new articles.
export interface PipelineState {
  accounts: Record<string, { lastCheckedAt: string; seenLinks: string[] }>;
  industrySeenLinks: string[];
  lastIndustryRunAt?: string;
}
