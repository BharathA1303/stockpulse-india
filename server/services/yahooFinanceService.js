/**
 * YahooFinanceService — Free stock data from Yahoo Finance API.
 *
 * Provides real-time quotes and historical chart data for Indian
 * NSE/BSE equities without requiring an API key.
 *
 * Uses Yahoo Finance v8 chart endpoint which returns both quote
 * metadata and OHLCV time series in a single call.
 */

import Cache from '../utils/cache.js';

const BASE_URL = 'https://query1.finance.yahoo.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Map internal range to Yahoo Finance range + interval
const RANGE_CONFIG = {
  '1m':  { range: '1d',  interval: '1m'  },
  '2m':  { range: '1d',  interval: '2m'  },
  '3m':  { range: '1d',  interval: '5m'  },
  '5m':  { range: '1d',  interval: '5m'  },
  '10m': { range: '5d',  interval: '15m' },
  '15m': { range: '5d',  interval: '15m' },
  '30m': { range: '5d',  interval: '30m' },
  '1h':  { range: '5d',  interval: '60m' },
  '4h':  { range: '1mo', interval: '60m' },
  '1d':  { range: '1d',  interval: '5m'  },
  '1w':  { range: '5d',  interval: '15m' },
  '1mo': { range: '1mo', interval: '1d'  },
  '3mo': { range: '3mo', interval: '1d'  },
  '1y':  { range: '1y',  interval: '1wk' },
};

// Map internal index symbols to Yahoo Finance symbols
const INDEX_MAP = {
  '^NSEI':        '^NSEI',
  '^BSESN':       '^BSESN',
  '^NSEBANK':     '^NSEBANK',
  '^NSEI_MIDCAP': 'NIFTY_MID_SELECT.NS',
  '^NSEI_FIN':    'NIFTY_FIN_SERVICE.NS',
  '^NSEI_IT':     '^CNXIT',
};

class YahooFinanceService {
  constructor() {
    this.quoteCache = new Cache(15_000);   // 15s TTL
    this.chartCache = new Cache(60_000);   // 60s TTL
    this.searchCache = new Cache(120_000); // 2min TTL
  }

  /**
   * Convert internal symbol to Yahoo Finance format.
   * Yahoo uses .NS for NSE and .BO for BSE — same as our internal format.
   */
  convertSymbol(internalSymbol) {
    if (INDEX_MAP[internalSymbol]) return INDEX_MAP[internalSymbol];
    // Already in Yahoo format (RELIANCE.NS)
    return internalSymbol;
  }

  /**
   * Fetch helper with error handling.
   */
  async _fetch(url) {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Get a real-time quote for a symbol.
   * Uses the chart endpoint with range=1d to get current price + metadata.
   */
  async getQuote(internalSymbol) {
    const cacheKey = `yf-q:${internalSymbol}`;
    const cached = this.quoteCache.get(cacheKey);
    if (cached) return cached;

    const yahooSymbol = this.convertSymbol(internalSymbol);
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=5m`;

    const data = await this._fetch(url);
    const chartResult = data?.chart?.result?.[0];
    if (!chartResult) throw new Error('No quote data returned');

    const meta = chartResult.meta;
    const quotes = chartResult.indicators?.quote?.[0];

    // Get the last valid close price from today's data
    const closes = quotes?.close?.filter(v => v != null) || [];
    const lastClose = closes.length > 0 ? closes[closes.length - 1] : meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || lastClose;
    const change = lastClose - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    const result = {
      symbol: internalSymbol,
      shortName: meta.shortName || yahooSymbol.replace(/\.(NS|BO)$/, ''),
      longName: meta.longName || meta.shortName || yahooSymbol,
      price: meta.regularMarketPrice || lastClose,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      previousClose: prevClose,
      open: quotes?.open?.find(v => v != null) || meta.regularMarketPrice,
      dayHigh: meta.regularMarketDayHigh || Math.max(...(quotes?.high?.filter(v => v != null) || [0])),
      dayLow: meta.regularMarketDayLow || Math.min(...(quotes?.low?.filter(v => v != null && v > 0) || [0])),
      volume: meta.regularMarketVolume || 0,
      marketCap: 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      exchange: meta.fullExchangeName || meta.exchangeName || 'NSE',
      marketState: meta.hasPrePostMarketData ? 'REGULAR' : (new Date().getHours() >= 9 && new Date().getHours() < 16 ? 'REGULAR' : 'CLOSED'),
      currency: meta.currency || 'INR',
      peRatio: null,
      pbRatio: null,
      eps: null,
      dividendYield: null,
      bookValue: null,
      source: 'yahoo',
    };

    this.quoteCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get historical OHLCV data for charting.
   */
  async getTimeSeries(internalSymbol, range) {
    const config = RANGE_CONFIG[range] || RANGE_CONFIG['1mo'];
    const cacheKey = `yf-ts:${internalSymbol}:${range}`;
    const cached = this.chartCache.get(cacheKey);
    if (cached) return cached;

    const yahooSymbol = this.convertSymbol(internalSymbol);
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${config.range}&interval=${config.interval}`;

    const data = await this._fetch(url);
    const chartResult = data?.chart?.result?.[0];
    if (!chartResult) throw new Error('No chart data returned');

    const timestamps = chartResult.timestamp || [];
    const quotes = chartResult.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Skip null/invalid data points
      if (closes[i] == null || opens[i] == null) continue;

      const d = new Date(timestamps[i] * 1000);
      const dateStr = config.interval.includes('m') || config.interval.includes('h')
        ? d.toISOString().slice(0, 16).replace('T', ' ')  // "2026-02-18 10:30"
        : d.toISOString().slice(0, 10);                     // "2026-02-18"

      candles.push({
        date: dateStr,
        open: parseFloat(opens[i]?.toFixed(2)) || closes[i],
        high: parseFloat(highs[i]?.toFixed(2)) || closes[i],
        low: parseFloat(lows[i]?.toFixed(2)) || closes[i],
        close: parseFloat(closes[i]?.toFixed(2)),
        volume: volumes[i] || 0,
      });
    }

    if (candles.length === 0) throw new Error('No valid candle data');

    const result = {
      symbol: internalSymbol,
      range,
      source: 'yahoo',
      data: candles,
    };

    this.chartCache.set(cacheKey, result);
    return result;
  }

  /**
   * Search for symbols using Yahoo Finance autocomplete.
   */
  async searchSymbols(query) {
    const cacheKey = `yf-s:${query.toLowerCase()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;

    const data = await this._fetch(url);
    if (!data.quotes || !Array.isArray(data.quotes)) return [];

    const results = data.quotes
      .filter(item => {
        const ex = (item.exchange || '').toUpperCase();
        return ex === 'NSI' || ex === 'NSE' || ex === 'BSE' || ex === 'BOM' ||
               (item.symbol && (item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO')));
      })
      .map(item => ({
        symbol: item.symbol,
        shortName: item.shortname || item.symbol.replace(/\.(NS|BO)$/, ''),
        longName: item.longname || item.shortname || item.symbol,
        exchange: item.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
        quoteType: item.quoteType || 'EQUITY',
      }));

    this.searchCache.set(cacheKey, results);
    return results;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let instance = null;

/**
 * Get the shared YahooFinanceService instance.
 * Always available — no API key needed.
 */
export function getYahooFinanceService() {
  if (!instance) {
    instance = new YahooFinanceService();
    console.log('📈 Yahoo Finance service initialized (free, no API key needed)');
  }
  return instance;
}

export default YahooFinanceService;
