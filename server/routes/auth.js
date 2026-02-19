/**
 * Auth Routes — Registration, Login, Profile, Token Refresh, Email Verification.
 *
 * Endpoints:
 *   POST /api/auth/signup            — Create new user (requires verified email)
 *   POST /api/auth/login             — Authenticate and get JWT (requires email OTP)
 *   GET  /api/auth/me                — Get current user profile (protected)
 *   POST /api/auth/refresh           — Refresh JWT token (protected)
 *   POST /api/auth/send-otp          — Send OTP to email
 *   POST /api/auth/verify-otp        — Verify OTP code
 *   POST /api/auth/check-user        — Check if username/email exists
 *   POST /api/auth/login-send-otp    — Send login OTP after credentials check
 *   POST /api/auth/login-verify-otp  — Verify login OTP and complete login
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
import { sendOTP, verifyOTP, isEmailVerified, clearOTP, getOTPTimeRemaining } from '../services/emailService.js';

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

    // Check that email was verified via OTP
    if (!isEmailVerified(email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Email must be verified before creating an account.' });
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

    // Clear OTP after successful signup
    clearOTP(email);

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

// ── POST /send-otp — Send verification code to email (for signup) ──
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email.trim())) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already registered (for signup flow)
    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
    }

    const result = await sendOTP(normalizedEmail, 'verification');

    if (result.success) {
      const timeRemaining = getOTPTimeRemaining(normalizedEmail);
      const response = { success: true, message: result.message, timeRemaining };
      // If email delivery failed, include the OTP so the frontend can show it
      if (result.emailFailed) {
        response.fallbackCode = result.fallbackCode;
        response.message = 'Email could not be delivered. Use the code shown below.';
      }
      return res.json(response);
    } else {
      return res.status(429).json({ error: result.message });
    }
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code.' });
  }
});

// ── POST /verify-otp — Verify the OTP code (for signup) ──
router.post('/verify-otp', (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const result = verifyOTP(email.trim().toLowerCase(), code);

    if (result.success) {
      return res.json({ success: true, message: result.message });
    } else {
      return res.status(400).json({
        error: result.message,
        expired: result.expired || false,
      });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify code.' });
  }
});

// ── POST /check-user — Check if a username/email exists in DB ──
router.post('/check-user', (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required.' });
    }

    const trimmed = identifier.trim().toLowerCase();

    let user = findUserByEmail(trimmed);
    if (!user) {
      user = findUserByUsername(identifier.trim());
    }

    if (user) {
      return res.json({ exists: true, email: user.email });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('Check user error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /login-send-otp — Validate credentials then send login OTP ──
router.post('/login-send-otp', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    // Find user by email or username
    let user = findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      user = findUserByUsername(email.trim());
    }

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please create an account first.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    // Password correct — send OTP to user's registered email
    const result = await sendOTP(user.email, 'login');

    // Mask email for display
    const emailParts = user.email.split('@');
    const maskedLocal = emailParts[0].slice(0, 2) + '***';
    const maskedEmail = maskedLocal + '@' + emailParts[1];
    const timeRemaining = getOTPTimeRemaining(user.email);

    if (result.success) {
      const response = {
        success: true,
        message: `Verification code sent to ${maskedEmail}`,
        maskedEmail,
        timeRemaining,
      };
      // If email delivery failed, include the OTP so the frontend can show it
      if (result.emailFailed) {
        response.fallbackCode = result.fallbackCode;
        response.message = 'Email could not be delivered. Use the code shown below.';
      }
      return res.json(response);
    } else {
      return res.status(429).json({ error: result.message });
    }
  } catch (err) {
    console.error('Login send OTP error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /login-verify-otp — Verify login OTP and complete login ──
router.post('/login-verify-otp', async (req, res) => {
  try {
    const { email, password, code } = req.body;

    if (!email || !password || !code) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Re-find the user
    let user = findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      user = findUserByUsername(email.trim());
    }

    if (!user) {
      return res.status(401).json({ error: 'Account not found.' });
    }

    // Re-verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    // Verify OTP
    const result = verifyOTP(user.email, code);

    if (!result.success) {
      return res.status(400).json({
        error: result.message,
        expired: result.expired || false,
      });
    }

    // OTP verified — complete login
    clearOTP(user.email);
    updateLastLogin(user.id);

    const token = generateToken(user);

    res.json({
      success: true,
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    console.error('Login verify OTP error:', err);
    res.status(500).json({ error: 'Server error during login verification.' });
  }
});

// ── POST /login — Legacy login (kept for backward compat, now requires OTP) ──
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

    // For new flow, require OTP
    return res.status(403).json({
      error: 'Email verification required.',
      requireOTP: true,
      email: user.email,
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
