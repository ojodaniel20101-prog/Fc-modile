import axios from "axios";
import https from "node:https";
import { loadPlayerCatalogueFromFile, loadPlayerCatalogueFromCache } from "./playerCatalogueAdapter.js";

export type CoreStatKey = "PAC" | "SHO" | "PAS" | "DRI" | "DEF" | "PHY";

export type PlayerProfile = {
  sourceId: string;
  id: string;
  name: string;
  shortName: string;
  rating: number;
  position: string;
  altPositions: string;
  program: string;
  club: string;
  league: string;
  nation: string;
  skillMoves: string;
  strongWeakFoot: string;
  height: string;
  weight: string;
  workRate: string;
  imageUrl: string;
  clubBadgeUrl: string;
  nationBadgeUrl: string;
  stats: Record<CoreStatKey, number>;
  details: Record<string, number>;
};

type RawPlayer = { id: number | string; slug?: string; acf?: Record<string, unknown> };
type CurrentRenderRecord = { name: string; position: string; rating: number; altPositions: string; program: string; imageUrl: string; stats: number[] };
type CataloguePayload = { players?: PlayerProfile[] };

const FULL_CATALOGUE_PATH = "/manus-storage/fc-mobile-full-player-catalogue_5d077e2e.json";
const CACHE_TTL_MS = 30 * 60 * 1000;
const IMAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const sourceAgent = new https.Agent({ family: 4 });
let catalogueCache: { expiresAt: number; origin: string; players: PlayerProfile[] } | null = null;
const renderImageCache = new Map<string, { expiresAt: number; imageUrl: string }>();

export function resetPlayerDataCacheForTests(): void {
  catalogueCache = null;
  renderImageCache.clear();
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const parsed = Number(stringValue(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}
function cleanId(value: string): string { return value.replace(/[^0-9]/g, ""); }
function normalizeText(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function stat(acf: Record<string, unknown>, key: string): number { return numberValue(acf[key]); }

export function isVerifiedPlayerImage(value: string): boolean {
  const url = stringValue(value).replace(/\\\//g, "/");
  if (/(normal-2|placeholder|default)/i.test(url)) return false;
  return /^https:\/\/backup\.mrbelieverhub\.com\/wp-content\/uploads\/20\d\d\/[^\s]+\.(png|jpe?g|webp|avif)$/i.test(url)
    || /^https:\/\/images-v2\.renderz\.app\/player_[^\s]+/i.test(url);
}

export function playerImageProxyUrl(requestOrigin: string, imageUrl: string): string {
  return `${requestOrigin}/api/player-image?src=${encodeURIComponent(imageUrl)}`;
}

export function playerCardImageProxyUrl(requestOrigin: string, cardId: string): string {
  return `${requestOrigin}/api/player-image/${cardId}`;
}

export function parseCurrentRenderRecords(html: string): CurrentRenderRecord[] {
  const decoded = html.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/\\"/g, '"');
  const records: CurrentRenderRecord[] = [];
  const pattern = /\{"name":"([^"]+)","position":"([^"]*)","ovr":(\d+)[\s\S]*?"altPosition":"([^"]*)","imageUrl":"(https?:\/\/[^\"]+)"[\s\S]*?"event":"([^"]*)"[\s\S]*?"baseStats":\[([\d,\s]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(decoded)) !== null) {
    const [, name, position, rating, altPositions, imageUrl, program, rawStats] = match;
    const stats = rawStats.split(",").map((value: string) => numberValue(value));
    if (!name || !position || !isVerifiedPlayerImage(imageUrl) || stats.length < 6) continue;
    records.push({ name, position, rating: numberValue(rating), altPositions, program, imageUrl, stats });
  }
  return records;
}

export function normalizePlayer(raw: RawPlayer): PlayerProfile | null {
  const acf = raw.acf ?? {};
  const name = stringValue(acf.player_name);
  const rating = numberValue(acf.rating);
  const id = cleanId(stringValue(acf.id) || raw.slug || String(raw.id));
  if (!name || !rating || !id) return null;
  const playerImage = stringValue(acf.player_image).replace(/\\\//g, "/");
  const clubBadge = stringValue(acf.team_logo).replace(/\\\//g, "/");
  const nationBadge = stringValue(acf.nation_flag).replace(/\\\//g, "/");
  return {
    sourceId: String(raw.id), id, name, shortName: stringValue(acf.short_name) || name.split(" ").at(-1) || name, rating,
    position: stringValue(acf.position) || "CM", altPositions: stringValue(acf.alt_positions), program: stringValue(acf.program) || "FC MOBILE",
    club: stringValue(acf.team) || "Unknown club", league: stringValue(acf.league), nation: stringValue(acf.nation) || "Unknown nation", skillMoves: stringValue(acf.skill_moves), strongWeakFoot: stringValue(acf.strongweak_foot), height: stringValue(acf.height), weight: stringValue(acf.weight), workRate: stringValue(acf.work_rate),
    imageUrl: isVerifiedPlayerImage(playerImage) ? playerImage : "", clubBadgeUrl: isVerifiedPlayerImage(clubBadge) ? clubBadge : "", nationBadgeUrl: isVerifiedPlayerImage(nationBadge) ? nationBadge : "",
    stats: { PAC: stat(acf, "pace"), SHO: stat(acf, "shooting"), PAS: stat(acf, "passing"), DRI: stat(acf, "dribbling"), DEF: stat(acf, "defending"), PHY: stat(acf, "physical") },
    details: { Acceleration: stat(acf, "acceleration"), "Sprint speed": stat(acf, "sprint_speed"), Finishing: stat(acf, "finishing"), "Long shot": stat(acf, "long_shot"), "Shot power": stat(acf, "shot_power"), Positioning: stat(acf, "positioning"), Volley: stat(acf, "volley"), Penalties: stat(acf, "penalties"), Vision: stat(acf, "vision"), Crossing: stat(acf, "crossing"), Curve: stat(acf, "curve"), "Free kick": stat(acf, "free_kick"), "Short passing": stat(acf, "short_passing"), "Long passing": stat(acf, "long_passing"), Agility: stat(acf, "agility"), Balance: stat(acf, "balance"), "Ball control": stat(acf, "ball_control"), Reactions: stat(acf, "reactions"), Awareness: stat(acf, "awareness"), Marking: stat(acf, "marking"), "Standing tackle": stat(acf, "standing_tackle"), "Sliding tackle": stat(acf, "sliding_tackle"), Heading: stat(acf, "heading"), Strength: stat(acf, "strength"), Stamina: stat(acf, "stamina"), Aggression: stat(acf, "aggression"), Jumping: stat(acf, "jumping"), "GK diving": stat(acf, "gk_diving"), "GK reflexes": stat(acf, "gk_reflexes"), "GK kicking": stat(acf, "gk_kicking"), "GK handling": stat(acf, "gk_handling") },
  };
}

function isPlayerProfile(value: unknown): value is PlayerProfile {
  const player = value as Partial<PlayerProfile>;
  return Boolean(player && typeof player.id === "string" && typeof player.name === "string" && typeof player.rating === "number" && typeof player.position === "string" && player.stats && player.details);
}

async function getFullCatalogue(requestOrigin: string): Promise<PlayerProfile[]> {
  if (catalogueCache && catalogueCache.origin === requestOrigin && catalogueCache.expiresAt > Date.now()) return catalogueCache.players;
  
  // Try to load from our local catalogue file first
  let players: PlayerProfile[] = [];
  try {
    players = loadPlayerCatalogueFromFile();
  } catch (error) {
    console.error("Failed to load from catalogue file, trying cache fallback:", error);
  }
  
  // If catalogue file is empty, try cache file fallback
  if (players.length === 0) {
    try {
      players = loadPlayerCatalogueFromCache();
    } catch (error) {
      console.error("Failed to load from cache fallback, trying remote:", error);
    }
  }
  
  // If local files are empty, try remote fetch (for external deployments)
  if (players.length === 0) {
    try {
      const response = await axios.get<CataloguePayload>(`${requestOrigin}${FULL_CATALOGUE_PATH}`, { headers: { Accept: "application/json" }, timeout: 15_000, httpsAgent: sourceAgent });
      players = Array.isArray(response.data?.players) ? response.data.players.filter(isPlayerProfile) : [];
    } catch (error) {
      console.error("Failed to fetch remote catalogue:", error);
      return [];
    }
  }
  
  // Apply image proxy URLs
  players = players.map((player) => ({
    ...player,
    imageUrl: isVerifiedPlayerImage(player.imageUrl) ? playerImageProxyUrl(requestOrigin, player.imageUrl) : /^\d{7,10}$/.test(player.id) ? playerCardImageProxyUrl(requestOrigin, player.id) : "",
  }));
  
  catalogueCache = { origin: requestOrigin, players, expiresAt: Date.now() + CACHE_TTL_MS };
  return players;
}

function playerMatches(player: PlayerProfile, query: string): boolean {
  const term = normalizeText(query);
  return normalizeText([player.id, player.name, player.shortName, player.club, player.nation, player.position, player.program].join(" ")).includes(term);
}

function rankMatch(player: PlayerProfile, query: string): number {
  const term = normalizeText(query);
  const name = normalizeText(player.name);
  let score = 0;
  if (player.id === cleanId(query)) score -= 100;
  else if (name === term) score -= 40;
  else if (name.startsWith(term)) score -= 20;
  if (player.imageUrl) score -= 60;
  if (term === "ronaldo" && /(^|\s)c\.?\s*ronaldo$/.test(name)) score -= 80;
  return score - Math.min(player.rating, 150) / 1000;
}

export async function lookupPlayers(query: string, requestOrigin = "https://fcmobtools-h3xzqkrm.manus.space"): Promise<PlayerProfile[]> {
  const term = query.trim();
  if (!term) return [];
  const players = await getFullCatalogue(requestOrigin);
  const matches = players.filter((player) => playerMatches(player, term)).sort((left, right) => rankMatch(left, term) - rankMatch(right, term)).slice(0, 8);
  return matches;
}
