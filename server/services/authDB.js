/**
 * AuthDB — SQLite-backed authentication persistence layer.
 *
 * Tables:
 *   - users: id, username, email, password_hash, role, created_at
 *
 * Uses better-sqlite3 for synchronous, fast, single-file DB.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'auth.db');

let db;

export function getAuthDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initAuthTables();
  }
  return db;
}

function initAuthTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      last_login INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
}

// ── User CRUD ──

export function findUserByEmail(email) {
  const db = getAuthDB();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function findUserByUsername(username) {
  const db = getAuthDB();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findUserById(id) {
  const db = getAuthDB();
  return db.prepare('SELECT id, username, email, full_name, role, created_at, last_login FROM users WHERE id = ?').get(id);
}

export function createUser({ username, email, passwordHash, fullName = '', role = 'user' }) {
  const db = getAuthDB();
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(username, email, passwordHash, fullName, role);
  return { id: result.lastInsertRowid, username, email, fullName, role };
}

export function updateLastLogin(userId) {
  const db = getAuthDB();
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Math.floor(Date.now() / 1000), userId);
}

export function userExists(email, username) {
  const db = getAuthDB();
  const row = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  return !!row;
}
