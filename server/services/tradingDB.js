/**
 * TradingDB — JSON-file-backed trading persistence layer.
 *
 * Stores account, positions, and orders in a JSON file for cross-platform
 * compatibility. No native modules required.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'trading.json');

const DEFAULT_ACCOUNT = {
  balance: 1000000,
  usedMargin: 0,
  realisedPnL: 0,
  orderIdCounter: 1,
};

let data = { account: { ...DEFAULT_ACCOUNT }, positions: [], orders: [] };
let initialized = false;

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      data.account = parsed.account || { ...DEFAULT_ACCOUNT };
      data.positions = parsed.positions || [];
      data.orders = parsed.orders || [];
    }
  } catch {
    data = { account: { ...DEFAULT_ACCOUNT }, positions: [], orders: [] };
  }
}

function saveDB() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('TradingDB: failed to save', err.message);
  }
}

export function getDB() {
  if (!initialized) {
    loadDB();
    initialized = true;
    console.log('💰 Trading DB loaded');
  }
  return { ready: true };
}

// ── Account helpers ──

export function getAccount() {
  getDB();
  return { ...data.account };
}

export function updateAccount(fields) {
  getDB();
  if (fields.balance !== undefined) data.account.balance = fields.balance;
  if (fields.usedMargin !== undefined) data.account.usedMargin = fields.usedMargin;
  if (fields.realisedPnL !== undefined) data.account.realisedPnL = fields.realisedPnL;
  if (fields.orderIdCounter !== undefined) data.account.orderIdCounter = fields.orderIdCounter;
  saveDB();
}

export function nextOrderId() {
  const acc = getAccount();
  const id = acc.orderIdCounter;
  updateAccount({ orderIdCounter: id + 1 });
  return id;
}

// ── Positions ──

export function getOpenPositions() {
  getDB();
  return data.positions.filter(p => p.status === 'OPEN');
}

export function getAllPositions() {
  getDB();
  return [...data.positions].reverse().slice(0, 200);
}

export function getPositionById(id) {
  getDB();
  return data.positions.find(p => p.id === id) || null;
}

export function insertPosition(pos) {
  getDB();
  data.positions.push({
    id: pos.id,
    symbol: pos.symbol,
    side: pos.side,
    quantity: pos.quantity,
    avgPrice: pos.avgPrice,
    product: pos.product,
    stopLoss: pos.stopLoss || null,
    target: pos.target || null,
    status: pos.status || 'OPEN',
    openedAt: pos.openedAt || Date.now(),
    closedAt: null,
    exitPrice: null,
  });
  saveDB();
}

export function updatePosition(id, fields) {
  getDB();
  const pos = data.positions.find(p => p.id === id);
  if (!pos) return;
  if (fields.quantity !== undefined) pos.quantity = fields.quantity;
  if (fields.avgPrice !== undefined) pos.avgPrice = fields.avgPrice;
  if (fields.stopLoss !== undefined) pos.stopLoss = fields.stopLoss;
  if (fields.target !== undefined) pos.target = fields.target;
  if (fields.status !== undefined) pos.status = fields.status;
  if (fields.closedAt !== undefined) pos.closedAt = fields.closedAt;
  if (fields.exitPrice !== undefined) pos.exitPrice = fields.exitPrice;
  saveDB();
}

// ── Orders ──

export function getOpenOrders() {
  getDB();
  return data.orders.filter(o => o.status === 'OPEN');
}

export function getExecutedOrders(limit = 50) {
  getDB();
  return data.orders
    .filter(o => o.status === 'EXECUTED')
    .reverse()
    .slice(0, limit);
}

export function getAllOrders(limit = 200) {
  getDB();
  return [...data.orders].reverse().slice(0, limit);
}

export function insertOrder(order) {
  getDB();
  data.orders.push({
    id: order.id,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    price: order.price,
    type: order.type,
    product: order.product,
    stopLoss: order.stopLoss || null,
    target: order.target || null,
    status: order.status,
    timestamp: order.timestamp || Date.now(),
    executedAt: order.executedAt || null,
    note: order.note || null,
  });
  saveDB();
}

export function updateOrder(id, fields) {
  getDB();
  const order = data.orders.find(o => o.id === id);
  if (!order) return;
  if (fields.status !== undefined) order.status = fields.status;
  if (fields.executedAt !== undefined) order.executedAt = fields.executedAt;
  if (fields.note !== undefined) order.note = fields.note;
  saveDB();
}

// ── Reset ──

export function resetAccount() {
  data.account = { ...DEFAULT_ACCOUNT };
  data.positions = [];
  data.orders = [];
  saveDB();
}
