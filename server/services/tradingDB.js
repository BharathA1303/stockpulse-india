/**
 * TradingDB — SQLite-backed trading persistence layer.
 *
 * Tables:
 *   - account       : single-row, holds balance + realised P&L
 *   - positions      : open & closed positions
 *   - orders         : all orders (MARKET/LIMIT, OPEN/EXECUTED/CANCELLED)
 *
 * Uses better-sqlite3 for synchronous, fast, single-file DB.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'trading.db');

let db;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance REAL NOT NULL DEFAULT 1000000,
      used_margin REAL NOT NULL DEFAULT 0,
      realised_pnl REAL NOT NULL DEFAULT 0,
      order_id_counter INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
      quantity INTEGER NOT NULL,
      avg_price REAL NOT NULL,
      product TEXT NOT NULL CHECK (product IN ('CNC', 'MIS')),
      stop_loss REAL,
      target REAL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
      opened_at INTEGER NOT NULL,
      closed_at INTEGER,
      exit_price REAL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('MARKET', 'LIMIT')),
      product TEXT NOT NULL CHECK (product IN ('CNC', 'MIS')),
      stop_loss REAL,
      target REAL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'EXECUTED', 'CANCELLED')),
      timestamp INTEGER NOT NULL,
      executed_at INTEGER,
      note TEXT
    );

    -- Ensure account row exists
    INSERT OR IGNORE INTO account (id, balance, used_margin, realised_pnl, order_id_counter)
    VALUES (1, 1000000, 0, 0, 1);
  `);
}

// ── Account helpers ──

export function getAccount() {
  const row = getDB().prepare('SELECT * FROM account WHERE id = 1').get();
  return {
    balance: row.balance,
    usedMargin: row.used_margin,
    realisedPnL: row.realised_pnl,
    orderIdCounter: row.order_id_counter,
  };
}

export function updateAccount(fields) {
  const sets = [];
  const vals = {};
  if (fields.balance !== undefined) { sets.push('balance = @balance'); vals.balance = fields.balance; }
  if (fields.usedMargin !== undefined) { sets.push('used_margin = @usedMargin'); vals.usedMargin = fields.usedMargin; }
  if (fields.realisedPnL !== undefined) { sets.push('realised_pnl = @realisedPnL'); vals.realisedPnL = fields.realisedPnL; }
  if (fields.orderIdCounter !== undefined) { sets.push('order_id_counter = @orderIdCounter'); vals.orderIdCounter = fields.orderIdCounter; }
  if (sets.length === 0) return;
  getDB().prepare(`UPDATE account SET ${sets.join(', ')} WHERE id = 1`).run(vals);
}

export function nextOrderId() {
  const acc = getAccount();
  const id = acc.orderIdCounter;
  updateAccount({ orderIdCounter: id + 1 });
  return id;
}

// ── Positions ──

export function getOpenPositions() {
  return getDB().prepare("SELECT * FROM positions WHERE status = 'OPEN'").all().map(mapPosition);
}

export function getAllPositions() {
  return getDB().prepare('SELECT * FROM positions ORDER BY id DESC LIMIT 200').all().map(mapPosition);
}

export function getPositionById(id) {
  const row = getDB().prepare('SELECT * FROM positions WHERE id = ?').get(id);
  return row ? mapPosition(row) : null;
}

export function insertPosition(pos) {
  getDB().prepare(`
    INSERT INTO positions (id, symbol, side, quantity, avg_price, product, stop_loss, target, status, opened_at)
    VALUES (@id, @symbol, @side, @quantity, @avgPrice, @product, @stopLoss, @target, @status, @openedAt)
  `).run({
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
  });
}

export function updatePosition(id, fields) {
  const sets = [];
  const vals = { id };
  if (fields.quantity !== undefined) { sets.push('quantity = @quantity'); vals.quantity = fields.quantity; }
  if (fields.avgPrice !== undefined) { sets.push('avg_price = @avgPrice'); vals.avgPrice = fields.avgPrice; }
  if (fields.stopLoss !== undefined) { sets.push('stop_loss = @stopLoss'); vals.stopLoss = fields.stopLoss; }
  if (fields.target !== undefined) { sets.push('target = @target'); vals.target = fields.target; }
  if (fields.status !== undefined) { sets.push('status = @status'); vals.status = fields.status; }
  if (fields.closedAt !== undefined) { sets.push('closed_at = @closedAt'); vals.closedAt = fields.closedAt; }
  if (fields.exitPrice !== undefined) { sets.push('exit_price = @exitPrice'); vals.exitPrice = fields.exitPrice; }
  if (sets.length === 0) return;
  getDB().prepare(`UPDATE positions SET ${sets.join(', ')} WHERE id = @id`).run(vals);
}

function mapPosition(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    avgPrice: row.avg_price,
    product: row.product,
    stopLoss: row.stop_loss,
    target: row.target,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    exitPrice: row.exit_price,
  };
}

// ── Orders ──

export function getOpenOrders() {
  return getDB().prepare("SELECT * FROM orders WHERE status = 'OPEN'").all().map(mapOrder);
}

export function getExecutedOrders(limit = 50) {
  return getDB().prepare("SELECT * FROM orders WHERE status = 'EXECUTED' ORDER BY id DESC LIMIT ?").all(limit).map(mapOrder);
}

export function getAllOrders(limit = 200) {
  return getDB().prepare('SELECT * FROM orders ORDER BY id DESC LIMIT ?').all(limit).map(mapOrder);
}

export function insertOrder(order) {
  getDB().prepare(`
    INSERT INTO orders (id, symbol, side, quantity, price, type, product, stop_loss, target, status, timestamp, executed_at, note)
    VALUES (@id, @symbol, @side, @quantity, @price, @type, @product, @stopLoss, @target, @status, @timestamp, @executedAt, @note)
  `).run({
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
}

export function updateOrder(id, fields) {
  const sets = [];
  const vals = { id };
  if (fields.status !== undefined) { sets.push('status = @status'); vals.status = fields.status; }
  if (fields.executedAt !== undefined) { sets.push('executed_at = @executedAt'); vals.executedAt = fields.executedAt; }
  if (fields.note !== undefined) { sets.push('note = @note'); vals.note = fields.note; }
  if (sets.length === 0) return;
  getDB().prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = @id`).run(vals);
}

function mapOrder(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    type: row.type,
    product: row.product,
    stopLoss: row.stop_loss,
    target: row.target,
    status: row.status,
    timestamp: row.timestamp,
    executedAt: row.executed_at,
    note: row.note,
  };
}

// ── Reset ──

export function resetAccount() {
  const d = getDB();
  d.prepare("DELETE FROM positions").run();
  d.prepare("DELETE FROM orders").run();
  d.prepare("UPDATE account SET balance = 1000000, used_margin = 0, realised_pnl = 0, order_id_counter = 1 WHERE id = 1").run();
}
