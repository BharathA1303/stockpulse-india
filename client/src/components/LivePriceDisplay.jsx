import { useState, useEffect, useRef } from 'react';
import { formatINR, formatChange, formatPercent, formatVolume } from '../utils/formatters';

/**
 * Real-time live price display panel.
 * Receives live tick data from WebSocket and shows streaming price
 * with tick flash animations.
 */
export default function LivePriceDisplay({ stockData, symbol, liveTick, isInWatchlist, onToggleWatchlist, compact, showOnlyFundamentals }) {
  const [tickDirection, setTickDirection] = useState(null);
  const prevPriceRef = useRef(null);
  const tickTimeoutRef = useRef(null);

  // Detect tick direction for flash animation
  useEffect(() => {
    if (!stockData?.price) return;

    const prevPrice = prevPriceRef.current;
    if (prevPrice !== null) {
      if (stockData.price > prevPrice) setTickDirection('up');
      else if (stockData.price < prevPrice) setTickDirection('down');

      if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
      tickTimeoutRef.current = setTimeout(() => setTickDirection(null), 300);
    }
    prevPriceRef.current = stockData.price;

    return () => {
      if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
    };
  }, [stockData?.price]);

  if (!stockData) return null;

  const isUp = (stockData.change || 0) >= 0;

  const calcRange = (low, high, cur) => {
    if (!low || !high || high === low) return 50;
    return Math.min(100, Math.max(0, ((cur - low) / (high - low)) * 100));
  };

  // ── Fundamentals ONLY (no stats grid, no ranges, no overview data) ──
  if (showOnlyFundamentals) {
    return (
      <div className="live-price-panel">
        {/* 52W Range — belongs with fundamentals */}
        <div className="lp-ranges">
          <div className="lp-range">
            <div className="lp-range-header">
              <span>52W Range</span>
              <span className="lp-range-values">{formatINR(stockData.fiftyTwoWeekLow)} — {formatINR(stockData.fiftyTwoWeekHigh)}</span>
            </div>
            <div className="lp-range-bar">
              <div className="lp-range-fill" style={{ width: `${calcRange(stockData.fiftyTwoWeekLow, stockData.fiftyTwoWeekHigh, stockData.price)}%` }} />
              <div className="lp-range-marker" style={{ left: `${calcRange(stockData.fiftyTwoWeekLow, stockData.fiftyTwoWeekHigh, stockData.price)}%` }} />
            </div>
          </div>
        </div>
        {/* Fundamentals */}
        {(stockData.peRatio || stockData.pbRatio || stockData.eps) && (
          <div className="lp-fundamentals">
            <h4>Fundamentals</h4>
            <div className="lp-fund-grid">
              {stockData.peRatio != null && (
                <div className="lp-fund-item"><span className="lp-fund-label">P/E</span><span className="lp-fund-value">{Number(stockData.peRatio).toFixed(2)}</span></div>
              )}
              {stockData.pbRatio != null && (
                <div className="lp-fund-item"><span className="lp-fund-label">P/B</span><span className="lp-fund-value">{Number(stockData.pbRatio).toFixed(2)}</span></div>
              )}
              {stockData.eps != null && (
                <div className="lp-fund-item"><span className="lp-fund-label">EPS</span><span className="lp-fund-value">₹{Number(stockData.eps).toFixed(2)}</span></div>
              )}
              {stockData.bookValue != null && (
                <div className="lp-fund-item"><span className="lp-fund-label">Book Val</span><span className="lp-fund-value">₹{Number(stockData.bookValue).toFixed(2)}</span></div>
              )}
              {stockData.dividendYield != null && stockData.dividendYield > 0 && (
                <div className="lp-fund-item"><span className="lp-fund-label">Div Yield</span><span className="lp-fund-value">{(stockData.dividendYield * 100).toFixed(2)}%</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Compact overview (for mobile Overview tab): stats + today's range, no fundamentals ──
  if (compact) {
    return (
      <div className="live-price-panel compact">
        {/* Stats — overview data ONLY */}
        <div className="lp-stats-grid">
          <div className="lp-stat"><span className="lp-stat-label">Open</span><span className="lp-stat-value">{formatINR(stockData.open)}</span></div>
          <div className="lp-stat"><span className="lp-stat-label">Prev Close</span><span className="lp-stat-value">{formatINR(stockData.previousClose)}</span></div>
          <div className="lp-stat"><span className="lp-stat-label">Day High</span><span className="lp-stat-value green">{formatINR(stockData.dayHigh)}</span></div>
          <div className="lp-stat"><span className="lp-stat-label">Day Low</span><span className="lp-stat-value red">{formatINR(stockData.dayLow)}</span></div>
          <div className="lp-stat"><span className="lp-stat-label">Volume</span><span className="lp-stat-value">{formatVolume(stockData.volume)}</span></div>
          <div className="lp-stat"><span className="lp-stat-label">Mkt Cap</span><span className="lp-stat-value">₹{formatLargeShort(stockData.marketCap)}</span></div>
        </div>
        {/* Today's Range — belongs with overview */}
        <div className="lp-ranges">
          <div className="lp-range">
            <div className="lp-range-header">
              <span>Today's Range</span>
              <span className="lp-range-values">{formatINR(stockData.dayLow)} — {formatINR(stockData.dayHigh)}</span>
            </div>
            <div className="lp-range-bar">
              <div className="lp-range-fill" style={{ width: `${calcRange(stockData.dayLow, stockData.dayHigh, stockData.price)}%` }} />
              <div className="lp-range-marker" style={{ left: `${calcRange(stockData.dayLow, stockData.dayHigh, stockData.price)}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full desktop/tablet view (header + price + stats + ranges + fundamentals + extras) ──

  // Derived calculations
  const vwap = stockData.volume > 0
    ? ((stockData.dayHigh + stockData.dayLow + stockData.price) / 3)
    : null;
  const upperCircuit = stockData.previousClose ? stockData.previousClose * 1.20 : null;
  const lowerCircuit = stockData.previousClose ? stockData.previousClose * 0.80 : null;
  const avgTradePrice = stockData.volume > 0
    ? ((stockData.open + stockData.price) / 2)
    : null;

  return (
    <div className="live-price-panel">
      {/* Header */}
      <div className="lp-header">
        <div className="lp-symbol-info">
          <h2 className="lp-stock-name">{stockData.shortName || symbol}</h2>
          <div className="lp-symbol-row">
            <span className="lp-symbol">{stockData.symbol || symbol}</span>
            {stockData.exchange && <span className="lp-exchange">{stockData.exchange}</span>}
            <span className={`lp-market-state ${stockData.marketState === 'REGULAR' ? 'open' : 'closed'}`}>
              {stockData.marketState === 'REGULAR' ? 'LIVE' : 'CLOSED'}
            </span>
          </div>
          {/* Sector & Industry */}
          {stockData.sector && (
            <div className="lp-sector-row">
              <span className="lp-sector-tag">{stockData.sector}</span>
              {stockData.industry && stockData.industry !== stockData.sector && (
                <span className="lp-industry-tag">{stockData.industry}</span>
              )}
            </div>
          )}
        </div>
        {onToggleWatchlist && (
          <button
            className={`watchlist-action-btn-inline ${isInWatchlist ? 'active' : ''}`}
            onClick={onToggleWatchlist}
            title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            {isInWatchlist ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Price */}
      <div className="lp-price-block">
        <span className={`lp-price ${tickDirection === 'up' ? 'tick-up' : tickDirection === 'down' ? 'tick-down' : ''}`}>
          {formatINR(stockData.price)}
        </span>
        <div className={`lp-change-block ${isUp ? 'up' : 'down'}`}>
          <svg className="change-arrow" width="14" height="14" viewBox="0 0 10 10" fill="currentColor">
            {isUp
              ? <path d="M5 1L9 7H1L5 1Z" />
              : <path d="M5 9L1 3H9L5 9Z" />
            }
          </svg>
          <span className="lp-change-value">{formatChange(stockData.change)}</span>
          <span className="lp-change-pct">({formatPercent(stockData.changePercent)})</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="lp-stats-grid">
        <div className="lp-stat">
          <span className="lp-stat-label">Open</span>
          <span className="lp-stat-value">{formatINR(stockData.open)}</span>
        </div>
        <div className="lp-stat">
          <span className="lp-stat-label">Prev Close</span>
          <span className="lp-stat-value">{formatINR(stockData.previousClose)}</span>
        </div>
        <div className="lp-stat">
          <span className="lp-stat-label">Day High</span>
          <span className="lp-stat-value green">{formatINR(stockData.dayHigh)}</span>
        </div>
        <div className="lp-stat">
          <span className="lp-stat-label">Day Low</span>
          <span className="lp-stat-value red">{formatINR(stockData.dayLow)}</span>
        </div>
        <div className="lp-stat">
          <span className="lp-stat-label">Volume</span>
          <span className="lp-stat-value">{formatVolume(stockData.volume)}</span>
        </div>
        <div className="lp-stat">
          <span className="lp-stat-label">Mkt Cap</span>
          <span className="lp-stat-value">₹{formatLargeShort(stockData.marketCap)}</span>
        </div>
      </div>

      {/* Additional Trading Info */}
      <div className="lp-trading-info">
        <h4>Trading Info</h4>
        <div className="lp-stats-grid">
          {stockData.avgVolume != null && (
            <div className="lp-stat">
              <span className="lp-stat-label">Avg Volume</span>
              <span className="lp-stat-value">{formatVolume(stockData.avgVolume)}</span>
            </div>
          )}
          {vwap != null && (
            <div className="lp-stat">
              <span className="lp-stat-label">VWAP</span>
              <span className="lp-stat-value">{formatINR(vwap)}</span>
            </div>
          )}
          {avgTradePrice != null && (
            <div className="lp-stat">
              <span className="lp-stat-label">Avg Trade Price</span>
              <span className="lp-stat-value">{formatINR(avgTradePrice)}</span>
            </div>
          )}
          {stockData.beta != null && (
            <div className="lp-stat">
              <span className="lp-stat-label">Beta</span>
              <span className="lp-stat-value">{Number(stockData.beta).toFixed(2)}</span>
            </div>
          )}
          {upperCircuit != null && (
            <div className="lp-stat">
              <span className="lp-stat-label">Upper Circuit</span>
              <span className="lp-stat-value green">{formatINR(upperCircuit)}</span>
            </div>
          )}
          {lowerCircuit != null && (
            <div className="lp-stat">
              <span className="lp-stat-label">Lower Circuit</span>
              <span className="lp-stat-value red">{formatINR(lowerCircuit)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Range Bars */}
      <div className="lp-ranges">
        <div className="lp-range">
          <div className="lp-range-header">
            <span>Today's Range</span>
            <span className="lp-range-values">{formatINR(stockData.dayLow)} — {formatINR(stockData.dayHigh)}</span>
          </div>
          <div className="lp-range-bar">
            <div className="lp-range-fill" style={{ width: `${calcRange(stockData.dayLow, stockData.dayHigh, stockData.price)}%` }} />
            <div className="lp-range-marker" style={{ left: `${calcRange(stockData.dayLow, stockData.dayHigh, stockData.price)}%` }} />
          </div>
        </div>
        <div className="lp-range">
          <div className="lp-range-header">
            <span>52W Range</span>
            <span className="lp-range-values">{formatINR(stockData.fiftyTwoWeekLow)} — {formatINR(stockData.fiftyTwoWeekHigh)}</span>
          </div>
          <div className="lp-range-bar">
            <div className="lp-range-fill" style={{ width: `${calcRange(stockData.fiftyTwoWeekLow, stockData.fiftyTwoWeekHigh, stockData.price)}%` }} />
            <div className="lp-range-marker" style={{ left: `${calcRange(stockData.fiftyTwoWeekLow, stockData.fiftyTwoWeekHigh, stockData.price)}%` }} />
          </div>
        </div>
      </div>

      {/* Fundamentals */}
      {(stockData.peRatio || stockData.pbRatio || stockData.eps) && (
        <div className="lp-fundamentals">
          <h4>Fundamentals</h4>
          <div className="lp-fund-grid">
            {stockData.peRatio != null && (
              <div className="lp-fund-item">
                <span className="lp-fund-label">P/E Ratio</span>
                <span className="lp-fund-value">{Number(stockData.peRatio).toFixed(2)}</span>
              </div>
            )}
            {stockData.pbRatio != null && (
              <div className="lp-fund-item">
                <span className="lp-fund-label">P/B Ratio</span>
                <span className="lp-fund-value">{Number(stockData.pbRatio).toFixed(2)}</span>
              </div>
            )}
            {stockData.eps != null && (
              <div className="lp-fund-item">
                <span className="lp-fund-label">EPS (TTM)</span>
                <span className="lp-fund-value">₹{Number(stockData.eps).toFixed(2)}</span>
              </div>
            )}
            {stockData.bookValue != null && (
              <div className="lp-fund-item">
                <span className="lp-fund-label">Book Value</span>
                <span className="lp-fund-value">₹{Number(stockData.bookValue).toFixed(2)}</span>
              </div>
            )}
            {stockData.dividendYield != null && stockData.dividendYield > 0 && (
              <div className="lp-fund-item">
                <span className="lp-fund-label">Div Yield</span>
                <span className="lp-fund-value">{(stockData.dividendYield * 100).toFixed(2)}%</span>
              </div>
            )}
            {stockData.marketCap > 0 && stockData.eps > 0 && (
              <div className="lp-fund-item">
                <span className="lp-fund-label">Earning Yield</span>
                <span className="lp-fund-value">{((stockData.eps / stockData.price) * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatLargeShort(value) {
  if (!value || isNaN(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_00_00_00_00_000) return `${(abs / 1_00_00_00_00_000).toFixed(2)}T Cr`;
  if (abs >= 1_00_00_000) return `${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${(abs / 1_00_000).toFixed(2)} L`;
  return abs.toLocaleString('en-IN');
}
