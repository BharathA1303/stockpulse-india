/**
 * AuthContext — Centralized authentication state management.
 *
 * Provides:
 *   - user state (null when logged out)
 *   - login / signup / logout functions
 *   - loading state during token verification
 *   - Token persistence in localStorage
 *   - Automatic token refresh on mount
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'sp-auth-token';
const USER_KEY = 'sp-auth-user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Persist token and user
  const persistAuth = useCallback((newToken, newUser) => {
    if (newToken && newUser) {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          persistAuth(storedToken, data.user);
        } else {
          // Token invalid — clear
          persistAuth(null, null);
        }
      } catch {
        // Server unreachable — keep cached user for offline UX
        // but don't clear auth (allows offline viewing)
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Login failed';
        setError(errMsg);
        throw new Error(errMsg);
      }

      persistAuth(data.token, data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [persistAuth]);

  const signup = useCallback(async ({ username, email, password, fullName }) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Signup failed';
        setError(errMsg);
        throw new Error(errMsg);
      }

      persistAuth(data.token, data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [persistAuth]);

  const logout = useCallback(() => {
    persistAuth(null, null);
  }, [persistAuth]);

  const getAuthHeader = useCallback(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    signup,
    logout,
    getAuthHeader,
  }), [user, token, loading, error, login, signup, logout, getAuthHeader]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
