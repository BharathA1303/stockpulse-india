/**
 * GET /api/search/:query
 *
 * Searches for stocks.
 * Priority: Simulator (instant) → Yahoo Finance supplement
 */

import { Router } from 'express';
import { getYahooFinanceService } from '../services/yahooFinanceService.js';
import Cache from '../utils/cache.js';
import { sanitizeQuery } from '../utils/sanitize.js';

const router = Router();
const cache = new Cache(60_000);

router.get('/:query', async (req, res) => {
  try {
    const query = sanitizeQuery(req.params.query);
    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Search query is too short' });
    }

    const cacheKey = `search:${query.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let results = [];

    // 1. Search local simulator database first (instant, always available)
    const simulator = req.app.get('simulator');
    if (simulator) {
      results = simulator.searchStocks(query);
    }

    // 2. Supplement with Yahoo Finance results
    if (results.length < 5) {
      const yf = getYahooFinanceService();
      try {
        const yfResults = await yf.searchSymbols(query);
        const existingSymbols = new Set(results.map(r => r.symbol));
        for (const item of yfResults) {
          if (!existingSymbols.has(item.symbol)) {
            results.push(item);
          }
        }
      } catch (err) {
        console.warn('Yahoo Finance search failed:', err.message);
      }
    }

    cache.set(cacheKey, results);
    return res.json(results);
  } catch (err) {
    console.error(`Search error [${req.params.query}]:`, err.message);
    return res.status(500).json({ error: 'Failed to search stocks' });
  }
});

export default router;
