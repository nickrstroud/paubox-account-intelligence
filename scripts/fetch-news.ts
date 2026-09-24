import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  snippet: string;
}

const parser = new XMLParser({ ignoreAttributes: false });
const UA = { "User-Agent": "Mozilla/5.0 (paubox-account-intelligence)" };

function toList(items: unknown): any[] {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function stripHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#8230;|&hellip;/g, "…")
    .replace(/&#38;|&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/\s+/g, " ")
    .trim();
}

// Google News RSS — free, keyless. `when:` / `after:` operators in the query
// bound the window; the RSS returns up to ~100 items.
export async function fetchNews(query: string, maxItems = 10): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`news fetch failed for "${query}": ${res.status}`);

  const parsed = parser.parse(await res.text());
  return toList(parsed?.rss?.channel?.item)
    .slice(0, maxItems)
    .map((item: any) => ({
      title: String(item.title ?? ""),
      source: String(item.source?.["#text"] ?? item.source ?? "unknown"),
      link: String(item.link ?? ""),
      publishedAt: String(item.pubDate ?? ""),
      snippet: stripHtml(item.description),
    }));
}

// Any standard RSS 2.0 feed (e.g. HIPAA Journal). Unlike Google News, links
// are direct article URLs.
export async function fetchRss(url: string, sourceName: string): Promise<NewsItem[]> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`rss fetch failed for ${url}: ${res.status}`);
  const parsed = parser.parse(await res.text());
  return toList(parsed?.rss?.channel?.item).map((item: any) => ({
    title: stripHtml(item.title),
    source: sourceName,
    link: String(item.link ?? ""),
    publishedAt: String(item.pubDate ?? ""),
    snippet: stripHtml(item.description).slice(0, 400),
  }));
}

// Federal Register API — free, keyless. Formal HHS/CMS rules and proposed
// rules; broad on purpose, since the model discards anything not relevant.
export async function fetchFederalRegister(sinceIso: string, perPage = 25): Promise<NewsItem[]> {
  const params = new URLSearchParams();
  params.set("conditions[term]", 'HIPAA | "protected health information" | interoperability | "information blocking" | cybersecurity');
  params.append("conditions[agencies][]", "health-and-human-services-department");
  params.append("conditions[agencies][]", "centers-for-medicare-medicaid-services");
  params.append("conditions[type][]", "RULE");
  params.append("conditions[type][]", "PRORULE");
  params.set("conditions[publication_date][gte]", sinceIso.slice(0, 10));
  params.set("order", "newest");
  params.set("per_page", String(perPage));
  for (const f of ["title", "publication_date", "html_url", "abstract", "type"]) params.append("fields[]", f);

  const res = await fetch(`https://www.federalregister.gov/api/v1/documents.json?${params}`, { headers: UA });
  if (!res.ok) throw new Error(`Federal Register fetch failed: ${res.status}`);
  const data = (await res.json()) as { results?: any[] };
  return (data.results ?? []).map((r) => ({
    title: String(r.title),
    source: `Federal Register (${r.type})`,
    link: String(r.html_url),
    publishedAt: String(r.publication_date),
    snippet: String(r.abstract ?? "").slice(0, 500),
  }));
}
