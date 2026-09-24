import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, getCompanyBySlug, getCompanyHistory, slugify } from "@/lib/data";
import { getAccountPriorities } from "@/lib/priority";
import { withAffectedAccounts, rankIndustry } from "@/lib/industry-view";
import { segmentLabel, tierLabel } from "@/lib/segments";
import { STATUS_META, daysUntil, formatCurrency, formatDate, relativeDays } from "@/lib/score";
import AccountTimeline from "./AccountTimeline";
import CompanyLogo from "@/app/CompanyLogo";
import IndustryFeed from "@/app/IndustryFeed";

const RENEWAL_WARNING_DAYS = 120;

export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: slugify(c.name) }));
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5">{children}</dd>
    </div>
  );
}

export default async function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  const history = getCompanyHistory(slug).filter((r) => r.signals.length > 0);
  const ranked = getAccountPriorities();
  const p = ranked.find((a) => a.slug === slug)!;
  const rank = ranked.filter((a) => a.surfaced).findIndex((a) => a.slug === slug) + 1;
  const status = STATUS_META[p.status];
  const industryItems = withAffectedAccounts(rankIndustry(p.industryMatches), getCompanies());
  const renewalDays = company.renewalDate ? daysUntil(company.renewalDate) : null;

  return (
    <div className="space-y-8">
      <Link href="/" className="text-xs text-slate-500 hover:text-brand-700">
        ← Opportunity Queue
      </Link>

      <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CompanyLogo website={company.website} size={26} />
              <h1 className="text-xl font-semibold text-slate-900">{company.name}</h1>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${status.classes}`}>
                <span aria-hidden>{status.icon} </span>
                {status.label}
              </span>
            </div>
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
            >
              {company.website}
            </a>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-brand-700 tabular-nums leading-none">{p.priority.toFixed(1)}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {p.surfaced ? `priority · #${rank} in queue` : "priority · below surfacing threshold"}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5 pt-4 border-t border-slate-100">
          <Fact label="Segment">
            {segmentLabel(company.segment)}
            {company.segmentInferred && <span className="text-slate-400 text-xs"> (inferred)</span>}
          </Fact>
          <Fact label="Tier">{tierLabel(company.tier)}</Fact>
          <Fact label="Paubox products">{company.products?.length ? company.products.join(", ") : "—"}</Fact>
          <Fact label="ARR">{company.arr != null ? formatCurrency(company.arr) : "—"}</Fact>
          <Fact label="Renewal">
            {company.renewalDate && renewalDays != null ? (
              <span className={renewalDays < RENEWAL_WARNING_DAYS ? "text-red-700 font-semibold" : ""}>
                {formatDate(company.renewalDate + "T12:00:00Z")} ({renewalDays}d)
              </span>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Last checked">{relativeDays(p.lastCheckedAt)}</Fact>
        </dl>
        {(company.arr != null || company.renewalDate) && (
          <p className="text-[10px] text-slate-400 mt-3">ARR, products, and renewal date are illustrative demo values.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Account signals</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-6 text-center">
              No account-specific signals yet. The agent checks this account&apos;s news daily.
            </p>
          ) : (
            <AccountTimeline history={history} />
          )}
        </section>
        <section className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Industry context <span className="text-slate-400 font-normal">· {segmentLabel(company.segment)}</span>
          </h2>
          {industryItems.length === 0 ? (
            <p className="text-sm text-slate-500">No segment-level signals in the last 30 days.</p>
          ) : (
            <IndustryFeed items={industryItems} limit={10} />
          )}
        </section>
      </div>
    </div>
  );
}
