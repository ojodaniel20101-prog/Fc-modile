import config from './config.js';
import db from './database.js';
import logger from './logger.js';

// Simple sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean player ID by removing commas
 * "24,006,944" → "24006944"
 */
function cleanPlayerId(rawId) {
  if (!rawId) return null;
  return String(rawId).replace(/,/g, '').trim();
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, options = {}, retries = config.RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        const delay = config.RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Retry ${attempt + 1}/${retries} for ${url}`, {
          error: error.message,
          delay,
        });
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Fetch all players from WordPress API with pagination
 */
async function fetchAllPlayers() {
  const players = [];
  let page = 1;
  let hasMore = true;

  logger.info('Starting player fetch from WordPress API');

  while (hasMore) {
    const url = `${config.WP_API_BASE}?per_page=${config.PLAYERS_PER_PAGE}&page=${page}`;

    try {
      logger.info(`Fetching page ${page}`, { url });
      const response = await fetchWithRetry(url);
      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of data) {
        // Extract player data from WordPress response
        const acf = item.acf || {};

        // Player ID: prefer acf.id (comma formatted), fallback to slug
        const rawId = acf.id || item.slug || item.title?.rendered;
        const playerId = cleanPlayerId(rawId);

        // Player name: prefer acf.player_name, fallback to slug
        const playerName = acf.player_name || item.slug || `Player_${playerId}`;

        if (!playerId) {
          logger.warn('Skipping player with no ID', { 
            wpId: item.id,
            slug: item.slug 
          });
          continue;
        }

        players.push({
          playerName: playerName.trim(),
          playerId,
          rawData: item,
        });
      }

      logger.info(`Page ${page} fetched`, { 
        count: data.length, 
        totalSoFar: players.length 
      });

      // Check if we got a full page; if not, we're done
      if (data.length < config.PLAYERS_PER_PAGE) {
        hasMore = false;
      } else {
        page++;
      }

      // Rate limiting: delay between WP requests
      await sleep(config.WP_DELAY_MS);

    } catch (error) {
      logger.error(`Failed to fetch page ${page}`, { 
        error: error.message,
        url 
      });

      // If it's a 400 error, we've likely exceeded total pages
      if (error.message.includes('HTTP 400')) {
        hasMore = false;
      } else {
        throw error; // Re-throw unexpected errors
      }
    }
  }

  logger.info('Player fetch complete', { totalPlayers: players.length });
  return players;
}

/**
 * Fetch render image from Renderz
 */
async function fetchRenderzImage(playerId) {
  const url = `${config.RENDERZ_BASE}/${playerId}/__data.json`;

  try {
    logger.debug(`Fetching Renderz for player ${playerId}`, { url });
    const response = await fetchWithRetry(url);
    const text = await response.text();

    // Extract image URL using regex
    const matches = text.match(config.RENDERZ_IMAGE_REGEX);

    if (matches && matches.length > 0) {
      // Return the first match (player card image)
      const imageUrl = matches[0];
      logger.debug(`Found render for ${playerId}`, { imageUrl });
      return { success: true, imageUrl };
    }

    logger.debug(`No render found for ${playerId}`);
    return { success: false, imageUrl: null };

  } catch (error) {
    // Handle 404 gracefully - player not on Renderz
    if (error.message.includes('HTTP 404')) {
      logger.debug(`Renderz 404 for ${playerId}`);
      return { success: false, imageUrl: null, notFound: true };
    }

    throw error;
  }
}

/**
 * Process a single player: fetch render and cache
 */
async function processPlayer(player, index, total) {
  const { playerName, playerId } = player;

  logger.info(`[${index + 1}/${total}] Processing: ${playerName} (ID: ${playerId})`);

  try {
    // Check if already cached with a valid render
    const existing = db.getPlayerByName(playerName);
    if (existing && existing.status === 'cached' && existing.imageUrl) {
      logger.info(`  ↳ Already cached, skipping`);
      return { status: 'skipped', playerName, playerId };
    }

    // Fetch from Renderz
    const result = await fetchRenderzImage(playerId);

    // Rate limiting: small delay between Renderz requests
    await sleep(config.RENDERZ_DELAY_MS);

    if (result.success && result.imageUrl) {
      db.upsertPlayer({
        playerName,
        playerId,
        imageUrl: result.imageUrl,
        status: 'cached',
        errorMessage: null,
      });

      logger.info(`  ✓ Cached: ${playerName}`);
      return { status: 'cached', playerName, playerId, imageUrl: result.imageUrl };
    } else {
      // No render found - cache as no_render
      db.upsertPlayer({
        playerName,
        playerId,
        imageUrl: null,
        status: 'no_render',
        errorMessage: result.notFound ? 'Renderz 404' : 'No image match',
      });

      logger.info(`  ✗ No render: ${playerName}`);
      return { status: 'no_render', playerName, playerId };
    }

  } catch (error) {
    logger.error(`  ✗ Error processing ${playerName}`, { 
      error: error.message,
      playerId 
    });

    db.upsertPlayer({
      playerName,
      playerId,
      imageUrl: null,
      status: 'error',
      errorMessage: error.message,
    });

    return { status: 'error', playerName, playerId, error: error.message };
  }
}

/**
 * Run the scraper
 * @param {Object} options
 * @param {number} options.limit - Max players to process (0 = all)
 * @param {number} options.batchSize - Process in batches
 */
async function runScraper(options = {}) {
  const limit = options.limit || 0;
  const batchSize = options.batchSize || config.DEFAULT_BATCH_SIZE;

  logger.info('=== Scraper Started ===', { limit, batchSize });
  const startTime = Date.now();

  try {
    // Step 1: Fetch all players from WordPress
    const allPlayers = await fetchAllPlayers();

    // Apply limit if specified
    const playersToProcess = limit > 0 ? allPlayers.slice(0, limit) : allPlayers;

    logger.info(`Processing ${playersToProcess.length} players`, { 
      totalAvailable: allPlayers.length,
      limit,
    });

    // Step 2: Process players in batches
    const results = {
      cached: 0,
      noRender: 0,
      errors: 0,
      skipped: 0,
    };

    for (let i = 0; i < playersToProcess.length; i += batchSize) {
      const batch = playersToProcess.slice(i, i + batchSize);

      logger.info(`--- Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(playersToProcess.length / batchSize)} ---`);

      for (let j = 0; j < batch.length; j++) {
        const player = batch[j];
        const result = await processPlayer(player, i + j, playersToProcess.length);

        results[result.status]++;

        // Progress log every 10 players
        if ((i + j + 1) % 10 === 0) {
          logger.info(`Progress: ${i + j + 1}/${playersToProcess.length}`, results);
        }
      }

      // Small delay between batches
      if (i + batchSize < playersToProcess.length) {
        await sleep(1000);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('=== Scraper Complete ===', { 
      duration: `${duration}s`,
      ...results,
      totalProcessed: playersToProcess.length,
    });

    return {
      success: true,
      duration,
      ...results,
      totalProcessed: playersToProcess.length,
    };

  } catch (error) {
    logger.error('Scraper failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape a single player on-demand
 */
async function scrapePlayerOnDemand(playerName) {
  logger.info(`On-demand scrape for: ${playerName}`);

  // First, try to find the player in the WP database
  // Since we don't have the full list loaded, we need to search WP
  // For simplicity, we'll search by name in our cached list first,
  // then fetch from WP if not found

  // Search WP API for this player
  const searchUrl = `${config.WP_API_BASE}?search=${encodeURIComponent(playerName)}&per_page=10`;

  try {
    const response = await fetchWithRetry(searchUrl);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return { found: false, error: 'Player not found in database' };
    }

    // Find best match
    const match = data.find(p => {
      const name = (p.acf?.player_name || p.slug || '').toLowerCase();
      return name.includes(playerName.toLowerCase());
    }) || data[0];

    const acf = match.acf || {};
    const rawId = acf.id || match.slug;
    const playerId = cleanPlayerId(rawId);
    const foundName = acf.player_name || match.slug;

    if (!playerId) {
      return { found: false, error: 'Player ID not found' };
    }

    // Fetch render
    const result = await fetchRenderzImage(playerId);

    if (result.success && result.imageUrl) {
      db.upsertPlayer({
        playerName: foundName,
        playerId,
        imageUrl: result.imageUrl,
        status: 'cached',
      });

      return {
        found: true,
        playerName: foundName,
        playerId,
        imageUrl: result.imageUrl,
      };
    } else {
      db.upsertPlayer({
        playerName: foundName,
        playerId,
        imageUrl: null,
        status: 'no_render',
      });

      return {
        found: true,
        playerName: foundName,
        playerId,
        imageUrl: null,
        error: 'No render available',
      };
    }

  } catch (error) {
    logger.error('On-demand scrape failed', { playerName, error: error.message });
    return { found: false, error: error.message };
  }
}

export { runScraper, scrapePlayerOnDemand, fetchAllPlayers, processPlayer, cleanPlayerId };
