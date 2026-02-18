import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SignupPage — Professional dark-themed registration form.
 */
export default function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const { fullName, username, email, password, confirmPassword } = form;

    // Validation
    if (!username.trim() || !email.trim() || !password) {
      setError('Username, email, and password are required.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError('Username must be 3-20 characters (letters, numbers, underscores).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, signup, navigate]);

  return (
    <div className="auth-page">
      {/* Left Hero Panel */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">
            <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
              <rect width="64" height="64" rx="16" fill="url(#sHG)" />
              <defs><linearGradient id="sHG" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
              <path d="M12 44 L24 28 L34 35 L52 16" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="52" cy="16" r="4" fill="#00d09c" />
            </svg>
            <span className="auth-hero-brand">StockPulse<sup>India</sup></span>
          </div>
          <h2 className="auth-hero-title">Start Your<br />Trading Journey</h2>
          <p className="auth-hero-subtitle">
            Join thousands of traders using StockPulse to track, analyze,
            and trade Indian stocks in real time.
          </p>
          <div className="auth-hero-chart">
            <svg viewBox="0 0 400 180" fill="none" className="auth-chart-svg">
              <defs><linearGradient id="sChGF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
              <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(99,102,241,0.08)" />
              <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(99,102,241,0.08)" />
              <line x1="0" y1="135" x2="400" y2="135" stroke="rgba(99,102,241,0.08)" />
              <path d="M0 150 L50 130 L100 140 L150 100 L200 110 L250 70 L300 85 L350 45 L400 30"
                stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" className="auth-chart-line" />
              <path d="M0 150 L50 130 L100 140 L150 100 L200 110 L250 70 L300 85 L350 45 L400 30 L400 180 L0 180Z"
                fill="url(#sChGF)" className="auth-chart-fill" />
            </svg>
          </div>
          <div className="auth-hero-features">
            <div className="auth-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d09c" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
              <span>Paper Trading to Practice</span>
            </div>
            <div className="auth-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d09c" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              <span>Multiple Watchlists</span>
            </div>
            <div className="auth-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d09c" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>Free Forever to Get Started</span>
            </div>
          </div>
        </div>
        <div className="auth-hero-orb auth-hero-orb-1"></div>
        <div className="auth-hero-orb auth-hero-orb-2"></div>
        <div className="auth-hero-grid"></div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container auth-form-container-signup">
          <div className="auth-mobile-logo">
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <rect width="64" height="64" rx="16" fill="url(#smG)" />
              <defs><linearGradient id="smG" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
              <path d="M12 44 L24 28 L34 35 L52 16" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="52" cy="16" r="4" fill="#00d09c" />
            </svg>
            <span className="auth-mobile-brand">StockPulse<sup>India</sup></span>
          </div>

          <h1 className="auth-form-title">Create account</h1>
          <p className="auth-form-subtitle">Set up your trading account in seconds</p>

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
              <label className="auth-label" htmlFor="signup-fullname">Full Name</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input id="signup-fullname" type="text" className="auth-input" value={form.fullName}
                  onChange={handleChange('fullName')} placeholder="John Doe" autoComplete="name" disabled={loading} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-username">Username *</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <input id="signup-username" type="text" className="auth-input" value={form.username}
                  onChange={handleChange('username')} placeholder="johndoe" autoComplete="username" autoFocus disabled={loading} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Email *</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                <input id="signup-email" type="email" className="auth-input" value={form.email}
                  onChange={handleChange('email')} placeholder="you@example.com" autoComplete="email" disabled={loading} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Password *</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input id="signup-password" type={showPassword ? 'text' : 'password'} className="auth-input"
                  value={form.password} onChange={handleChange('password')} placeholder="Min 6 characters"
                  autoComplete="new-password" disabled={loading} />
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

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-confirm">Confirm Password *</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <input id="signup-confirm" type="password" className="auth-input" value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')} placeholder="Repeat your password"
                  autoComplete="new-password" disabled={loading} />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner" /> Creating account...</>
              ) : (
                <>
                  Create Account
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
