#!/usr/bin/env node
/**
 * CLI runner for the player render scraper.
 *
 * Usage:
 *   node server/scraper/run.js                # scrape 10 players (quick test)
 *   node server/scraper/run.js --all           # scrape ALL players (~1136, takes a while)
 *   node server/scraper/run.js --limit=50       # scrape first 50 players
 *
 * Run this from a network location that isn't blocked by mrbelieverhub's
 * Cloudflare protection (e.g. your phone's mobile connection via Termux) —
 * cloud/datacenter IPs (like Render) get a 403 from mrbelieverhub directly.
 *
 * Results are written to server/data/cache.json — commit that file to your
 * repo so Render serves the pre-built cache instead of scraping live.
 */
import { runScraper } from "./scraper.js";
import db from "./database.js";

const args = process.argv.slice(2);
const isAll = args.includes("--all");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : isAll ? 0 : 10;

console.log(`\nStarting scrape (limit=${limit === 0 ? "ALL" : limit})...\n`);

runScraper({ limit, batchSize: 10 })
  .then((result) => {
    console.log("\n✅ Scraper finished:", result);
    console.log(`\nCache file written. Now commit it:`);
    console.log(`  git add server/data/cache.json`);
    console.log(`  git commit -m "chore: update player render cache"`);
    console.log(`  git push\n`);
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Scraper error:", error);
    db.close();
    process.exit(1);
  });
