import fs from "fs";
import path from "path";
import config from "./config.js";
import logger from "./logger.js";

/**
 * Simple JSON-file backed cache. Zero native dependencies (no sqlite),
 * so it builds and runs anywhere Node runs — including Render.
 *
 * Data shape on disk: { [playerNameLower]: PlayerRecord }
 */
class DatabaseManager {
  constructor() {
    this.dbPath = config.DB_PATH;
    this._ensureFile();
    this.data = this._load() || {};
    logger.info("Database initialized (JSON file cache)", { path: this.dbPath });
  }

  _ensureFile() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, "{}", "utf8");
    }
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.dbPath, "utf8");
      const parsed = JSON.parse(raw || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        logger.error("Cache file did not contain a valid object, starting fresh", {
          path: this.dbPath,
        });
        return {};
      }
      return parsed;
    } catch (err) {
      logger.error("Failed to load cache file, starting fresh", { error: err.message });
      return {};
    }
  }

  _save() {
    try {
      // Write atomically: write to temp file then rename, avoids
      // corrupting the cache if the process is killed mid-write.
      const tmpPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data), "utf8");
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      logger.error("Failed to persist cache file", { error: err.message });
    }
  }

  /**
   * Insert or update a player record
   */
  upsertPlayer({ playerName, playerId, imageUrl, status, errorMessage = null }) {
    const key = playerName.toLowerCase();
    this.data[key] = {
      playerName,
      playerId,
      imageUrl: imageUrl || null,
      status,
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
    this._save();
    return this.data[key];
  }

  /**
   * Get player by name (case-insensitive)
   */
  getPlayerByName(playerName) {
    return this.data[playerName.toLowerCase()] || null;
  }

  /**
   * Get player by ID
   */
  getPlayerById(playerId) {
    return Object.values(this.data).find((p) => p.playerId === playerId) || null;
  }

  /**
   * Check if player exists
   */
  playerExists(playerName) {
    return Boolean(this.data[playerName.toLowerCase()]);
  }

  /**
   * Get all cached players with renders
   */
  getAllCached() {
    return Object.values(this.data)
      .filter((p) => p.status === "cached")
      .sort((a, b) => a.playerName.localeCompare(b.playerName));
  }

  /**
   * Get stats
   */
  getStats() {
    const all = Object.values(this.data);
    return {
      total: all.length,
      cached: all.filter((p) => p.status === "cached").length,
      noRender: all.filter((p) => p.status === "no_render").length,
      errors: all.filter((p) => p.status === "error").length,
    };
  }

  /**
   * Get players pending scrape
   */
  getPendingPlayers(limit = 100) {
    return Object.values(this.data)
      .filter((p) => p.status === "pending")
      .slice(0, limit);
  }

  /**
   * Search players by name (partial match)
   */
  searchPlayers(query) {
    const q = query.toLowerCase();
    return Object.values(this.data)
      .filter((p) => p.playerName.toLowerCase().includes(q))
      .sort((a, b) => a.playerName.localeCompare(b.playerName))
      .slice(0, 20);
  }

  close() {
    // No-op for JSON file backend — data is flushed on every write.
  }
}

export default new DatabaseManager();
