/**
 * GET /api/chart/:symbol?range=1d|1w|1mo|3mo|1y
 *
 * Returns historical OHLCV chart data.
 * Priority: Yahoo Finance (free) → Simulator fallback
 */

import { Router } from 'express';
import { getYahooFinanceService } from '../services/yahooFinanceService.js';
import Cache from '../utils/cache.js';
import { sanitizeSymbol, ensureExchangeSuffix } from '../utils/sanitize.js';

const router = Router();
const cache = new Cache(30_000);

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    const range = (req.query.range || '1mo').toLowerCase();
    const validRanges = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1d', '1w', '1mo', '3mo', '1y'];
    const normalizedRange = validRanges.includes(range) ? range : '1mo';
    const fullSymbol = ensureExchangeSuffix(symbol);
    const cacheKey = `chart:${fullSymbol}:${normalizedRange}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // 1. Try Yahoo Finance first (free, no API key needed)
    const yf = getYahooFinanceService();
    try {
      const chartData = await yf.getTimeSeries(fullSymbol, normalizedRange);
      if (chartData && chartData.data && chartData.data.length > 0) {
        chartData.source = 'yahoo';
        cache.set(cacheKey, chartData);
        return res.json(chartData);
      }
    } catch (err) {
      console.warn(`Yahoo Finance chart failed [${fullSymbol}]:`, err.message);
    }

    // 2. Fallback to simulator
    const simulator = req.app.get('simulator');
    if (simulator) {
      const simData = simulator.getChartData(fullSymbol, normalizedRange);
      if (simData && simData.data && simData.data.length > 0) {
        simData.source = 'simulator';
        cache.set(cacheKey, simData);
        return res.json(simData);
      }
    }

    return res.status(404).json({ error: 'No chart data available' });
  } catch (err) {
    console.error(`Chart error [${req.params.symbol}]:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
