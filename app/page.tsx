import Link from "next/link";
import { getCompanies, getIndustrySignals, getPipelineState } from "@/lib/data";
import { getAccountPriorities } from "@/lib/priority";
import { rankIndustry, withAffectedAccounts } from "@/lib/industry-view";
import { relativeDays } from "@/lib/score";
import OpportunityQueue from "./OpportunityQueue";
import IndustryFeed from "./IndustryFeed";
import QuietAccounts from "./QuietAccounts";

const DAY = 86_400_000;

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-slate-200 rounded-xl bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{detail}</p>
    </div>
  );
}

export default function Home() {
  const companies = getCompanies();
  const priorities = getAccountPriorities();
  const surfaced = priorities.filter((p) => p.surfaced);
  const quiet = priorities.filter((p) => !p.surfaced);
  const state = getPipelineState();

  const industry = getIndustrySignals();
  const industry30 = industry.filter((i) => Date.now() - new Date(i.publishedAt).getTime() <= 30 * DAY);
  const laneItems = withAffectedAccounts(rankIndustry(industry30), companies);

  const expansion = surfaced.filter((p) => p.status === "expansion").length;
  const risk = surfaced.filter((p) => p.status === "risk").length;
  const actNow = industry30.filter((i) => i.relevance === 3).length;
  const quietPct = priorities.length ? Math.round((quiet.length / priorities.length) * 100) : 0;
  const lastRun = [state.lastIndustryRunAt, ...Object.values(state.accounts).map((a) => a.lastCheckedAt)]
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Opportunity Queue</h1>
            <p className="text-sm text-slate-500">
              The agent reads the news on every account and the HIPAA landscape daily. Accounts rise here on their own
              when there&apos;s a reason to talk.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">Last agent run {relativeDays(lastRun ?? null)}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Accounts monitored" value={String(priorities.length)} detail="demo slice of a 9,000+ book" />
          <StatTile label="Surfaced now" value={String(surfaced.length)} detail={`${expansion} expansion · ${risk} at risk`} />
          <StatTile label="Industry signals (30d)" value={String(industry30.length)} detail={`${actNow} flagged act-this-week`} />
          <StatTile label="Quiet accounts" value={`${quietPct}%`} detail="no action needed, no CSM time spent" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Surfaced accounts <span className="text-slate-400 font-normal">· ranked by priority</span>
          </h2>
          <OpportunityQueue accounts={surfaced} />
        </section>

        <section className="min-w-0">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Industry signals <span className="text-slate-400 font-normal">· last 30 days</span>
            </h2>
            <Link href="/industry" className="text-[11px] text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          <IndustryFeed items={laneItems} limit={8} />
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Quiet accounts <span className="text-slate-400 font-normal">· {quiet.length}</span>
        </h2>
        <QuietAccounts accounts={quiet} />
      </section>
    </div>
  );
}
