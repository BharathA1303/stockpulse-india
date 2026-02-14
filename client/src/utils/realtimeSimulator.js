/**
 * Real-time stock data simulator.
 * Streams fake tick data when the real API is unavailable,
 * mimicking real broker price feeds with realistic price movements.
 */

const TICK_INTERVAL = 1000; // 1 second between ticks

/**
 * Generate a realistic random walk price movement.
 */
function generateTick(lastPrice, volatility = 0.002) {
  const change = lastPrice * volatility * (Math.random() - 0.48); // slight upward bias
  const newPrice = Math.max(1, lastPrice + change);
  return Math.round(newPrice * 100) / 100;
}

/**
 * Generate a full OHLCV candle from seed price.
 */
function generateCandle(openPrice, timestamp, volatility = 0.005) {
  const high = openPrice * (1 + Math.random() * volatility * 2);
  const low = openPrice * (1 - Math.random() * volatility * 2);
  const close = low + Math.random() * (high - low);
  const volume = Math.floor(50000 + Math.random() * 500000);

  return {
    time: Math.floor(timestamp / 1000),
    open: Math.round(openPrice * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(close * 100) / 100,
    volume,
  };
}

/**
 * Generate historical candles for initial chart load.
 */
export function generateHistoricalCandles(basePrice, count = 200, intervalMs = 300000) {
  const candles = [];
  let price = basePrice * (0.85 + Math.random() * 0.15);
  const now = Date.now();
  const startTime = now - count * intervalMs;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * intervalMs;
    const candle = generateCandle(price, timestamp, 0.006);
    candles.push(candle);
    price = candle.close;
  }

  return candles;
}

/**
 * Generate a simulated order book.
 */
export function generateOrderBook(currentPrice, levels = 10) {
  const bids = [];
  const asks = [];
  const spread = currentPrice * 0.0005;

  for (let i = 0; i < levels; i++) {
    const bidPrice = currentPrice - spread * (i + 1);
    const askPrice = currentPrice + spread * (i + 1);
    const bidQty = Math.floor(50 + Math.random() * 2000);
    const askQty = Math.floor(50 + Math.random() * 2000);
    
    bids.push({
      price: Math.round(bidPrice * 100) / 100,
      quantity: bidQty,
      orders: Math.floor(1 + Math.random() * 20),
      total: 0,
    });
    asks.push({
      price: Math.round(askPrice * 100) / 100,
      quantity: askQty,
      orders: Math.floor(1 + Math.random() * 20),
      total: 0,
    });
  }

  // Calculate cumulative totals
  let bidTotal = 0;
  bids.forEach(b => { bidTotal += b.quantity; b.total = bidTotal; });
  let askTotal = 0;
  asks.forEach(a => { askTotal += a.quantity; a.total = askTotal; });

  return { bids, asks };
}

/**
 * Generate recent trades for the ticker tape.
 */
export function generateRecentTrades(currentPrice, count = 20) {
  const trades = [];
  const now = Date.now();
  let price = currentPrice;

  for (let i = 0; i < count; i++) {
    price = generateTick(price, 0.001);
    const isBuy = Math.random() > 0.45;
    trades.push({
      id: `t-${now}-${i}`,
      price: Math.round(price * 100) / 100,
      quantity: Math.floor(10 + Math.random() * 500),
      time: new Date(now - (count - i) * 2000).toLocaleTimeString('en-IN'),
      type: isBuy ? 'buy' : 'sell',
    });
  }

  return trades;
}

/**
 * Create a real-time price stream.
 * Returns a controller with subscribe/unsubscribe/destroy methods.
 * 
 * @param {number} basePrice - Starting price
 * @param {function} onTick  - Callback for each tick: { price, change, changePercent, volume, high, low, time }
 * @param {number} [intervalMs=1000]
 */
export function createPriceStream(basePrice, onTick, intervalMs = TICK_INTERVAL) {
  let price = basePrice;
  let prevClose = basePrice;
  let dayHigh = basePrice;
  let dayLow = basePrice;
  let totalVolume = 0;
  let intervalId = null;

  const tick = () => {
    price = generateTick(price, 0.0015);
    if (price > dayHigh) dayHigh = price;
    if (price < dayLow) dayLow = price;
    const vol = Math.floor(100 + Math.random() * 5000);
    totalVolume += vol;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    onTick({
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: totalVolume,
      dayHigh: Math.round(dayHigh * 100) / 100,
      dayLow: Math.round(dayLow * 100) / 100,
      lastTradeQty: vol,
      time: new Date().toLocaleTimeString('en-IN'),
      timestamp: Date.now(),
    });
  };

  intervalId = setInterval(tick, intervalMs);
  tick(); // Fire immediately

  return {
    destroy: () => {
      if (intervalId) clearInterval(intervalId);
    },
    getPrice: () => price,
  };
}

/**
 * Create a candle stream that generates new candles periodically.
 * 
 * @param {number} basePrice
 * @param {function} onCandle - callback with new candle data
 * @param {number} [intervalMs=3000] - new candle every 3s (simulated)
 */
export function createCandleStream(basePrice, onCandle, intervalMs = 3000) {
  let price = basePrice;
  let intervalId = null;

  const emitCandle = () => {
    const candle = generateCandle(price, Date.now(), 0.003);
    price = candle.close;
    onCandle(candle);
  };

  intervalId = setInterval(emitCandle, intervalMs);

  return {
    destroy: () => {
      if (intervalId) clearInterval(intervalId);
    },
  };
}
