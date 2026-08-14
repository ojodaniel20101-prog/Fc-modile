import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { lookupPlayers } from "./playerData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Helper to get request origin
  const getRequestOrigin = (req: any) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "fc-modile.onrender.com";
    return `${protocol}://${host}`;
  };

  // --- Player Lookup Endpoint (NEW - uses precompiled catalogue) ---
  app.get("/api/players/lookup", async (req, res) => {
    const { query } = req.query;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "query parameter is required",
      });
      return;
    }

    try {
      const requestOrigin = getRequestOrigin(req);
      const players = await lookupPlayers(query.trim(), requestOrigin);
      res.json({
        success: true,
        count: players.length,
        players,
      });
    } catch (error) {
      console.error("Player lookup error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // --- Player Render Cache Endpoint ---
  // This endpoint serves player renders from the scraper cache
  // Falls back to on-demand scraping if not cached
  app.get("/api/cached-player-render", async (req, res) => {
    const { playerName } = req.query;

    if (!playerName || typeof playerName !== "string" || playerName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "playerName query parameter is required",
      });
      return;
    }

    try {
      // Dynamic import of the scraper functions
      const { default: db } = await import("./scraper/database.js");
      const { scrapePlayerOnDemand } = await import("./scraper/scraper.js");

      const searchName = playerName.trim();

      // 1. Check cache first
      const cached = db.getPlayerByName(searchName);

      if (cached) {
        if (cached.status === "cached" && cached.imageUrl) {
          // Cache hit with valid render
          return res.json({
            success: true,
            source: "cache",
            playerName: cached.playerName,
            playerId: cached.playerId,
            imageUrl: cached.imageUrl,
            cachedAt: cached.updatedAt,
          });
        }

        if (cached.status === "no_render") {
          // Known to have no render
          return res.status(404).json({
            success: false,
            error: "Player found but no render available",
            playerName: cached.playerName,
            playerId: cached.playerId,
          });
        }
      }

      // 2. Not in cache or stale - scrape on-demand
      const result = await scrapePlayerOnDemand(searchName);

      if (!result.found) {
        return res.status(404).json({
          success: false,
          error: result.error || "Player not found",
          playerName: searchName,
        });
      }

      if (result.imageUrl) {
        return res.json({
          success: true,
          source: "on-demand",
          playerName: result.playerName,
          playerId: result.playerId,
          imageUrl: result.imageUrl,
        });
      } else {
        return res.status(404).json({
          success: false,
          error: result.error || "No render available",
          playerName: result.playerName,
          playerId: result.playerId,
        });
      }
    } catch (err) {
      console.error("Endpoint error:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);


