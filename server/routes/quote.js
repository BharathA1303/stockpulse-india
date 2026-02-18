/**
 * GET /api/quote/:symbol
 *
 * Returns stock quote data.
 * Priority: Yahoo Finance (free) → Simulator fallback
 */

import { Router } from 'express';
import { getYahooFinanceService } from '../services/yahooFinanceService.js';
import Cache from '../utils/cache.js';
import { sanitizeSymbol, ensureExchangeSuffix } from '../utils/sanitize.js';

const router = Router();
const cache = new Cache(10_000); // 10-second TTL for fresh sim data

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    const fullSymbol = ensureExchangeSuffix(symbol);
    const cacheKey = `quote:${fullSymbol}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // 1. Try Yahoo Finance first (free, no API key needed)
    const yf = getYahooFinanceService();
    try {
      const quote = await yf.getQuote(fullSymbol);
      if (quote && quote.price > 0) {
        quote.source = 'yahoo';
        cache.set(cacheKey, quote);
        return res.json(quote);
      }
    } catch (err) {
      console.warn(`Yahoo Finance quote failed [${fullSymbol}]:`, err.message);
    }

    // 2. Fallback to simulator
    const simulator = req.app.get('simulator');
    if (simulator) {
      const simQuote = simulator.getQuote(fullSymbol);
      if (simQuote) {
        simQuote.source = 'simulator';
        cache.set(cacheKey, simQuote);
        return res.json(simQuote);
      }
    }

    return res.status(404).json({ error: 'Symbol not found' });
  } catch (err) {
    console.error(`Quote error [${req.params.symbol}]:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch quote data' });
  }
});

export default router;
