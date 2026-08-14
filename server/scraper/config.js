import path from "path";

// IMPORTANT: We resolve paths from process.cwd() (the project root when
// Render runs `node dist/index.js`), NOT from import.meta.url / __dirname.
// After esbuild bundles server/index.ts + all dynamically-imported scraper
// files into a single dist/index.js, import.meta.url for every module in
// that bundle points at dist/index.js's own location — not each file's
// original source path. That broke our earlier __dirname-based resolution
// and pointed the cache reader at the wrong folder (project_root/data/
// instead of project_root/server/data/, where cache.json actually lives).
const PROJECT_ROOT = process.cwd();

export default {
  DB_PATH: process.env.RENDER_CACHE_PATH || path.resolve(PROJECT_ROOT, "server", "data", "cache.json"),
  LOG_PATH: process.env.RENDER_LOG_PATH || path.resolve(PROJECT_ROOT, "server", "data", "logs", "scraper.log"),

  // Data sources
  WP_API_BASE: "https://backup.mrbelieverhub.com/wp-json/wp/v2/players_database",
  RENDERZ_BASE: "https://renderz.app/24/player",

  // Pagination & batching
  PLAYERS_PER_PAGE: 100,
  DEFAULT_BATCH_SIZE: 10,

  // Rate limiting (ms between requests)
  // 60 req/min = 1 req/sec. We use 1100ms to be safe.
  WP_DELAY_MS: 1100,
  RENDERZ_DELAY_MS: 500,

  // Retry logic
  RETRIES: 2,
  RETRY_DELAY_MS: 2000,

  // Regex for Renderz image extraction
  RENDERZ_IMAGE_REGEX: /https:\/\/images-v2\.renderz\.app\/player[^"]*verify=[^"&]*/g,
};
