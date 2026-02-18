import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * LoginPage — Professional dark-themed login form.
 */
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  return (
    <div className="auth-page">
      {/* Left Hero Panel — Desktop/Tablet only */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">
            <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
              <rect width="64" height="64" rx="16" fill="url(#heroG)" />
              <defs><linearGradient id="heroG" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
              <path d="M12 44 L24 28 L34 35 L52 16" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="52" cy="16" r="4" fill="#00d09c" />
            </svg>
            <span className="auth-hero-brand">StockPulse<sup>India</sup></span>
          </div>

          <h2 className="auth-hero-title">Your Gateway to<br />Indian Markets</h2>
          <p className="auth-hero-subtitle">
            Track real-time stock prices, analyze market trends, and manage
            your portfolio with our professional-grade trading terminal.
          </p>

          {/* Animated chart illustration */}
          <div className="auth-hero-chart">
            <svg viewBox="0 0 400 180" fill="none" className="auth-chart-svg">
              <defs>
                <linearGradient id="chartGF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d09c" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00d09c" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(99,102,241,0.08)" />
              <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(99,102,241,0.08)" />
              <line x1="0" y1="135" x2="400" y2="135" stroke="rgba(99,102,241,0.08)" />
              <path d="M0 160 L40 140 L80 148 L120 115 L160 128 L200 95 L240 105 L280 65 L320 75 L360 40 L400 25"
                stroke="#00d09c" strokeWidth="2.5" fill="none" strokeLinecap="round" className="auth-chart-line" />
              <path d="M0 160 L40 140 L80 148 L120 115 L160 128 L200 95 L240 105 L280 65 L320 75 L360 40 L400 25 L400 180 L0 180Z"
                fill="url(#chartGF)" className="auth-chart-fill" />
              {/* Price dots */}
              <circle cx="200" cy="95" r="4" fill="#00d09c" opacity="0.6" className="auth-chart-dot" />
              <circle cx="360" cy="40" r="4" fill="#00d09c" className="auth-chart-dot" />
            </svg>
          </div>

          <div className="auth-hero-features">
            <div className="auth-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d09c" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
              <span>Real-time NSE &amp; BSE Data</span>
            </div>
            <div className="auth-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d09c" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              <span>Advanced Charting &amp; Analytics</span>
            </div>
            <div className="auth-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d09c" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>Secure &amp; Reliable Platform</span>
            </div>
          </div>
        </div>
        <div className="auth-hero-orb auth-hero-orb-1"></div>
        <div className="auth-hero-orb auth-hero-orb-2"></div>
        <div className="auth-hero-grid"></div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <rect width="64" height="64" rx="16" fill="url(#mG)" />
              <defs><linearGradient id="mG" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
              <path d="M12 44 L24 28 L34 35 L52 16" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="52" cy="16" r="4" fill="#00d09c" />
            </svg>
            <span className="auth-mobile-brand">StockPulse<sup>India</sup></span>
          </div>

          <h1 className="auth-form-title">Welcome back</h1>
          <p className="auth-form-subtitle">Sign in to access your trading terminal</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email or Username</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input id="login-email" type="text" className="auth-input" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  autoComplete="email" autoFocus disabled={loading} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input id="login-password" type={showPassword ? 'text' : 'password'} className="auth-input"
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                  autoComplete="current-password" disabled={loading} />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner" /> Signing in...</>
              ) : (
                <>
                  Sign In
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup" className="auth-link">Create one</Link></p>
          </div>

          <div className="auth-trust">
            <div className="auth-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>256-bit SSL</span>
            </div>
            <div className="auth-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              <span>SEBI Registered</span>
            </div>
            <div className="auth-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span>NSE &amp; BSE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
