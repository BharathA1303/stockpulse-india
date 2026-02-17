/**
 * Trading API Routes — REST endpoints for the trading simulation engine.
 *
 * All trading state is stored in SQLite via tradingDB.
 * Endpoints:
 *   GET  /api/trading/account     — account balance, margin, P&L
 *   GET  /api/trading/positions   — open positions
 *   GET  /api/trading/orders      — open + executed orders
 *   POST /api/trading/order       — place a new order
 *   POST /api/trading/close/:id   — close a position
 *   POST /api/trading/cancel/:id  — cancel a limit order
 *   POST /api/trading/reset       — reset account to defaults
 */

import { Router } from 'express';
import {
  getAccount, updateAccount, nextOrderId,
  getOpenPositions, insertPosition, getPositionById, updatePosition,
  getOpenOrders, getExecutedOrders, insertOrder, updateOrder,
  getAllPositions, resetAccount as dbReset,
} from '../services/tradingDB.js';

const router = Router();

// ── GET /account ──
router.get('/account', (_req, res) => {
  try {
    const acc = getAccount();
    res.json(acc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /positions ──
router.get('/positions', (_req, res) => {
  try {
    const open = getOpenPositions();
    const all = getAllPositions();
    const closed = all.filter(p => p.status === 'CLOSED').slice(0, 50);
    res.json({ open, closed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /orders ──
router.get('/orders', (_req, res) => {
  try {
    const open = getOpenOrders();
    const executed = getExecutedOrders(50);
    res.json({ open, executed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /order ──
router.post('/order', (req, res) => {
  try {
    const { symbol, side, quantity, price, type = 'MARKET', limitPrice, product = 'CNC', stopLoss, target } = req.body;

    // Validation
    if (!symbol) return res.status(400).json({ success: false, error: 'Symbol is required' });
    if (!side || !['BUY', 'SELL'].includes(side)) return res.status(400).json({ success: false, error: 'Invalid side' });
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) return res.status(400).json({ success: false, error: 'Quantity must be a positive integer' });
    if (!price || price <= 0) return res.status(400).json({ success: false, error: 'Invalid price' });

    const execPrice = type === 'LIMIT' ? (limitPrice || price) : price;
    if (execPrice <= 0) return res.status(400).json({ success: false, error: 'Invalid execution price' });

    // SL/Target validation — auto-correct instead of rejecting (simulator-friendly)
    let validSL = (stopLoss && stopLoss > 0) ? stopLoss : null;
    let validTarget = (target && target > 0) ? target : null;

    if (validSL) {
      if (side === 'BUY' && validSL >= execPrice) validSL = null; // ignore bad SL
      if (side === 'SELL' && validSL <= execPrice) validSL = null;
    }
    if (validTarget) {
      if (side === 'BUY' && validTarget <= execPrice) validTarget = null;
      if (side === 'SELL' && validTarget >= execPrice) validTarget = null;
    }

    const acc = getAccount();
    const orderValue = execPrice * quantity;

    // CNC SELL — if no existing BUY position, auto-switch to MIS (short sell)
    let finalProduct = product;
    if (side === 'SELL' && product === 'CNC') {
      const openPos = getOpenPositions();
      const existing = openPos.find(p => p.symbol === symbol && p.side === 'BUY');
      if (!existing || existing.quantity < quantity) {
        finalProduct = 'MIS'; // auto-convert to intraday short
      }
    }

    // Balance check for BUY
    if (side === 'BUY') {
      const marginRequired = finalProduct === 'MIS' ? orderValue * 0.2 : orderValue;
      if (marginRequired > acc.balance) {
        return res.status(400).json({ success: false, error: `Insufficient balance. Required: ₹${marginRequired.toFixed(2)}, Available: ₹${acc.balance.toFixed(2)}` });
      }
    }

    // Create order
    const orderId = nextOrderId();
    const order = {
      id: orderId,
      symbol, side, quantity,
      price: execPrice,
      type, product: finalProduct,
      stopLoss: validSL,
      target: validTarget,
      status: type === 'MARKET' ? 'EXECUTED' : 'OPEN',
      timestamp: Date.now(),
      executedAt: type === 'MARKET' ? Date.now() : null,
      note: null,
    };

    insertOrder(order);

    // Execute market order immediately
    if (type === 'MARKET') {
      executeOrder(order);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /close/:id ──
router.post('/close/:id', (req, res) => {
  try {
    const posId = parseInt(req.params.id, 10);
    const { currentPrice } = req.body;

    if (!currentPrice || currentPrice <= 0) return res.status(400).json({ success: false, error: 'Invalid price' });

    const pos = getPositionById(posId);
    if (!pos || pos.status !== 'OPEN') return res.status(400).json({ success: false, error: 'Position not found or already closed' });

    let pnl;
    if (pos.side === 'BUY') {
      pnl = (currentPrice - pos.avgPrice) * pos.quantity;
    } else {
      pnl = (pos.avgPrice - currentPrice) * pos.quantity;
    }

    const acc = getAccount();
    const marginPerShare = pos.product === 'MIS' ? pos.avgPrice * 0.2 : pos.avgPrice;
    const returnAmount = marginPerShare * pos.quantity + pnl;

    updateAccount({
      balance: acc.balance + returnAmount,
      usedMargin: Math.max(0, acc.usedMargin - marginPerShare * pos.quantity),
      realisedPnL: acc.realisedPnL + pnl,
    });

    updatePosition(posId, { status: 'CLOSED', closedAt: Date.now(), exitPrice: currentPrice });

    // Create closing order
    const closingOrderId = nextOrderId();
    insertOrder({
      id: closingOrderId,
      symbol: pos.symbol,
      side: pos.side === 'BUY' ? 'SELL' : 'BUY',
      quantity: pos.quantity,
      price: currentPrice,
      type: 'MARKET',
      product: pos.product,
      stopLoss: null, target: null,
      status: 'EXECUTED',
      timestamp: Date.now(),
      executedAt: Date.now(),
      note: 'Position closed',
    });

    res.json({ success: true, pnl: Math.round(pnl * 100) / 100 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /cancel/:id ──
router.post('/cancel/:id', (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const openOrders = getOpenOrders();
    const order = openOrders.find(o => o.id === orderId);
    if (!order) return res.status(400).json({ success: false, error: 'Order not found' });

    updateOrder(orderId, { status: 'CANCELLED' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /check-triggers ── (call from client on price updates)
router.post('/check-triggers', (req, res) => {
  try {
    const { livePrices } = req.body;
    if (!livePrices) return res.json({ triggered: false });

    let triggered = false;
    const positions = getOpenPositions();

    for (const pos of positions) {
      const tick = livePrices[pos.symbol];
      if (!tick || !tick.price) continue;

      const currentPrice = tick.price;
      let shouldClose = false;

      // Stop Loss
      if (pos.stopLoss && pos.stopLoss > 0) {
        if (pos.side === 'BUY' && currentPrice <= pos.stopLoss) shouldClose = true;
        if (pos.side === 'SELL' && currentPrice >= pos.stopLoss) shouldClose = true;
      }

      // Target
      if (!shouldClose && pos.target && pos.target > 0) {
        if (pos.side === 'BUY' && currentPrice >= pos.target) shouldClose = true;
        if (pos.side === 'SELL' && currentPrice <= pos.target) shouldClose = true;
      }

      if (shouldClose) {
        // Close position
        let pnl;
        if (pos.side === 'BUY') pnl = (currentPrice - pos.avgPrice) * pos.quantity;
        else pnl = (pos.avgPrice - currentPrice) * pos.quantity;

        const acc = getAccount();
        const mps = pos.product === 'MIS' ? pos.avgPrice * 0.2 : pos.avgPrice;
        updateAccount({
          balance: acc.balance + mps * pos.quantity + pnl,
          usedMargin: Math.max(0, acc.usedMargin - mps * pos.quantity),
          realisedPnL: acc.realisedPnL + pnl,
        });

        updatePosition(pos.id, { status: 'CLOSED', closedAt: Date.now(), exitPrice: currentPrice });

        const cid = nextOrderId();
        insertOrder({
          id: cid, symbol: pos.symbol,
          side: pos.side === 'BUY' ? 'SELL' : 'BUY',
          quantity: pos.quantity, price: currentPrice,
          type: 'MARKET', product: pos.product,
          stopLoss: null, target: null,
          status: 'EXECUTED', timestamp: Date.now(), executedAt: Date.now(),
          note: pos.stopLoss && ((pos.side === 'BUY' && currentPrice <= pos.stopLoss) || (pos.side === 'SELL' && currentPrice >= pos.stopLoss))
            ? 'Stop Loss triggered' : 'Target reached',
        });

        triggered = true;
      }
    }

    // Check limit orders
    const openOrders = getOpenOrders();
    for (const order of openOrders) {
      if (order.type !== 'LIMIT') continue;
      const tick = livePrices[order.symbol];
      if (!tick || !tick.price) continue;

      const cp = tick.price;
      if ((order.side === 'BUY' && cp <= order.price) || (order.side === 'SELL' && cp >= order.price)) {
        updateOrder(order.id, { status: 'EXECUTED', executedAt: Date.now() });
        executeOrder({ ...order, status: 'EXECUTED' });
        triggered = true;
      }
    }

    res.json({ triggered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /reset ──
router.post('/reset', (_req, res) => {
  try {
    dbReset();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /add-money ──
router.post('/add-money', (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0 || amount > 10000000) {
      return res.status(400).json({ success: false, error: 'Enter a valid amount (₹1 to ₹1,00,00,000)' });
    }
    const acc = getAccount();
    updateAccount({ balance: acc.balance + amount });
    res.json({ success: true, newBalance: acc.balance + amount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Helper: execute an order (create/update position, adjust balance) ──
function executeOrder(order) {
  const acc = getAccount();

  if (order.side === 'BUY') {
    const orderValue = order.price * order.quantity;
    const marginReq = order.product === 'MIS' ? orderValue * 0.2 : orderValue;

    // Check existing open position to average
    const openPos = getOpenPositions();
    const existing = openPos.find(p => p.symbol === order.symbol && p.side === 'BUY' && p.product === order.product);

    if (existing) {
      const totalQty = existing.quantity + order.quantity;
      const totalVal = (existing.avgPrice * existing.quantity) + (order.price * order.quantity);
      updatePosition(existing.id, {
        avgPrice: totalVal / totalQty,
        quantity: totalQty,
        stopLoss: order.stopLoss || existing.stopLoss,
        target: order.target || existing.target,
      });
    } else {
      insertPosition({
        id: order.id,
        symbol: order.symbol,
        side: 'BUY',
        quantity: order.quantity,
        avgPrice: order.price,
        product: order.product,
        stopLoss: order.stopLoss,
        target: order.target,
        status: 'OPEN',
        openedAt: Date.now(),
      });
    }

    updateAccount({
      balance: acc.balance - marginReq,
      usedMargin: acc.usedMargin + marginReq,
    });
  } else {
    // SELL
    const openPos = getOpenPositions();
    const existingBuy = openPos.find(p => p.symbol === order.symbol && p.side === 'BUY');

    if (existingBuy && existingBuy.quantity >= order.quantity) {
      const pnl = (order.price - existingBuy.avgPrice) * order.quantity;
      const mps = existingBuy.product === 'MIS' ? existingBuy.avgPrice * 0.2 : existingBuy.avgPrice;

      updateAccount({
        balance: acc.balance + mps * order.quantity + pnl,
        usedMargin: Math.max(0, acc.usedMargin - mps * order.quantity),
        realisedPnL: acc.realisedPnL + pnl,
      });

      const newQty = existingBuy.quantity - order.quantity;
      if (newQty <= 0) {
        updatePosition(existingBuy.id, { status: 'CLOSED', closedAt: Date.now(), exitPrice: order.price, quantity: 0 });
      } else {
        updatePosition(existingBuy.id, { quantity: newQty });
      }
    } else {
      // Short sell (MIS only)
      const orderValue = order.price * order.quantity;
      const marginReq = order.product === 'MIS' ? orderValue * 0.2 : orderValue;

      insertPosition({
        id: order.id,
        symbol: order.symbol,
        side: 'SELL',
        quantity: order.quantity,
        avgPrice: order.price,
        product: order.product,
        stopLoss: order.stopLoss,
        target: order.target,
        status: 'OPEN',
        openedAt: Date.now(),
      });

      updateAccount({
        balance: acc.balance - marginReq,
        usedMargin: acc.usedMargin + marginReq,
      });
    }
  }
}

export default router;
