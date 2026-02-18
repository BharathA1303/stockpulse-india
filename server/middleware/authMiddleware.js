/**
 * Auth Middleware — JWT token verification for protected routes.
 *
 * Usage:
 *   import { authenticate, requireRole } from './middleware/authMiddleware.js';
 *   router.get('/protected', authenticate, handler);
 *   router.get('/admin', authenticate, requireRole('admin'), handler);
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'stockpulse_jwt_secret_2024_dev';

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded user to req.user.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Role-based access control middleware.
 * Must be used after authenticate middleware.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Optional auth — attaches user if token present, but doesn't block.
 */
export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Token invalid, continue without user
    }
  }
  next();
}

export { JWT_SECRET };
