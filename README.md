# Signal Desk · Paubox CS

An always-on agent that watches a high-volume healthcare customer base and the HIPAA
landscape, and brings the few accounts worth a conversation to the top. It's an
independent demo built for the Paubox Director of Customer Success interview, adapted
from an earlier 8-account enterprise dashboard, and isn't affiliated with Paubox.

The design premise: a CS team covering 9,000+ customers can't run account plans for all
of them. Most accounts are quiet on any given day. The agent does the reading and ranks
the rest.

## How it works

1. **Accounts** (`scripts/run.ts`): daily Google News RSS check per account. Articles
   already analyzed are skipped (`data/state.json`), so a quiet account costs one free
   RSS request and no model call.
2. **Analysis** (`scripts/analyze.ts`): new articles go to Claude Haiku 4.5 with a
   Paubox-specific rubric. It returns a score (−2 risk to +2 opportunity), an update type,
   a Paubox play (Inbound Security, DLP, Archiving, Marketing, Forms, Email API, seats,
   retention, advocacy), and a concrete next step. Source links come from our own article
   list, never from model output.
3. **Industry lane** (`scripts/industry.ts`): The HIPAA Journal RSS, the Federal Register
   API (HHS/CMS rules), and Google News topic searches (breaches, OCR enforcement, state
   privacy laws, CMS interoperability). Claude keeps only items a CSM could act on, rates
   relevance 1–3, and tags the affected segments. Named-account mentions are verified in
   code against the article text.
4. **Ranking** (`lib/priority.ts`): signal weight × 14-day half-life decay × tier, plus a
   capped segment boost from industry signals. Accounts at priority ≥ 3 surface in the
   Opportunity Queue; the rest go to the quiet table. See `/about` on the site.
5. **Enrichment** (`scripts/enrich.ts`): infers segment, tier, and a disambiguated news
   query for accounts that don't have them. It never overwrites values you supplied.
6. **Schedule**: GitHub Actions runs daily and commits `data/` back to the repo. Vercel
   redeploys the static Next.js site on each commit.

## Setup

```bash
bun install
cp .env.local.example .env.local      # add ANTHROPIC_API_KEY
# edit data/companies.json (see schema below)
bun run enrich      # fill in missing segment / tier / newsQuery
bun run backfill    # ~3 months of account + industry history
bun run run         # one daily run
bun --bun next dev  # preview locally
```

## Company schema

Only `name` and `website` are required.

```json
{
  "name": "Example Family Dental",
  "website": "https://example.com/",
  "segment": "dental",
  "tier": "smb",
  "newsQuery": "\"Example Family Dental\"",
  "products": ["Email Suite"],
  "arr": 4800,
  "renewalDate": "2027-01-01"
}
```

Segments and tiers are defined in `lib/segments.ts`. `products`, `arr`, and
`renewalDate` are illustrative demo values.

## Cost

News is free. Haiku is about $0.01 per account with new coverage. At Paubox scale (9,000
accounts, ~5% with news on a given day) that's a few dollars a day. The industry pass is
a handful of batched calls regardless of account count.
