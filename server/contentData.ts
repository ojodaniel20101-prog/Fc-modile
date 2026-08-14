import axios from "axios";
import https from "node:https";

export type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  publishedAt: string;
  sourceUrl: string;
  sourceName: "Mr. Believer Hub";
};

export type NewsArticle = NewsItem & { content: string };

export type EditorialReview = {
  id: number;
  playerName: string;
  position: string;
  rating: number;
  sourceShards: string;
  verdict: string;
  reviewPoints: string;
  publishedAt: string;
  sourceUrl: string;
  sourceName: "Mr. Believer Hub editorial review";
};

type WordPressRecord = {
  id: number;
  date: string;
  link: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  acf?: Record<string, unknown>;
};

export const WORDPRESS_SOURCE_BASES = [
  "https://mrbelieverhub.com/wp-json/wp/v2",
  "https://backup.mrbelieverhub.com/wp-json/wp/v2",
] as const;

const agent = new https.Agent({ family: 4 });
const sourceHeaders = { Accept: "application/json", "User-Agent": "curl/8.5.0" };
const TTL = 10 * 60 * 1000;
let newsCache: { expiresAt: number; items: NewsItem[] } | null = null;
const reviewCache = new Map<string, { expiresAt: number; review: EditorialReview | null }>();
const articleCache = new Map<number, { expiresAt: number; article: NewsArticle | null }>();

export function sourceUrls(path: string): string[] {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return WORDPRESS_SOURCE_BASES.map((base) => `${base}${suffix}`);
}

async function fetchSource<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (const url of sourceUrls(path)) {
    try {
      const response = await axios.get<T>(url, { timeout: 12_000, httpsAgent: agent, headers: sourceHeaders });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Public source unavailable");
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function toNumber(value: unknown): number { return Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0; }

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
}

export function mapNews(records: WordPressRecord[]): NewsItem[] {
  return records.map((record) => ({
    id: record.id,
    title: cleanText(record.title?.rendered),
    excerpt: cleanText(record.excerpt?.rendered).slice(0, 220),
    publishedAt: record.date,
    sourceUrl: record.link,
    sourceName: "Mr. Believer Hub" as const,
  })).filter((item) => item.title.length > 0);
}

export function mapNewsArticle(record: WordPressRecord): NewsArticle | null {
  const item = mapNews([record])[0];
  if (!item) return null;
  return { ...item, content: cleanText(record.content?.rendered).slice(0, 12_000) };
}

export function mapEditorialReview(record: WordPressRecord): EditorialReview | null {
  const acf = record.acf ?? {};
  const playerName = cleanText(acf.player_name);
  if (!playerName) return null;
  return {
    id: record.id,
    playerName,
    position: cleanText(acf.position),
    rating: toNumber(acf.ovr),
    sourceShards: cleanText(acf.shards),
    verdict: cleanText(acf.final_verdict).slice(0, 480),
    reviewPoints: cleanText(acf.review_points).slice(0, 650),
    publishedAt: record.date,
    sourceUrl: record.link,
    sourceName: "Mr. Believer Hub editorial review",
  };
}

export async function getNews(): Promise<NewsItem[]> {
  if (newsCache && newsCache.expiresAt > Date.now()) return newsCache.items;
  try {
    const data = await fetchSource<WordPressRecord[]>("/posts?per_page=6&page=1");
    const items = mapNews(Array.isArray(data) ? data : []);
    newsCache = { items, expiresAt: Date.now() + TTL };
    return items;
  } catch {
    return newsCache?.items ?? [];
  }
}

export async function getNewsArticle(id: number): Promise<NewsArticle | null> {
  const cached = articleCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.article;
  try {
    const data = await fetchSource<WordPressRecord>(`/posts/${id}`);
    const article = mapNewsArticle(data);
    articleCache.set(id, { article, expiresAt: Date.now() + TTL });
    return article;
  } catch {
    return cached?.article ?? null;
  }
}

export async function getEditorialReview(playerName: string): Promise<EditorialReview | null> {
  const key = normalizeName(playerName);
  const cached = reviewCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.review;
  try {
    const data = await fetchSource<WordPressRecord[]>(`/player_review?per_page=20&search=${encodeURIComponent(playerName)}`);
    const reviews = (Array.isArray(data) ? data : []).map(mapEditorialReview).filter((review): review is EditorialReview => Boolean(review));
    const review = reviews.find((item) => normalizeName(item.playerName) === key) ?? reviews[0] ?? null;
    reviewCache.set(key, { review, expiresAt: Date.now() + TTL });
    return review;
  } catch {
    return cached?.review ?? null;
  }
}
