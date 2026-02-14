/**
 * GET /api/chart/:symbol?range=1d|1w|1mo|3mo|1y
 *
 * Returns historical OHLCV chart data. Uses the MarketSimulator for
 * simulated data, with Yahoo Finance as fallback.
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
const cache = new Cache(60_000);

function getRangeOptions(range) {
  const now = new Date();
  let period1, interval;

  switch (range) {
    case '1d':
      period1 = new Date(now); period1.setDate(period1.getDate() - 1);
      interval = '5m'; break;
    case '1w':
      period1 = new Date(now); period1.setDate(period1.getDate() - 7);
      interval = '15m'; break;
    case '1mo':
      period1 = new Date(now); period1.setMonth(period1.getMonth() - 1);
      interval = '1d'; break;
    case '3mo':
      period1 = new Date(now); period1.setMonth(period1.getMonth() - 3);
      interval = '1d'; break;
    case '1y':
      period1 = new Date(now); period1.setFullYear(period1.getFullYear() - 1);
      interval = '1wk'; break;
    default:
      period1 = new Date(now); period1.setMonth(period1.getMonth() - 1);
      interval = '1d';
  }

  return { period1, period2: now, interval };
}

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    const range = (req.query.range || '1mo').toLowerCase();
    const fullSymbol = ensureExchangeSuffix(symbol);
    const cacheKey = `chart:${fullSymbol}:${range}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Try simulator first
    const simulator = req.app.get('simulator');
    if (simulator) {
      const simData = simulator.getChartData(fullSymbol, range);
      if (simData && simData.data && simData.data.length > 0) {
        cache.set(cacheKey, simData);
        return res.json(simData);
      }
    }

    // Fallback to Yahoo Finance
    if (!yf) {
      return res.status(404).json({ error: 'No chart data available' });
    }

    const { period1, period2, interval } = getRangeOptions(range);

    let result;
    try {
      result = await yf.chart(fullSymbol, { period1, period2, interval });
    } catch {
      return res.status(404).json({ error: 'No chart data available' });
    }

    if (!result || !result.quotes || result.quotes.length === 0) {
      return res.status(404).json({ error: 'No chart data available' });
    }

    const payload = {
      symbol: fullSymbol,
      range,
      data: result.quotes
        .filter(q => q.close != null)
        .map(q => ({
          date: q.date?.toISOString?.() || new Date(q.date).toISOString(),
          open: q.open ?? q.close,
          high: q.high ?? q.close,
          low: q.low ?? q.close,
          close: q.close,
          volume: q.volume ?? 0,
        })),
    };

    cache.set(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error(`Chart error [${req.params.symbol}]:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
