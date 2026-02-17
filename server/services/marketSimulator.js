/**
 * MarketSimulator — Professional real-time market data simulation engine.
 *
 * Loads stock fundamentals from CSV, generates realistic historical OHLCV data,
 * and runs a continuous tick engine using Geometric Brownian Motion (GBM)
 * for realistic price movements. Provides APIs for quotes, chart data,
 * order books, and trade feeds.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Box-Muller transform for normally distributed random numbers */
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Round to 2 decimal places */
const r2 = (n) => Math.round(n * 100) / 100;

/** Parse CSV row respecting commas in quoted values */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      const v = vals[idx];
      row[h] = isNaN(v) || v === '' ? v : parseFloat(v);
    });
    rows.push(row);
  }
  return rows;
}

// ─── MarketSimulator Class ──────────────────────────────────────────────────

export default class MarketSimulator {
  constructor() {
    this.stocks = new Map();
    this.historicalCache = new Map();
    this.tickInterval = null;
    this.listeners = [];
    this.tradeId = 0;
    this._loadStocks();
  }

  /** Load stock data from CSV */
  _loadStocks() {
    const csvPath = join(__dirname, '..', 'data', 'stocks.csv');
    const raw = readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(raw);

    for (const row of rows) {
      const symbol = row.symbol;
      const basePrice = row.basePrice || 1000;

      // Add slight randomness so each server start is unique
      const jitter = 1 + (Math.random() - 0.5) * 0.01;
      const currentPrice = r2(basePrice * jitter);

      this.stocks.set(symbol, {
        // Identity
        symbol,
        name: row.name,
        shortName: row.name,
        sector: row.sector,
        industry: row.industry,
        exchange: row.exchange || 'NSE',

        // Prices
        basePrice,
        currentPrice,
        previousClose: row.previousClose || r2(basePrice * 0.998),
        open: r2(currentPrice + (Math.random() - 0.5) * basePrice * 0.005),
        dayHigh: r2(currentPrice * (1 + Math.random() * 0.008)),
        dayLow: r2(currentPrice * (1 - Math.random() * 0.008)),
        fiftyTwoWeekHigh: row.fiftyTwoWeekHigh || r2(basePrice * 1.25),
        fiftyTwoWeekLow: row.fiftyTwoWeekLow || r2(basePrice * 0.75),

        // Volume
        volume: 0,
        avgVolume: row.avgVolume || 10000000,
        lastTradeQty: 0,

        // Fundamentals
        marketCap: row.marketCap || basePrice * 5e9,
        peRatio: row.peRatio || null,
        pbRatio: row.pbRatio || null,
        eps: row.eps || null,
        bookValue: row.bookValue || null,
        dividendYield: row.dividendYield || null,
        beta: row.beta || 1.0,

        // Simulation state
        volatility: (row.beta || 1.0) * 0.20, // annualized vol scaled by beta
        drift: 0.00005,
        lastTickTime: Date.now(),
        marketState: 'REGULAR',
        currency: 'INR',
      });
    }

    // Add market indices as synthetic stocks
    const indices = [
      { symbol: '^NSEI', name: 'NIFTY 50', sector: 'Indices', industry: 'Market Index', exchange: 'NSE', basePrice: 25000, previousClose: 24950, fiftyTwoWeekHigh: 26500, fiftyTwoWeekLow: 21800, marketCap: 0, beta: 0.9 },
      { symbol: '^BSESN', name: 'S&P BSE SENSEX', sector: 'Indices', industry: 'Market Index', exchange: 'BSE', basePrice: 82000, previousClose: 81800, fiftyTwoWeekHigh: 86000, fiftyTwoWeekLow: 71000, marketCap: 0, beta: 0.9 },
      { symbol: '^NSEBANK', name: 'NIFTY BANK', sector: 'Indices', industry: 'Market Index', exchange: 'NSE', basePrice: 55000, previousClose: 54800, fiftyTwoWeekHigh: 58500, fiftyTwoWeekLow: 44000, marketCap: 0, beta: 1.1 },
      { symbol: '^NSEI_MIDCAP', name: 'NIFTY MIDCAP 50', sector: 'Indices', industry: 'Market Index', exchange: 'NSE', basePrice: 13500, previousClose: 13450, fiftyTwoWeekHigh: 15200, fiftyTwoWeekLow: 10800, marketCap: 0, beta: 1.15 },
      { symbol: '^NSEI_FIN', name: 'NIFTY FINANCIAL', sector: 'Indices', industry: 'Market Index', exchange: 'NSE', basePrice: 28000, previousClose: 27900, fiftyTwoWeekHigh: 30500, fiftyTwoWeekLow: 22000, marketCap: 0, beta: 1.05 },
      { symbol: '^NSEI_IT', name: 'NIFTY IT', sector: 'Indices', industry: 'Market Index', exchange: 'NSE', basePrice: 42000, previousClose: 41900, fiftyTwoWeekHigh: 45000, fiftyTwoWeekLow: 33000, marketCap: 0, beta: 1.2 },
    ];

    for (const idx of indices) {
      const jitter = 1 + (Math.random() - 0.5) * 0.005;
      const currentPrice = r2(idx.basePrice * jitter);
      this.stocks.set(idx.symbol, {
        symbol: idx.symbol, name: idx.name, shortName: idx.name,
        sector: idx.sector, industry: idx.industry, exchange: idx.exchange,
        basePrice: idx.basePrice, currentPrice, previousClose: idx.previousClose,
        open: r2(currentPrice + (Math.random() - 0.5) * idx.basePrice * 0.002),
        dayHigh: r2(currentPrice * (1 + Math.random() * 0.005)),
        dayLow: r2(currentPrice * (1 - Math.random() * 0.005)),
        fiftyTwoWeekHigh: idx.fiftyTwoWeekHigh, fiftyTwoWeekLow: idx.fiftyTwoWeekLow,
        volume: 0, avgVolume: 50000000, lastTradeQty: 0,
        marketCap: idx.marketCap, peRatio: null, pbRatio: null,
        eps: null, bookValue: null, dividendYield: null, beta: idx.beta,
        volatility: idx.beta * 0.15, drift: 0.00003, lastTickTime: Date.now(),
        marketState: 'REGULAR', currency: 'INR',
      });
    }

    console.log(`📊 Market simulator loaded ${this.stocks.size} stocks (incl. indices)`);
  }

  /** Start the tick engine */
  start(intervalMs = 1000) {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this._tick(), intervalMs);
    console.log('⚡ Market simulator started');
  }

  /** Stop the tick engine */
  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /** Subscribe to tick events */
  onTick(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  /** Run one simulation tick — updates all stocks */
  _tick() {
    const updates = [];
    const now = Date.now();

    for (const [symbol, stock] of this.stocks) {
      // Geometric Brownian Motion
      const dt = 1 / (252 * 6.5 * 3600); // ~1 second in trading-year time
      const sigma = stock.volatility;
      const mu = stock.drift;
      const z = gaussianRandom();
      const dS = stock.currentPrice * (mu * dt + sigma * Math.sqrt(dt) * z);

      stock.currentPrice = r2(Math.max(1, stock.currentPrice + dS));

      // Update day high/low
      if (stock.currentPrice > stock.dayHigh) stock.dayHigh = stock.currentPrice;
      if (stock.currentPrice < stock.dayLow) stock.dayLow = stock.currentPrice;

      // Simulate volume per tick
      const tickVol = Math.floor(50 + Math.random() * stock.avgVolume / 6000);
      stock.volume += tickVol;
      stock.lastTradeQty = tickVol;
      stock.lastTickTime = now;

      const change = r2(stock.currentPrice - stock.previousClose);
      const changePercent = r2((change / stock.previousClose) * 100);

      updates.push({
        symbol,
        price: stock.currentPrice,
        change,
        changePercent,
        volume: stock.volume,
        dayHigh: stock.dayHigh,
        dayLow: stock.dayLow,
        lastTradeQty: tickVol,
        timestamp: now,
      });
    }

    // Notify listeners
    for (const fn of this.listeners) {
      try { fn(updates); } catch (e) { console.error('Tick listener error:', e); }
    }
  }

  // ─── Public APIs ──────────────────────────────────────────────────────────

  /** Get all stock symbols */
  getSymbols() {
    return Array.from(this.stocks.keys());
  }

  /** Get stock quote data (REST-compatible format) */
  getQuote(symbol) {
    const stock = this.stocks.get(symbol);
    if (!stock) return null;

    const change = r2(stock.currentPrice - stock.previousClose);
    const changePercent = r2((change / stock.previousClose) * 100);

    return {
      symbol: stock.symbol,
      shortName: stock.name,
      longName: stock.name,
      price: stock.currentPrice,
      change,
      changePercent,
      previousClose: stock.previousClose,
      open: stock.open,
      dayHigh: stock.dayHigh,
      dayLow: stock.dayLow,
      volume: stock.volume,
      marketCap: stock.marketCap,
      fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: stock.fiftyTwoWeekLow,
      exchange: stock.exchange,
      marketState: stock.marketState,
      currency: stock.currency,
      peRatio: stock.peRatio,
      pbRatio: stock.pbRatio,
      eps: stock.eps,
      bookValue: stock.bookValue,
      dividendYield: stock.dividendYield,
      sector: stock.sector || null,
      industry: stock.industry || null,
      avgVolume: stock.avgVolume || null,
      beta: stock.beta || null,
    };
  }

  /** Get all quotes (for ticker tape) */
  getAllQuotes() {
    const quotes = [];
    for (const symbol of this.stocks.keys()) {
      quotes.push(this.getQuote(symbol));
    }
    return quotes;
  }

  /** Generate historical OHLCV candles for charting */
  getChartData(symbol, range = '1mo') {
    const stock = this.stocks.get(symbol);
    if (!stock) return null;

    const cacheKey = `${symbol}:${range}`;
    if (this.historicalCache.has(cacheKey)) {
      return this.historicalCache.get(cacheKey);
    }

    const configs = {
      // Minute-level intraday: each candle = 1 unit of that minute interval
      '1m':  { count: 120, intervalMs: 1 * 60 * 1000,   volatility: 0.0008,  type: 'intraday' },
      '2m':  { count: 120, intervalMs: 2 * 60 * 1000,   volatility: 0.0012,  type: 'intraday' },
      '3m':  { count: 100, intervalMs: 3 * 60 * 1000,   volatility: 0.0014,  type: 'intraday' },
      '5m':  { count: 78,  intervalMs: 5 * 60 * 1000,   volatility: 0.0018,  type: 'intraday' },
      '10m': { count: 78,  intervalMs: 10 * 60 * 1000,  volatility: 0.0022,  type: 'intraday' },
      '15m': { count: 78,  intervalMs: 15 * 60 * 1000,  volatility: 0.0028,  type: 'intraday' },
      '30m': { count: 78,  intervalMs: 30 * 60 * 1000,  volatility: 0.0035,  type: 'intraday' },
      '1h':  { count: 78,  intervalMs: 60 * 60 * 1000,  volatility: 0.0045,  type: 'intraday' },
      '4h':  { count: 60,  intervalMs: 4 * 60 * 60 * 1000, volatility: 0.006, type: 'intraday' },
      // Daily+ candles
      '1d':  { count: 78,  intervalMs: 5 * 60 * 1000,   volatility: 0.003,   type: 'today' },
      '1w':  { count: 200, intervalMs: 15 * 60 * 1000,  volatility: 0.004,   type: 'week' },
      '1mo': { count: 30,  intervalMs: 24 * 60 * 60 * 1000, volatility: 0.012, type: 'daily' },
      '3mo': { count: 90,  intervalMs: 24 * 60 * 60 * 1000, volatility: 0.010, type: 'daily' },
      '1y':  { count: 252, intervalMs: 24 * 60 * 60 * 1000, volatility: 0.015, type: 'daily' },
    };

    const cfg = configs[range] || configs['1mo'];
    const candles = this._generateCandles(stock.basePrice, cfg.count, cfg.intervalMs, cfg.volatility, range);

    const result = { symbol, range, data: candles };
    this.historicalCache.set(cacheKey, result);
    setTimeout(() => this.historicalCache.delete(cacheKey), 5 * 60 * 1000);
    return result;
  }

  /** Generate realistic OHLCV candles using random walk */
  _generateCandles(basePrice, count, intervalMs, volatility, range) {
    const candles = [];
    let price = basePrice * (0.93 + Math.random() * 0.07);
    const now = Date.now();

    // Calculate start time based on range type
    let startTime;
    const cfg = {
      '1m':  () => now - count * 60 * 1000,
      '2m':  () => now - count * 2 * 60 * 1000,
      '3m':  () => now - count * 3 * 60 * 1000,
      '5m':  () => now - count * 5 * 60 * 1000,
      '10m': () => now - count * 10 * 60 * 1000,
      '15m': () => now - count * 15 * 60 * 1000,
      '30m': () => now - count * 30 * 60 * 1000,
      '1h':  () => now - count * 60 * 60 * 1000,
      '4h':  () => now - count * 4 * 60 * 60 * 1000,
      '1d':  () => { const d = new Date(); d.setHours(9, 15, 0, 0); return d.getTime(); },
      '1w':  () => now - 7 * 24 * 60 * 60 * 1000,
      '1y':  () => now - 365 * 24 * 60 * 60 * 1000,
    };
    startTime = cfg[range] ? cfg[range]() : now - count * intervalMs;

    // Determine if we should skip weekends
    const isDailyOrMore = intervalMs >= 24 * 60 * 60 * 1000;

    // Scale volume based on range
    const baseVol = range === '1m' || range === '2m' || range === '3m'
      ? 5000 + Math.random() * 30000
      : range === '5m' || range === '10m'
        ? 20000 + Math.random() * 80000
        : 50000 + Math.random() * 500000;

    for (let i = 0; i < count; i++) {
      const timestamp = startTime + i * intervalMs;

      // Skip weekends for daily+ candles
      if (isDailyOrMore) {
        const day = new Date(timestamp).getDay();
        if (day === 0 || day === 6) continue;
      }

      // Don't generate future candles
      if (timestamp > now) break;

      const open = r2(price);

      // Generate realistic intra-candle price action with trend bias
      const trendBias = (Math.random() > 0.5 ? 1 : -1) * price * volatility * 0.3;
      const change = price * volatility * gaussianRandom() + trendBias * 0.1;
      const close = r2(Math.max(1, open + change));

      // High and low extend beyond open/close with proper wicks
      const wickUp = Math.abs(price * volatility * gaussianRandom() * 0.6);
      const wickDown = Math.abs(price * volatility * gaussianRandom() * 0.6);
      const high = r2(Math.max(open, close) + wickUp);
      const low = r2(Math.max(1, Math.min(open, close) - wickDown));

      const volume = Math.floor(baseVol * (0.5 + Math.random()));

      candles.push({
        date: new Date(timestamp).toISOString(),
        open,
        high,
        low,
        close,
        volume,
      });

      price = Math.max(1, close);
    }

    return candles;
  }

  /** Generate a realistic order book */
  getOrderBook(symbol, levels = 5) {
    const stock = this.stocks.get(symbol);
    if (!stock) return { bids: [], asks: [] };

    const price = stock.currentPrice;
    const spread = price * 0.0005;
    const bids = [];
    const asks = [];

    for (let i = 0; i < levels; i++) {
      const bidPrice = r2(price - spread * (i + 1) - Math.random() * spread * 0.3);
      const askPrice = r2(price + spread * (i + 1) + Math.random() * spread * 0.3);
      const bidQty = Math.floor(50 + Math.random() * 2000);
      const askQty = Math.floor(50 + Math.random() * 2000);

      bids.push({ price: bidPrice, quantity: bidQty, orders: Math.floor(1 + Math.random() * 20), total: 0 });
      asks.push({ price: askPrice, quantity: askQty, orders: Math.floor(1 + Math.random() * 20), total: 0 });
    }

    // Cumulative totals
    let bt = 0, at = 0;
    bids.forEach(b => { bt += b.quantity; b.total = bt; });
    asks.forEach(a => { at += a.quantity; a.total = at; });

    return { bids, asks, spread: r2(asks[0].price - bids[0].price) };
  }

  /** Generate recent trades */
  getRecentTrades(symbol, count = 30) {
    const stock = this.stocks.get(symbol);
    if (!stock) return [];

    const trades = [];
    let price = stock.currentPrice;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const change = price * 0.001 * gaussianRandom();
      price = r2(Math.max(1, price + change));
      const isBuy = Math.random() > 0.45;
      const ts = now - (count - i) * 1500;

      trades.push({
        id: `t-${++this.tradeId}`,
        price,
        quantity: Math.floor(10 + Math.random() * 500),
        time: ts,
        type: isBuy ? 'buy' : 'sell',
        timestamp: ts,
      });
    }

    return trades;
  }

  /** Search stocks by query (name or symbol) */
  searchStocks(query) {
    if (!query || query.length < 1) return [];

    const q = query.toLowerCase();
    const results = [];

    for (const [, stock] of this.stocks) {
      const symMatch = stock.symbol.toLowerCase().includes(q);
      const nameMatch = stock.name.toLowerCase().includes(q);
      const sectorMatch = stock.sector.toLowerCase().includes(q);

      if (symMatch || nameMatch || sectorMatch) {
        results.push({
          symbol: stock.symbol,
          shortName: stock.name,
          longName: stock.name,
          exchange: stock.exchange,
          sector: stock.sector,
          quoteType: 'EQUITY',
          price: stock.currentPrice,
          change: r2(stock.currentPrice - stock.previousClose),
          changePercent: r2(((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100),
        });
      }
    }

    // Sort: exact symbol match first, then name match
    results.sort((a, b) => {
      const aExact = a.symbol.toLowerCase().startsWith(q) ? 0 : 1;
      const bExact = b.symbol.toLowerCase().startsWith(q) ? 0 : 1;
      return aExact - bExact;
    });

    return results.slice(0, 20);
  }
}
