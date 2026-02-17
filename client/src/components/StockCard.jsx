import { formatINR, formatChange, formatPercent, formatVolume, formatLargeNumber } from '../utils/formatters';

/**
 * Premium stock card with price display, range bars, stats grid, and fundamentals.
 * Inspired by Groww / Tickertape layouts.
 */
export default function StockCard({ data, loading, error, onAddToWatchlist, isInWatchlist, onRetry }) {
  if (loading) {
    return (
      <div className="stock-card skeleton" aria-busy="true" aria-label="Loading stock data">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-price" />
        <div className="skeleton-line skeleton-meta" />
        <div className="skeleton-line skeleton-meta" style={{ width: '60%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-line skeleton-stat" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-card stock-card-error" role="alert">
        <div className="error-icon">⚠️</div>
        <p className="error-message">{error}</p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const isUp = data.change >= 0;

  // Calculate position for range bars
  const calcRangePosition = (low, high, current) => {
    if (!low || !high || high === low) return 50;
    return Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  };

  const dayPosition = calcRangePosition(data.dayLow, data.dayHigh, data.price);
  const yearPosition = calcRangePosition(data.fiftyTwoWeekLow, data.fiftyTwoWeekHigh, data.price);

  return (
    <article className="stock-card" aria-label={`Stock details for ${data.shortName}`}>
      {/* Header: Name + Watchlist button */}
      <div className="stock-card-header">
        <div className="stock-name-section">
          <h2 className="stock-name">{data.shortName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span className="stock-symbol">{data.symbol}</span>
            {data.exchange && (
              <span className="stock-exchange-tag">{data.exchange}</span>
            )}
          </div>
        </div>
        <button
          className={`watchlist-btn ${isInWatchlist ? 'active' : ''}`}
          onClick={() => onAddToWatchlist(data.symbol)}
          aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isInWatchlist ? '★' : '☆'}
        </button>
      </div>

      {/* Price + Change */}
      <div className="stock-price-section">
        <span className="stock-price">{formatINR(data.price)}</span>
        <span className={`stock-change ${isUp ? 'up' : 'down'}`}>
          <svg className="change-arrow" width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
            {isUp
              ? <path d="M5 1L9 7H1L5 1Z" />
              : <path d="M5 9L1 3H9L5 9Z" />
            }
          </svg>
          {formatChange(data.change)} ({formatPercent(data.changePercent)})
        </span>
      </div>

      {/* Range Bars — Today's & 52W (Groww style) */}
      <div className="price-range-section">
        {/* Today's Range */}
        <div style={{ marginBottom: '16px' }}>
          <div className="range-label">Today&apos;s Range</div>
          <div className="range-values">
            <span className="range-low">{formatINR(data.dayLow)}</span>
            <span className="range-high">{formatINR(data.dayHigh)}</span>
          </div>
          <div className="range-bar-container">
            <div className="range-bar-marker" style={{ left: `${dayPosition}%` }} />
          </div>
        </div>

        {/* 52-Week Range */}
        <div>
          <div className="range-label">52 Week Range</div>
          <div className="range-values">
            <span className="range-low">{formatINR(data.fiftyTwoWeekLow)}</span>
            <span className="range-high">{formatINR(data.fiftyTwoWeekHigh)}</span>
          </div>
          <div className="range-bar-container">
            <div className="range-bar-marker" style={{ left: `${yearPosition}%` }} />
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="stock-stats">
        <div className="stat">
          <span className="stat-label">Open</span>
          <span className="stat-value">{formatINR(data.open)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Prev. Close</span>
          <span className="stat-value">{formatINR(data.previousClose)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Day High</span>
          <span className="stat-value">{formatINR(data.dayHigh)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Day Low</span>
          <span className="stat-value">{formatINR(data.dayLow)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Volume</span>
          <span className="stat-value">{formatVolume(data.volume)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Mkt Cap</span>
          <span className="stat-value">₹{formatLargeNumber(data.marketCap)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">52W High</span>
          <span className="stat-value">{formatINR(data.fiftyTwoWeekHigh)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">52W Low</span>
          <span className="stat-value">{formatINR(data.fiftyTwoWeekLow)}</span>
        </div>
      </div>

      {/* Fundamentals (if available) */}
      {(data.peRatio || data.pbRatio || data.eps || data.bookValue) && (
        <div className="stock-fundamentals">
          {data.peRatio != null && (
            <div className="fundamental-item">
              <div className="fundamental-label">P/E Ratio</div>
              <div className="fundamental-value">{data.peRatio.toFixed(2)}</div>
            </div>
          )}
          {data.pbRatio != null && (
            <div className="fundamental-item">
              <div className="fundamental-label">P/B Ratio</div>
              <div className="fundamental-value">{data.pbRatio.toFixed(2)}</div>
            </div>
          )}
          {data.eps != null && (
            <div className="fundamental-item">
              <div className="fundamental-label">EPS</div>
              <div className="fundamental-value">₹{data.eps.toFixed(2)}</div>
            </div>
          )}
          {data.bookValue != null && (
            <div className="fundamental-item">
              <div className="fundamental-label">Book Value</div>
              <div className="fundamental-value">₹{data.bookValue.toFixed(2)}</div>
            </div>
          )}
          {data.dividendYield != null && data.dividendYield > 0 && (
            <div className="fundamental-item">
              <div className="fundamental-label">Div. Yield</div>
              <div className="fundamental-value">{(data.dividendYield * 100).toFixed(2)}%</div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
