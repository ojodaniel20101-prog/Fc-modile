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

  const allowedImageHosts = new Set(["backup.mrbelieverhub.com", "images-v2.renderz.app"]);
  const imageRequestHeaders = {
    "User-Agent": "Mozilla/5.0 (compatible; FC-Mobile-Tools/1.0)",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  };

  const proxyImage = async (sourceUrl: string, res: any) => {
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      res.status(400).json({ success: false, error: "Invalid image URL" });
      return;
    }

    if (parsed.protocol !== "https:" || !allowedImageHosts.has(parsed.hostname)) {
      res.status(400).json({ success: false, error: "Image host is not allowed" });
      return;
    }

    try {
      const upstream = await fetch(parsed, {
        headers: imageRequestHeaders,
        signal: AbortSignal.timeout(20_000),
      });
      if (!upstream.ok) {
        res.status(upstream.status).json({ success: false, error: `Image upstream returned ${upstream.status}` });
        return;
      }

      let contentType = upstream.headers.get("content-type")?.split(";")[0] || "";
      const body = Buffer.from(await upstream.arrayBuffer());
      if (!contentType.startsWith("image/") || contentType === "application/octet-stream") {
        if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) contentType = "image/png";
        else if (body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) contentType = "image/jpeg";
        else if (body.subarray(0, 4).toString() === "RIFF" && body.subarray(8, 12).toString() === "WEBP") contentType = "image/webp";
        else if (body.subarray(0, 6).toString() === "GIF87a" || body.subarray(0, 6).toString() === "GIF89a") contentType = "image/gif";
        else {
          res.status(502).json({ success: false, error: "Image upstream returned a non-image response" });
          return;
        }
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", body.length);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.end(body);
    } catch (error) {
      console.error("Image proxy error:", error);
      res.status(502).json({ success: false, error: "Unable to fetch image" });
    }
  };

  // Proxy verified source images so the browser and canvas can load them reliably.
  app.get("/api/player-image", async (req, res) => {
    const source = req.query.src;
    if (!source || typeof source !== "string") {
      res.status(400).json({ success: false, error: "src query parameter is required" });
      return;
    }
    await proxyImage(source, res);
  });

  // Resolve a numeric Renderz player ID to its signed image URL, then proxy the image.
  app.get("/api/player-image/:cardId", async (req, res) => {
    const cardId = req.params.cardId;
    if (!/^\d{7,10}$/.test(cardId)) {
      res.status(400).json({ success: false, error: "Invalid player ID" });
      return;
    }

    try {
      const renderzResponse = await fetch(`https://renderz.app/24/player/${cardId}/__data.json`, {
        headers: { "User-Agent": imageRequestHeaders["User-Agent"], Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!renderzResponse.ok) {
        res.status(renderzResponse.status).json({ success: false, error: "Renderz player data unavailable" });
        return;
      }

      const renderzText = await renderzResponse.text();
      const imageMatch = renderzText.match(/https:\/\/images-v2\.renderz\.app\/player[^"\s]+/);
      if (!imageMatch) {
        res.status(404).json({ success: false, error: "No Renderz image found" });
        return;
      }

      const imageUrl = imageMatch[0].replace(/\\\//g, "/").replace(/\\u0026/g, "&");
      await proxyImage(imageUrl, res);
    } catch (error) {
      console.error("Renderz image lookup error:", error);
      res.status(502).json({ success: false, error: "Unable to resolve Renderz image" });
    }
  });

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


