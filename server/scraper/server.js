const express = require('express');
const config = require('./config');
const db = require('./database');
const logger = require('./logger');
const { runScraper, scrapePlayerOnDemand } = require('./scraper');

const app = express();
app.use(express.json());

/**
 * Middleware: request logging
 */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    query: req.query,
    ip: req.ip 
  });
  next();
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const stats = db.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: stats,
  });
});

/**
 * GET /api/stats
 * Cache statistics
 */
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  res.json({
    success: true,
    stats,
  });
});

/**
 * GET /api/players
 * List all cached players (with renders only)
 */
app.get('/api/players', (req, res) => {
  try {
    const players = db.getAllCached();
    res.json({
      success: true,
      count: players.length,
      players,
    });
  } catch (error) {
    logger.error('Failed to list players', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve players',
    });
  }
});

/**
 * GET /api/search?query=Ronaldo
 * Search players by name
 */
app.get('/api/search', (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter required (min 2 chars)',
    });
  }

  try {
    const players = db.searchPlayers(query.trim());
    res.json({
      success: true,
      count: players.length,
      players,
    });
  } catch (error) {
    logger.error('Search failed', { query, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * GET /api/cached-player-render?playerName=Ronaldo
 * Main endpoint: get cached player render
 */
app.get('/api/cached-player-render', async (req, res) => {
  const { playerName } = req.query;

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'playerName query parameter is required',
    });
  }

  const searchName = playerName.trim();

  try {
    // 1. Check cache first
    const cached = db.getPlayerByName(searchName);

    if (cached) {
      if (cached.status === 'cached' && cached.imageUrl) {
        // Cache hit with valid render
        logger.info(`Cache hit: ${searchName}`);
        return res.json({
          success: true,
          source: 'cache',
          playerName: cached.playerName,
          playerId: cached.playerId,
          imageUrl: cached.imageUrl,
          cachedAt: cached.updatedAt,
        });
      }

      if (cached.status === 'no_render') {
        // Known to have no render - don't waste time re-trying
        logger.info(`Cache hit (no render): ${searchName}`);
        return res.status(404).json({
          success: false,
          error: 'Player found but no render available',
          playerName: cached.playerName,
          playerId: cached.playerId,
        });
      }

      // Status is 'error' or 'pending' - try to re-scrape
      logger.info(`Cache stale/error, re-scraping: ${searchName}`);
    }

    // 2. Not in cache or stale - scrape on-demand
    logger.info(`Cache miss, scraping on-demand: ${searchName}`);
    const result = await scrapePlayerOnDemand(searchName);

    if (!result.found) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Player not found',
        playerName: searchName,
      });
    }

    if (result.imageUrl) {
      return res.json({
        success: true,
        source: 'on-demand',
        playerName: result.playerName,
        playerId: result.playerId,
        imageUrl: result.imageUrl,
      });
    } else {
      return res.status(404).json({
        success: false,
        error: result.error || 'No render available',
        playerName: result.playerName,
        playerId: result.playerId,
      });
    }

  } catch (error) {
    logger.error('Endpoint error', { 
      playerName: searchName, 
      error: error.message,
      stack: error.stack 
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/scrape
 * Trigger a scrape job (optional limit)
 */
app.post('/api/scrape', async (req, res) => {
  const { limit = 10 } = req.body || {};

  // Fire and scrape (don't wait for full completion in HTTP response)
  res.json({
    success: true,
    message: `Scrape job started with limit=${limit}`,
    status: 'running',
  });

  // Run scraper in background
  try {
    await runScraper({ limit: parseInt(limit, 10) || 10, batchSize: 10 });
  } catch (error) {
    logger.error('Background scrape failed', { error: error.message });
  }
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/stats',
      'GET /api/players',
      'GET /api/search?query={name}',
      'GET /api/cached-player-render?playerName={name}',
      'POST /api/scrape',
    ],
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    path: req.path, 
    error: err.message,
    stack: err.stack 
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const server = app.listen(config.PORT, () => {
  logger.info(`FC Mobile Render Scraper API running`, { 
    port: config.PORT,
    env: process.env.NODE_ENV || 'development',
  });

  console.log(`\n🚀 Server running on http://localhost:${config.PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/stats`);
  console.log(`  GET  /api/players`);
  console.log(`  GET  /api/search?query=Ronaldo`);
  console.log(`  GET  /api/cached-player-render?playerName=Ronaldo`);
  console.log(`  POST /api/scrape { "limit": 10 }`);
  console.log(`\nScraper CLI:`);
  console.log(`  npm run scrape       # Scrape 10 players`);
  console.log(`  npm run scrape:all   # Scrape all players`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

module.exports = app;
