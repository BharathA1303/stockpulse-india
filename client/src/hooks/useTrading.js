import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTradingEngine } from '../services/tradingEngine';

/**
 * useTrading — React hook for the API-backed trading engine.
 *
 * Subscribes to the TradingEngine singleton, provides reactive state,
 * and periodically checks stop loss / target / limit order triggers.
 *
 * @param {Object} livePrices - Map of symbol => { price, ... } from useLiveMarketStore
 * @returns trading state and action methods
 */
export function useTrading(livePrices = {}) {
  const engine = useMemo(() => getTradingEngine(), []);
  const [state, setState] = useState(() => engine.getState());
  const triggerThrottleRef = useRef(0);

  // Subscribe to engine state changes
  useEffect(() => {
    const unsub = engine.subscribe((newState) => {
      setState(newState);
    });
    setState(engine.getState());
    return unsub;
  }, [engine]);

  // Check triggers when prices change (throttled to every 3s to avoid spamming)
  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return;

    const now = Date.now();
    if (now - triggerThrottleRef.current < 3000) return;
    triggerThrottleRef.current = now;

    // Only check if we have open positions or open orders
    const hasOpen = state.positions.some(p => p.status === 'OPEN') ||
                    state.orders.some(o => o.status === 'OPEN');
    if (hasOpen) {
      engine.checkTriggers(livePrices);
    }
  }, [livePrices, engine, state.positions, state.orders]);

  // Calculate unrealised P&L
  const unrealisedPnL = useMemo(() => {
    return engine.calcUnrealisedPnL(livePrices);
  }, [livePrices, state.positions, engine]);

  // Open positions
  const openPositions = useMemo(() => {
    return state.positions.filter(p => p.status === 'OPEN');
  }, [state.positions]);

  // Closed positions (last 50)
  const closedPositions = useMemo(() => {
    return state.positions
      .filter(p => p.status === 'CLOSED')
      .slice(-50)
      .reverse();
  }, [state.positions]);

  // Open orders
  const openOrders = useMemo(() => {
    return state.orders.filter(o => o.status === 'OPEN');
  }, [state.orders]);

  // Executed orders (last 50)
  const executedOrders = useMemo(() => {
    return state.orders
      .filter(o => o.status === 'EXECUTED')
      .slice(-50)
      .reverse();
  }, [state.orders]);

  // Async wrappers
  const placeOrder = useCallback(async (params) => {
    return await engine.placeOrder(params);
  }, [engine]);

  const closePosition = useCallback(async (posId, currentPrice) => {
    return await engine.closePosition(posId, currentPrice);
  }, [engine]);

  const cancelOrder = useCallback(async (orderId) => {
    return await engine.cancelOrder(orderId);
  }, [engine]);

  const resetAccount = useCallback(async () => {
    await engine.resetAccount();
  }, [engine]);

  const addMoney = useCallback(async (amount) => {
    return await engine.addMoney(amount);
  }, [engine]);

  const getPositionsForSymbol = useCallback((symbol) => {
    return engine.getPositionsForSymbol(symbol);
  }, [engine]);

  return {
    balance: state.balance,
    usedMargin: state.usedMargin,
    realisedPnL: state.realisedPnL,
    unrealisedPnL,
    openPositions,
    closedPositions,
    openOrders,
    executedOrders,
    allOrders: state.orders,
    allPositions: state.positions,
    placeOrder,
    closePosition,
    cancelOrder,
    resetAccount,
    addMoney,
    getPositionsForSymbol,
  };
}
