/**
 * TradingEngine — API-backed trading simulation engine.
 *
 * All state is persisted in SQLite on the server via REST endpoints.
 * The client fetches state and sends actions to the server.
 */

const API = 'http://localhost:5000/api/trading';

/**
 * Create a new TradingEngine that talks to the server API.
 */
export function createTradingEngine() {
  let state = {
    balance: 1000000,
    usedMargin: 0,
    positions: [],
    orders: [],
    realisedPnL: 0,
  };
  let listeners = [];
  let syncing = false;

  function notify() {
    for (const fn of listeners) {
      try { fn({ ...state }); } catch { /* ignore */ }
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  function getState() {
    return { ...state };
  }

  /** Sync all state from server */
  async function syncFromServer() {
    if (syncing) return;
    syncing = true;
    try {
      const [accRes, posRes, ordRes] = await Promise.all([
        fetch(`${API}/account`),
        fetch(`${API}/positions`),
        fetch(`${API}/orders`),
      ]);
      const acc = await accRes.json();
      const pos = await posRes.json();
      const ord = await ordRes.json();

      state.balance = acc.balance;
      state.usedMargin = acc.usedMargin;
      state.realisedPnL = acc.realisedPnL;
      state.positions = [...(pos.open || []), ...(pos.closed || [])];
      state.orders = [...(ord.open || []), ...(ord.executed || [])];

      notify();
    } catch (err) {
      console.error('Trading sync error:', err);
    } finally {
      syncing = false;
    }
  }

  // Initial sync
  syncFromServer();

  /**
   * Place an order via the server API.
   */
  async function placeOrder(params) {
    try {
      const res = await fetch(`${API}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const result = await res.json();

      if (result.success) {
        await syncFromServer();
      }
      return result;
    } catch (err) {
      console.error('placeOrder fetch error:', err);
      return { success: false, error: 'Server unavailable — is the backend running?' };
    }
  }

  /**
   * Close a position via the server API.
   */
  async function closePosition(positionId, currentPrice) {
    try {
      const res = await fetch(`${API}/close/${positionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPrice }),
      });
      const result = await res.json();

      if (result.success) {
        await syncFromServer();
      }
      return result;
    } catch (err) {
      console.error('closePosition fetch error:', err);
      return { success: false, error: 'Server unavailable — is the backend running?' };
    }
  }

  /**
   * Cancel an order via the server API.
   */
  async function cancelOrder(orderId) {
    try {
      const res = await fetch(`${API}/cancel/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();

      if (result.success) {
        await syncFromServer();
      }
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Check stop loss, target, and limit orders via the server.
   */
  async function checkTriggers(livePrices) {
    try {
      const res = await fetch(`${API}/check-triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livePrices }),
      });
      const result = await res.json();

      if (result.triggered) {
        await syncFromServer();
      }
      return result.triggered;
    } catch {
      return false;
    }
  }

  /**
   * Calculate unrealised P&L locally (no server call needed).
   */
  function calcUnrealisedPnL(livePrices) {
    let total = 0;
    for (const pos of state.positions) {
      if (pos.status !== 'OPEN') continue;
      const priceData = livePrices[pos.symbol];
      if (!priceData) continue;

      if (pos.side === 'BUY') {
        total += (priceData.price - pos.avgPrice) * pos.quantity;
      } else {
        total += (pos.avgPrice - priceData.price) * pos.quantity;
      }
    }
    return Math.round(total * 100) / 100;
  }

  /**
   * Reset account via the server API.
   */
  async function resetAccount() {
    try {
      const res = await fetch(`${API}/reset`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        // Force state reset immediately for UI
        state.balance = 1000000;
        state.usedMargin = 0;
        state.realisedPnL = 0;
        state.positions = [];
        state.orders = [];
        notify();
        // Then sync from server to confirm
        await syncFromServer();
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  }

  /**
   * Add money to account via the server API.
   */
  async function addMoney(amount) {
    try {
      const res = await fetch(`${API}/add-money`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const result = await res.json();
      if (result.success) {
        await syncFromServer();
      }
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function getPositionsForSymbol(symbol) {
    return state.positions.filter(p => p.symbol === symbol && p.status === 'OPEN');
  }

  function getOpenPositions() {
    return state.positions.filter(p => p.status === 'OPEN');
  }

  return {
    subscribe,
    getState,
    placeOrder,
    closePosition,
    cancelOrder,
    checkTriggers,
    calcUnrealisedPnL,
    resetAccount,
    addMoney,
    getPositionsForSymbol,
    getOpenPositions,
    syncFromServer,
  };
}

// Singleton instance
let _instance = null;
export function getTradingEngine() {
  if (!_instance) {
    _instance = createTradingEngine();
  }
  return _instance;
}
