import fs from "fs";
import path from "path";
import type { PlayerProfile } from "./playerData";

/**
 * Load the full player catalogue from the precompiled JSON file.
 * The catalogue includes 1300+ players with full stats, images, and metadata.
 */
export function loadPlayerCatalogueFromFile(): PlayerProfile[] {
  const cataloguePath = path.resolve(process.cwd(), "server/data/fc-mobile-full-player-catalogue_5d077e2e.json");
  
  if (!fs.existsSync(cataloguePath)) {
    console.warn(`Catalogue file not found: ${cataloguePath}`);
    return [];
  }

  try {
    const raw = fs.readFileSync(cataloguePath, "utf8");
    const data = JSON.parse(raw) as { players?: PlayerProfile[] };

    if (!Array.isArray(data.players)) {
      console.error("Invalid catalogue structure: missing players array");
      return [];
    }

    const players = data.players.filter((p): p is PlayerProfile => {
      return Boolean(p && typeof p.id === "string" && typeof p.name === "string" && typeof p.rating === "number");
    });

    console.log(`Loaded ${players.length} players from catalogue file`);
    return players;
  } catch (error) {
    console.error(`Failed to load catalogue from file:`, error);
    return [];
  }
}

/**
 * Convert our cached render data to PlayerProfile format (fallback).
 * Our cache has: { playerName, playerId, imageUrl, status, updatedAt }
 */
export function loadPlayerCatalogueFromCache(): PlayerProfile[] {
  const cacheFile = path.resolve(process.cwd(), "server/data/cache.json");
  
  if (!fs.existsSync(cacheFile)) {
    console.warn(`Cache file not found: ${cacheFile}`);
    return [];
  }

  try {
    const raw = fs.readFileSync(cacheFile, "utf8");
    const cacheData = JSON.parse(raw) as Record<string, any>;

    const players: PlayerProfile[] = [];

    for (const [nameLower, entry] of Object.entries(cacheData)) {
      if (!entry || typeof entry !== "object") continue;

      const player: PlayerProfile = {
        sourceId: entry.playerId || entry.id || nameLower,
        id: entry.playerId || entry.id || nameLower,
        name: entry.playerName || nameLower,
        shortName: (entry.playerName || nameLower).split(" ").at(-1) || nameLower,
        rating: 0,
        position: "CM",
        altPositions: "",
        program: "FC MOBILE",
        club: "Unknown",
        league: "Unknown",
        nation: "Unknown",
        skillMoves: "",
        strongWeakFoot: "",
        height: "",
        weight: "",
        workRate: "",
        imageUrl: entry.imageUrl || "",
        clubBadgeUrl: "",
        nationBadgeUrl: "",
        stats: { PAC: 0, SHO: 0, PAS: 0, DRI: 0, DEF: 0, PHY: 0 },
        details: {},
      };

      players.push(player);
    }

    console.log(`Loaded ${players.length} players from cache fallback`);
    return players;
  } catch (error) {
    console.error(`Failed to load catalogue from cache:`, error);
    return [];
  }
}
