/**
 * GET /api/quote/:symbol
 *
 * Returns stock quote data. Uses the MarketSimulator as the primary source
 * and falls back to Yahoo Finance for stocks not in the simulator.
 */

import { Router } from 'express';
import YahooFinance from 'yahoo-finance2';
import Cache from '../utils/cache.js';
import { sanitizeSymbol, ensureExchangeSuffix } from '../utils/sanitize.js';

let yf;
try {
  yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
} catch {
  yf = null;
}

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

    // Try simulator first (always has live data)
    const simulator = req.app.get('simulator');
    if (simulator) {
      const simQuote = simulator.getQuote(fullSymbol);
      if (simQuote) {
        cache.set(cacheKey, simQuote);
        return res.json(simQuote);
      }
    }

    // Fallback to Yahoo Finance for unknown symbols
    if (!yf) {
      return res.status(404).json({ error: 'Symbol not found in simulator' });
    }

    let quote;
    try {
      quote = await yf.quote(fullSymbol);
    } catch {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    if (!quote) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    const payload = {
      symbol: quote.symbol,
      shortName: quote.shortName || quote.longName || symbol,
      longName: quote.longName || quote.shortName || symbol,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      previousClose: quote.regularMarketPreviousClose ?? 0,
      open: quote.regularMarketOpen ?? 0,
      dayHigh: quote.regularMarketDayHigh ?? 0,
      dayLow: quote.regularMarketDayLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      marketCap: quote.marketCap ?? 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
      exchange: quote.exchange || '',
      marketState: quote.marketState || 'CLOSED',
      currency: quote.currency || 'INR',
      peRatio: quote.trailingPE ?? null,
      pbRatio: quote.priceToBook ?? null,
      eps: quote.epsTrailingTwelveMonths ?? null,
      dividendYield: quote.dividendYield ?? null,
      bookValue: quote.bookValue ?? null,
    };

    cache.set(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error(`Quote error [${req.params.symbol}]:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch quote data' });
  }
});

export default router;
