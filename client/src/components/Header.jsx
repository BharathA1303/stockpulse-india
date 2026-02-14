import SearchAutocomplete from './SearchAutocomplete';
import { isMarketOpen } from '../utils/formatters';

/**
 * Premium header bar with logo, search, market status badge, and dark mode toggle.
 * - Removed ws-badge "Live" text per user request
 * - Market closed = red, Market open = green
 */
export default function Header({ onSelectStock, darkMode, onToggleDarkMode, isMobile, onSearchOpen }) {
  const marketOpen = isMarketOpen();

  return (
    <header className={`header ${isMobile ? 'header-mobile' : ''}`} role="banner">
      <div className="header-left">
        <div className="logo" aria-label="StockPulse India">
          <div className="logo-icon">
            <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <rect width="36" height="36" rx="10" fill="url(#logoGrad)" />
              <path d="M7 25 L14 15 L20 20 L29 9" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="29" cy="9" r="2.5" fill="#00d09c" />
            </svg>
          </div>
          {!isMobile && (
            <h1 className="logo-text">
              StockPulse <span className="logo-india">India</span>
            </h1>
          )}
        </div>
      </div>

      {/* Desktop search */}
      {!isMobile && (
        <div className="header-center">
          <SearchAutocomplete onSelect={onSelectStock} />
        </div>
      )}

      <div className="header-right">
        {/* Mobile search button */}
        {isMobile && onSearchOpen && (
          <button className="mobile-search-btn" onClick={onSearchOpen} aria-label="Search stocks">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}

        <div
          className={`market-status-badge ${marketOpen ? 'open' : 'closed'}`}
          aria-label={`Market is ${marketOpen ? 'open' : 'closed'}`}
        >
          <span className="status-dot" />
          {isMobile ? (marketOpen ? 'Open' : 'Closed') : (marketOpen ? 'Market Open' : 'Market Closed')}
        </div>

        <button
          className="theme-toggle"
          onClick={onToggleDarkMode}
          aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
        >
          {darkMode ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
