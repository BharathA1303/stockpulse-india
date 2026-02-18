/**
 * AuthDB — JSON-file-backed authentication persistence layer.
 *
 * Stores users in a JSON file (data/users.json) for cross-platform compatibility.
 * No native modules required — works on Render, Railway, Vercel, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

let users = [];
let nextId = 1;
let initialized = false;

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const data = JSON.parse(raw);
      users = data.users || [];
      nextId = data.nextId || (users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1);
    }
  } catch {
    users = [];
    nextId = 1;
  }
}

function saveDB() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({ users, nextId }, null, 2), 'utf-8');
  } catch (err) {
    console.error('AuthDB: failed to save', err.message);
  }
}

export function getAuthDB() {
  if (!initialized) {
    loadDB();
    initialized = true;
    console.log(`🔐 Auth DB loaded (${users.length} users)`);
  }
  return { ready: true };
}

// ── User CRUD ──

export function findUserByEmail(email) {
  return users.find(u => u.email === email) || null;
}

export function findUserByUsername(username) {
  return users.find(u => u.username === username) || null;
}

export function findUserById(id) {
  const u = users.find(u => u.id === id);
  if (!u) return null;
  // Return without password_hash
  const { password_hash, ...safe } = u;
  return safe;
}

export function createUser({ username, email, passwordHash, fullName = '', role = 'user' }) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: nextId++,
    username,
    email,
    password_hash: passwordHash,
    full_name: fullName,
    role,
    created_at: now,
    last_login: null,
  };
  users.push(user);
  saveDB();
  return { id: user.id, username, email, fullName, role };
}

export function updateLastLogin(userId) {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.last_login = Math.floor(Date.now() / 1000);
    saveDB();
  }
}

export function userExists(email, username) {
  return users.some(u => u.email === email || u.username === username);
}
