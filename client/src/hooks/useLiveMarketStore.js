import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useLiveMarketStore — Centralized live price store backed by WebSocket.
 *
 * Maintains live prices for ALL symbols (stocks + indices) from the
 * WebSocket `tick:all` event. Prevents duplicate subscriptions and
 * stale closures. Components read from this store for real-time prices.
 *
 * @param {Object} ws - The useWebSocket() return value
 * @returns {{ prices, getPrice, subscribeSymbols }}
 */
export function useLiveMarketStore(ws) {
  const [prices, setPrices] = useState({});
  const subscribedRef = useRef(new Set());

  // Update prices from allTicks (broadcasted by server every ~2s)
  useEffect(() => {
    if (!ws.allTicks || typeof ws.allTicks !== 'object') return;
    const tickEntries = Object.entries(ws.allTicks);
    if (tickEntries.length === 0) return;

    setPrices(prev => {
      const next = { ...prev };
      for (const [symbol, tick] of tickEntries) {
        next[symbol] = {
          symbol,
          price: tick.price,
          change: tick.change,
          changePercent: tick.changePercent,
          volume: tick.volume,
          dayHigh: tick.dayHigh,
          dayLow: tick.dayLow,
          timestamp: tick.timestamp || Date.now(),
        };
      }
      return next;
    });
  }, [ws.allTicks]);

  // Also update from individual liveTick for the subscribed symbol
  useEffect(() => {
    if (!ws.liveTick) return;
    const tick = ws.liveTick;
    setPrices(prev => ({
      ...prev,
      [tick.symbol]: {
        symbol: tick.symbol,
        price: tick.price,
        change: tick.change,
        changePercent: tick.changePercent,
        volume: tick.volume,
        dayHigh: tick.dayHigh,
        dayLow: tick.dayLow,
        timestamp: tick.timestamp || Date.now(),
      },
    }));
  }, [ws.liveTick]);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol) => {
    return prices[symbol] || null;
  }, [prices]);

  // Subscribe to additional symbols (for indices etc.)
  const subscribeSymbols = useCallback((symbols) => {
    if (!ws.socket || !ws.connected) return;
    for (const sym of symbols) {
      if (!subscribedRef.current.has(sym)) {
        subscribedRef.current.add(sym);
        // We don't need per-symbol subscribe for price updates;
        // tick:all already includes all symbols including indices.
        // Only the "main" symbol needs subscribe for orderbook/trades.
      }
    }
  }, [ws.socket, ws.connected]);

  return { prices, getPrice, subscribeSymbols };
}
