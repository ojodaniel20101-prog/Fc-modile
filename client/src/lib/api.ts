/*
 * FC MOBILE 26 — data layer
 * Players from https://backup.mrbelieverhub.com/wp-json/wp/v2/players_database (ACF CPT)
 * News from https://backup.mrbelieverhub.com/wp-json/wp/v2/posts
 * Cached in localStorage. All client-side.
 */

const API_BASE = "https://backup.mrbelieverhub.com/wp-json/wp/v2";

export type CoreStatKey = "PAC" | "SHO" | "PAS" | "DRI" | "DEF" | "PHY";

export interface Player {
  postId: number;
  sourceId: string;
  id: string;
  name: string;
  shortName: string;
  position: string;
  altPositions: string;
  program: string;
  rating: number;
  team: string;
  club: string;
  league: string;
  nation: string;
  skillMoves: string;
  strongWeakFoot: string;
  height: string;
  weight: string;
  workRate: string;
  image: string;
  imageUrl: string;
  teamLogo: string;
  clubBadgeUrl: string;
  nationFlag: string;
  nationBadgeUrl: string;
  leagueLogo: string;
  textColourCode: string;
  stats: Record<string, number>;
  details: Record<string, number>;
}
export interface NewsItem {
  id: number;
  title: string;
  link: string;
  date: string;
  excerpt: string;
  image: string;
}

export interface ACF {
  [key: string]: unknown;
}

export interface WPItem {
  id: number;
  title: { rendered: string };
  link: string;
  date: string;
  excerpt?: { rendered: string };
  acf?: ACF;
  _embedded?: {
    "wp:featured_media"?: { source_url: string }[];
  };
}

const statKeys = [
  "pace",
  "acceleration",
  "sprint_speed",
  "shooting",
  "finishing",
  "long_shot",
  "shot_power",
  "positioning",
  "volley",
  "penalties",
  "passing",
  "short_passing",
  "long_passing",
  "vision",
  "crossing",
  "curve",
  "free_kick",
  "dribbling",
  "dribbling_2",
  "balance",
  "agility",
  "reactions",
  "ball_control",
  "defending",
  "marking",
  "standing_tackle",
  "sliding_tackle",
  "awareness",
  "heading",
  "physical",
  "strength",
  "aggression",
  "jumping",
  "stamina",
  "gk_diving",
  "gk_reflexes",
  "gk_kicking",
  "gk_handling",
];

export function parseAcfToPlayer(postId: number, acf: ACF): Player {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown) => (typeof v === "string" && /^\d+(?:\.\d+)?$/.test(v.trim()) ? Number(v.trim()) : 0);
  const img = (v: unknown) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : "");
  const stats: Record<string, number> = {};
  for (const k of statKeys) {
    if (acf[k]) stats[k] = num(acf[k]);
  }
  const team = str(acf["team"] ?? acf["club"] ?? "");
  const imageUrl = img(acf["image_url"] ?? acf["player_image"]);
  const clubBadgeUrl = img(acf["club_badge_url"] ?? acf["team_logo"]);
  const nationBadgeUrl = img(acf["nation_badge_url"] ?? acf["nation_flag"]);
  return {
    postId,
    sourceId: str(acf["source_id"] ?? acf["id"] ?? postId),
    id: str(acf["id"] ?? ""),
    name: str(acf["player_name"] ?? ""),
    shortName: str(acf["short_name"] ?? ""),
    position: str(acf["position"] ?? ""),
    altPositions: str(acf["alt_positions"] ?? ""),
    program: str(acf["program"] ?? ""),
    rating: num(acf["rating"]),
    team,
    club: team,
    league: str(acf["league"] ?? ""),
    nation: str(acf["nation"] ?? ""),
    skillMoves: str(acf["skill_moves"] ?? ""),
    strongWeakFoot: str(acf["strongweak_foot"] ?? ""),
    height: str(acf["height"] ?? ""),
    weight: str(acf["weight"] ?? ""),
    workRate: str(acf["work_rate"] ?? ""),
    image: imageUrl,
    imageUrl,
    teamLogo: clubBadgeUrl,
    clubBadgeUrl,
    nationFlag: nationBadgeUrl,
    nationBadgeUrl,
    leagueLogo: img(acf["league_logo"]),
    textColourCode: str(acf["text_colour_code"] ?? ""),
    stats,
    details: {},
  };
}

const playersCacheKey = "fc26.players.v2";
const newsCacheKey = "fc26.news.v2";
const cacheTtl = 24 * 60 * 60 * 1000; // 24h

interface Cached<T> {
  ts: number;
  data: T;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const c: Cached<T> = JSON.parse(raw);
    return Date.now() - c.ts < cacheTtl ? c.data : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

/** Parse one players page (WP JSON uses HTML-escaped strings inside acf strings). */
function parsePlayersPage(items: WPItem[]): Player[] {
  const out: Player[] = [];
  for (const item of items) {
    const acf = item.acf;
    if (!acf || !acf["player_name"]) continue;
    const player = parseAcfToPlayer(item.id, acf);
    if (!player.name || !player.rating) continue;
    out.push(player);
  }
  return out;
}

/**
 * Fetch players. Tries cache first, then fetches up to `pages` pages
 * (100/page, max ~500 players) for a useful tool database.
 */
export async function fetchPlayers(pages = 5): Promise<Player[]> {
  const cached = readCache<Player[]>(playersCacheKey);
  if (cached) return cached;
  const url = (p: number) =>
    `${API_BASE}/players_database?per_page=100&page=${p}`;
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => i + 1).map(async (p) => {
      try {
        const res = await fetch(url(p), { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return [] as WPItem[];
        return (await res.json()) as WPItem[];
      } catch {
        return [] as WPItem[];
      }
    }),
  );
  const players = results.flatMap(parsePlayersPage);
  if (players.length > 0) writeCache(playersCacheKey, players);
  return players;
}

/* ---------- Player render image lookup (cached scraper) ---------- */

const renderCacheKey = "fc26.renders.v1";
const renderCacheTtl = 24 * 60 * 60 * 1000; // 24 hours

function readRenderCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(renderCacheKey);
    if (!raw) return {};
    const c = JSON.parse(raw) as { ts: number; data: Record<string, string> };
    if (Date.now() - c.ts > renderCacheTtl) return {};
    return c.data;
  } catch {
    return {};
  }
}

function writeRenderCache(map: Record<string, string>) {
  try {
    localStorage.setItem(renderCacheKey, JSON.stringify({ ts: Date.now(), data: map }));
  } catch {
    /* ignore */
  }
}

/**
 * Extract the searchable last-name token from a player.
 * "Miguel Almirón" -> "Almiron" (accents stripped so search matches ASCII filenames)
 */
/**
 * Fetch player render image from our scraper cache.
 * Falls back to on-demand scraping if not cached.
 */
export async function fetchPlayerRender(player: Player): Promise<string> {
  // imageUrl is already included in the Player object from /api/players/lookup
  return player.imageUrl || "";
}

/* ---------- News ---------- */


export async function fetchNews(count = 12): Promise<NewsItem[]> {
  const cached = readCache<NewsItem[]>(newsCacheKey);
  if (cached) return cached;
  try {
    const res = await fetch(
      `${API_BASE}/posts?per_page=${count}&_embed`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return [];
    const items = (await res.json()) as WPItem[];
    const news: NewsItem[] = items.map((p) => ({
      id: p.id,
      title: decodeEntities(p.title.rendered),
      link: p.link,
      date: p.date,
      excerpt: decodeEntities((p.excerpt?.rendered ?? "").replace(/<[^>]*>/g, "")).slice(0, 160),
      image: p._embedded?.["wp:featured_media"]?.[0]?.source_url ?? "",
    }));
    writeCache(newsCacheKey, news);
    return news;
  } catch {
    return [];
  }
}

/* ---------- Positions used by the squad builder ---------- */
export const positions = [
  "ALL",
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
] as const;
export type Position = (typeof positions)[number];

export function matchesPosition(player: Player, pos: Position): boolean {
  if (pos === "ALL") return true;
  const all = [
    player.position,
    ...(player.altPositions === "N/A"
      ? []
      : player.altPositions.split("/").map((s) => s.trim())),
  ].map((s) => s.toUpperCase());
  return all.includes(pos);
}

/** Simple fuzzy search on name/team/nation/league. */
function normalizeLookupPlayer(raw: Partial<Player>): Player {
  const team = raw.team ?? raw.club ?? "";
  const imageUrl = raw.imageUrl ?? raw.image ?? "";
  const clubBadgeUrl = raw.clubBadgeUrl ?? raw.teamLogo ?? "";
  const nationBadgeUrl = raw.nationBadgeUrl ?? raw.nationFlag ?? "";
  return {
    postId: raw.postId ?? (Number(raw.sourceId ?? raw.id ?? 0) || 0),
    sourceId: raw.sourceId ?? String(raw.id ?? raw.postId ?? ""),
    id: raw.id ?? "",
    name: raw.name ?? "",
    shortName: raw.shortName ?? raw.name ?? "",
    position: raw.position ?? "",
    altPositions: raw.altPositions ?? "",
    program: raw.program ?? "",
    rating: raw.rating ?? 0,
    team,
    club: raw.club ?? team,
    league: raw.league ?? "",
    nation: raw.nation ?? "",
    skillMoves: raw.skillMoves ?? "",
    strongWeakFoot: raw.strongWeakFoot ?? "",
    height: raw.height ?? "",
    weight: raw.weight ?? "",
    workRate: raw.workRate ?? "",
    image: imageUrl,
    imageUrl,
    teamLogo: clubBadgeUrl,
    clubBadgeUrl,
    nationFlag: nationBadgeUrl,
    nationBadgeUrl,
    leagueLogo: raw.leagueLogo ?? "",
    textColourCode: raw.textColourCode ?? "",
    stats: raw.stats ?? {},
    details: raw.details ?? {},
  };
}

async function searchPlayersByLookup(query: string): Promise<Player[]> {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`/api/players/lookup?query=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const data = await response.json() as { success: boolean; players: Partial<Player>[] };
    return data.success ? data.players.map(normalizeLookupPlayer) : [];
  } catch (error) {
    console.error("Player search error:", error);
    return [];
  }
}

export function searchPlayers(query: string): Promise<Player[]>;
export function searchPlayers(players: Player[], query: string, pos: Position): Player[];
export function searchPlayers(
  queryOrPlayers: string | Player[],
  query = "",
  pos: Position = "ALL",
): Promise<Player[]> | Player[] {
  if (typeof queryOrPlayers === "string") return searchPlayersByLookup(queryOrPlayers);
  const q = query.toLowerCase().trim();
  let list = queryOrPlayers;
  if (q.length > 0) {
    list = queryOrPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.nation.toLowerCase().includes(q) ||
        p.league.toLowerCase().includes(q) ||
        p.program.toLowerCase().includes(q),
    );
  }
  if (pos !== "ALL") list = list.filter((p) => matchesPosition(p, pos));
  return list.slice(0, 60);
}

/* ---------- Squads (localStorage) ---------- */

/** WordPress titles arrive HTML-entity-escaped (&#8211; &#8217; &amp; etc.). */
export function decodeEntities(s: string): string {
  const map: Record<string, string> = {
    "&#8211;": "–",
    "&#8212;": "—",
    "&#8216;": "‘",
    "&#8217;": "’",
    "&#8220;": "“",
    "&#8221;": "”",
    "&amp;": "&",
    "&quot;": '"',
    "&#038;": "&",
  };
  let out = s;
  for (const [k, v] of Object.entries(map)) out = out.replaceAll(k, v);
  return out;
}
export interface SavedSquad {
  name: string;
  formation: string;
  players: Player[]; // 11 slots
  createdAt: number;
}

const squadsKey = "fc26.squads.v1";
export function loadSquads(): SavedSquad[] {
  try {
    return JSON.parse(localStorage.getItem(squadsKey) ?? "[]") as SavedSquad[];
  } catch {
    return [];
  }
}
export function saveSquads(squads: SavedSquad[]) {
  try {
    localStorage.setItem(squadsKey, JSON.stringify(squads));
  } catch {
    /* ignore */
  }
}

/** Seed search box with navbar's global search, then clear it. */
export function getGlobalSearch(): string {
  const q = sessionStorage.getItem("fc26.globalSearch") ?? "";
  sessionStorage.removeItem("fc26.globalSearch");
  return q;
}
