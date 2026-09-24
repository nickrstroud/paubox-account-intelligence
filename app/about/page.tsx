const STEPS = [
  {
    n: "1",
    title: "Watch every account, cheaply",
    body: "Each day the agent pulls recent news for every account from Google News RSS. Articles it has already analyzed are skipped, so a quiet account costs one free RSS request and zero model calls.",
  },
  {
    n: "2",
    title: "Only call Claude when something is new",
    body: "New articles go to Claude Haiku with a Paubox-specific rubric. It ignores namesakes and noise, and returns a score (−2 risk to +2 opportunity), an update type, and a concrete Paubox play with a next step.",
  },
  {
    n: "3",
    title: "Watch the industry, not just the accounts",
    body: "A second pass reads The HIPAA Journal, the Federal Register (HHS and CMS rules), and topic searches for breaches, OCR enforcement, and state privacy laws. Claude keeps only items a CSM could act on and tags the segments each one affects.",
  },
  {
    n: "4",
    title: "Rank, don't list",
    body: "Every signal gets a weight by strength, decays with a 14-day half-life, and is multiplied by account value: the ARR band, with a bump for accounts inside the 90-day renewal window. Segment-wide industry news nudges ranking but can't surface an account alone. Accounts above the threshold rise into the queue on their own; the rest stay quiet.",
  },
  {
    n: "5",
    title: "Persist and publish",
    body: "A scheduled GitHub Action commits results back to the repo (the git history is the audit trail), and Vercel redeploys this static dashboard automatically.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">How it works</h1>
        <p className="text-sm text-slate-600 mt-1">
          A CS team covering 9,000+ healthcare customers can&apos;t run account plans for all of them. Most accounts
          are healthy and quiet on any given day. This agent does the reading, then surfaces the handful with a real
          reason to talk: expand, protect the renewal, or turn into an advocate.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="shrink-0 w-7 h-7 rounded-full bg-brand-500 text-white text-sm font-semibold flex items-center justify-center">
              {s.n}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{s.title}</h2>
              <p className="text-sm text-slate-600 mt-0.5">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Priority formula</h2>
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3 overflow-x-auto text-slate-700">
{`priority = value × ( Σ signal_weight × 0.5^(age_days / 14)
                   + Σ named_industry_mentions
                   + min(segment_industry_boost, 1.3) )

signal_weight:  +2 → 10   +1 → 5   0 → 0.5   −1 → 6   −2 → 12
                (brand/press × 0.5; a −2 in the last 45 days flags "At risk")
value:          ARR >$25k 1.5   >$10k 1.25   >$3k 1.1   else 1.0
                × 1.25 if renewing within 90 days
surfaces at:    priority ≥ 3`}
        </pre>
      </section>

      <section className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">What it costs at Paubox scale</h2>
        <p className="text-sm text-slate-600">
          News fetches are free. Claude Haiku costs roughly a cent per account that has new coverage. If 5% of 9,000
          accounts have news on a given day, that&apos;s about 450 calls, or a few dollars a day. The industry pass is a
          handful of batched calls no matter how many accounts there are.
        </p>
      </section>

      <section className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">What production would add</h2>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          <li>
            HubSpot as the account source of truth (segment, ARR, renewal, owner, product mix), plus signals written back as
            tasks on the owning CSM&apos;s queue
          </li>
          <li>First-party signals: seat changes, login and send volume, support tickets, NPS</li>
          <li>Routing rules: enterprise to named CSMs, the long tail to a pooled or digital-touch motion</li>
          <li>
            A shared feedback loop. The 👍 Useful / 👎 Noise buttons on each signal work today, but votes stay in your
            browser. In production they&apos;d be stored centrally: signal types that CSMs keep marking as noise would
            lose weight in the priority formula, and recent labeled examples would go into Claude&apos;s prompt, so
            the agent learns the team&apos;s judgment. &quot;Agent precision&quot; (percent marked useful) becomes the
            metric for the agent itself.
          </li>
        </ul>
      </section>
    </div>
  );
}
