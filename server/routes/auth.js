/**
 * Auth Routes — Registration, Login, Profile, Token Refresh.
 *
 * Endpoints:
 *   POST /api/auth/signup   — Create new user
 *   POST /api/auth/login    — Authenticate and get JWT
 *   GET  /api/auth/me       — Get current user profile (protected)
 *   POST /api/auth/refresh  — Refresh JWT token (protected)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  updateLastLogin,
  userExists,
} from '../services/authDB.js';
import { authenticate, JWT_SECRET } from '../middleware/authMiddleware.js';

const router = Router();
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

// ── Input validation helpers ──

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name || user.fullName || '',
    role: user.role,
    createdAt: user.created_at || user.createdAt,
    lastLogin: user.last_login || user.lastLogin,
  };
}

// ── POST /signup ──
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters, alphanumeric and underscores only.',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check existing user
    if (userExists(email, username)) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName?.trim() || '',
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── POST /login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email or username
    let user = findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      user = findUserByUsername(email.trim());
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last login
    updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /me (protected) ──
router.get('/me', authenticate, (req, res) => {
  try {
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /refresh (protected) ──
router.post('/refresh', authenticate, (req, res) => {
  try {
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const token = generateToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
