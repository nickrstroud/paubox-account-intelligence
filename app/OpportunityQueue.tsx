"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { AccountPriority } from "@/lib/priority";
import { segmentLabel, tierLabel } from "@/lib/segments";
import { STATUS_META, daysUntil, formatCurrency } from "@/lib/score";
import { signalMatches, industryMatches } from "@/lib/match";
import { useFilters } from "./FilterContext";
import CompanyLogo from "./CompanyLogo";
import SignalCard from "./SignalCard";

const RENEWAL_WARNING_DAYS = 120;

export default function OpportunityQueue({ accounts }: { accounts: AccountPriority[] }) {
  const filters = useFilters();
  const signalFilterActive = filters.selectedScores.size > 0 || filters.updateType !== "all" || filters.period !== "all";

  const visible = useMemo(() => {
    return accounts
      .filter((a) => filters.segment === "all" || a.company.segment === filters.segment)
      .map((a) => {
        const matching = a.recentSignals.filter((r) => signalMatches(r.signal, r.at, filters));
        return { ...a, lead: signalFilterActive ? matching[0] ?? null : a.topSignal };
      })
      .filter(
        (a) =>
          !signalFilterActive ||
          a.lead != null ||
          (filters.selectedScores.size === 0 && a.industryMatches.some((i) => industryMatches(i, filters))),
      );
  }, [accounts, filters, signalFilterActive]);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-6 text-center">
        Nothing surfaced for the current filters. That&apos;s normal: most accounts are quiet most days.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {visible.map((a, idx) => {
        const status = STATUS_META[a.status];
        const renewalDays = a.company.renewalDate ? daysUntil(a.company.renewalDate) : null;
        const moreSignals = a.recentSignals.length - (a.lead ? 1 : 0);
        return (
          <li key={a.slug} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xs font-semibold text-slate-400 tabular-nums w-5 pt-0.5">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CompanyLogo website={a.company.website} />
                    <Link href={`/account/${a.slug}`} className="font-semibold text-slate-900 hover:text-brand-600 hover:underline">
                      {a.company.name}
                    </Link>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${status.classes}`}>
                      <span aria-hidden>{status.icon} </span>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {segmentLabel(a.company.segment)} · {tierLabel(a.company.tier)}
                    {a.company.arr != null && <> · {formatCurrency(a.company.arr)} ARR</>}
                    {renewalDays != null && (
                      <span className={renewalDays < RENEWAL_WARNING_DAYS ? "text-red-700 font-semibold" : ""}>
                        {" "}
                        · renews in {renewalDays}d
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0" title="Priority = signal strength × recency decay × tier, plus segment-matched industry signals">
                <p className="text-lg font-semibold text-brand-700 tabular-nums leading-none">{a.priority.toFixed(1)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">priority</p>
              </div>
            </div>

            <div className="px-4 pb-3 pl-12">
              {a.lead ? (
                <SignalCard signal={a.lead.signal} at={a.lead.at} compact />
              ) : (
                <p className="text-sm text-slate-600">
                  No direct news: surfaced by {a.industryMatches.length} industry signal
                  {a.industryMatches.length === 1 ? "" : "s"} affecting its segment.
                </p>
              )}
            </div>

            {(moreSignals > 0 || a.industryMatches.length > 0) && (
              <Link
                href={`/account/${a.slug}`}
                className="flex items-center justify-between gap-2 px-4 py-2 pl-12 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 hover:text-brand-700"
              >
                <span>
                  {moreSignals > 0 && `+${moreSignals} more signal${moreSignals === 1 ? "" : "s"}`}
                  {moreSignals > 0 && a.industryMatches.length > 0 && " · "}
                  {a.industryMatches.length > 0 &&
                    `${a.industryMatches.length} industry signal${a.industryMatches.length === 1 ? "" : "s"} for this segment`}
                </span>
                <span aria-hidden>→</span>
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
