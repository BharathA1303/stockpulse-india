/**
 * GET /api/search/:query
 *
 * Searches for stocks. Uses the local MarketSimulator stock database
 * for instant results, with Yahoo Finance as a supplementary source.
 */

import { Router } from 'express';
import YahooFinance from 'yahoo-finance2';
import Cache from '../utils/cache.js';
import { sanitizeQuery } from '../utils/sanitize.js';

let yf;
try {
  yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
} catch {
  yf = null;
}

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

    // Search local simulator database first (instant, always available)
    const simulator = req.app.get('simulator');
    if (simulator) {
      results = simulator.searchStocks(query);
    }

    // If local results are sparse, supplement with Yahoo Finance
    if (results.length < 3 && yf) {
      try {
        const yfResults = await yf.search(query, {
          quotesCount: 10,
          newsCount: 0,
        });

        if (yfResults?.quotes) {
          const yfFiltered = yfResults.quotes
            .filter(q => {
              const sym = (q.symbol || '').toUpperCase();
              return (sym.endsWith('.NS') || sym.endsWith('.BO')) && q.quoteType === 'EQUITY';
            })
            .map(q => ({
              symbol: q.symbol,
              shortName: q.shortname || q.longname || q.symbol,
              longName: q.longname || q.shortname || q.symbol,
              exchange: q.exchange || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'),
              quoteType: q.quoteType,
            }));

          // Merge without duplicates
          const existingSymbols = new Set(results.map(r => r.symbol));
          for (const item of yfFiltered) {
            if (!existingSymbols.has(item.symbol)) {
              results.push(item);
            }
          }
        }
      } catch (err) {
        // Yahoo search failed, use local results only
        console.warn('Yahoo search fallback failed:', err.message);
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
