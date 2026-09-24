export const SENTIMENT_OPTIONS = [
  { score: 2 as const, label: "Strong Opportunity" },
  { score: 1 as const, label: "Opportunity" },
  { score: 0 as const, label: "Neutral" },
  { score: -1 as const, label: "Risk" },
  { score: -2 as const, label: "Strong Risk" },
];

// Single source of truth for the update-type taxonomy — imported by both
// scripts/analyze.ts + scripts/industry.ts (constrains the model's
// classification via the tool schema enum) and the dashboard filter UI, so the
// two can't drift apart. Shared by account signals and industry signals.
export const UPDATE_TYPE_OPTIONS = [
  { value: "security", label: "Breach / Security Incident" },
  { value: "regulatory", label: "Regulatory & Compliance" },
  { value: "enforcement", label: "Enforcement & Litigation" },
  { value: "expansion", label: "Growth & Expansion" },
  { value: "ma", label: "M&A" },
  { value: "technology", label: "Technology Change" },
  { value: "leadership", label: "Leadership Change" },
  { value: "restructuring", label: "Restructuring" },
  { value: "competitive", label: "Competitive" },
  { value: "brand", label: "Brand & Press" },
];

export function updateTypeLabel(value: string | undefined): string | null {
  if (!value) return null;
  return UPDATE_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? null;
}

// The Paubox motion a signal points toward. Also a model enum, so every
// suggested action maps to a concrete, filterable play.
export const PLAY_OPTIONS = [
  { value: "inbound_security", label: "Inbound Security upgrade" },
  { value: "dlp", label: "Data Loss Prevention" },
  { value: "archiving", label: "Email Archiving" },
  { value: "marketing", label: "Paubox Marketing" },
  { value: "forms", label: "Paubox Forms" },
  { value: "email_api", label: "Email API" },
  { value: "seat_expansion", label: "Seat / site expansion" },
  { value: "retention", label: "Retention / save motion" },
  { value: "advocacy", label: "Advocacy / case study" },
  { value: "none", label: "Awareness only" },
];

export function playLabel(value: string | undefined): string | null {
  if (!value || value === "none") return null;
  return PLAY_OPTIONS.find((p) => p.value === value)?.label ?? null;
}

export const PERIOD_OPTIONS = [
  { value: "all", label: "All time", days: null as number | null },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 3 months", days: 90 },
];

export function withinPeriod(dateIso: string, periodValue: string): boolean {
  const period = PERIOD_OPTIONS.find((p) => p.value === periodValue);
  if (!period || period.days === null) return true;
  const cutoffMs = Date.now() - period.days * 24 * 60 * 60 * 1000;
  return new Date(dateIso).getTime() >= cutoffMs;
}
