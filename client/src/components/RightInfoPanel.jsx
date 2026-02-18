import { memo } from 'react';
import { formatINR, formatChange, formatPercent } from '../utils/formatters';
import OrderForm from './trading/OrderForm';

/**
 * Format large numbers in Indian style (Cr, L, K)
 */
function formatCompact(val) {
  if (val == null || isNaN(val) || val === 0) return '—';
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  if (val >= 1e3) return `₹${(val / 1e3).toFixed(1)} K`;
  return `₹${val.toFixed(2)}`;
}

function formatVol(v) {
  if (v == null || isNaN(v) || v === 0) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
  return v.toLocaleString('en-IN');
}

/**
 * RightInfoPanel — Clean right sidebar for desktop.
 *
 * Layout (top to bottom, scrollable):
 *   1. Stock name + live price + change + watchlist button
 *   2. Day Range + 52-Week Range visual bars
 *   3. Buy/Sell order form
 *   4. Key Stats (Volume, Market Cap, etc.)
 *   5. Fundamentals (P/E, P/B, EPS, etc.)
 */
function RightInfoPanel({
  stockData,
  symbol,
  loading,
  isInWatchlist,
  onToggleWatchlist,
  // Trading props
  onPlaceOrder,
  onOrderPlaced,
  positions,
  livePrices,
  onClosePosition,
}) {
  if (!symbol) return null;

  const isUp = (stockData?.change || 0) >= 0;

  // Day range bar position (0-100%)
  const dayLow = stockData?.dayLow || 0;
  const dayHigh = stockData?.dayHigh || 0;
  const dayRange = dayHigh - dayLow;
  const dayPos = dayRange > 0 ? ((stockData?.price - dayLow) / dayRange) * 100 : 50;

  // 52-week range bar position
  const w52Low = stockData?.fiftyTwoWeekLow || 0;
  const w52High = stockData?.fiftyTwoWeekHigh || 0;
  const w52Range = w52High - w52Low;
  const w52Pos = w52Range > 0 ? ((stockData?.price - w52Low) / w52Range) * 100 : 50;

  return (
    <aside className="right-info-panel">
      <div className="right-info-scroll">
        {loading && !stockData ? (
          <div className="stock-card skeleton" aria-busy="true">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-price" />
            <div className="skeleton-line skeleton-meta" />
          </div>
        ) : stockData ? (
          <>
            {/* ── 1. Compact Stock Header + Price + Watchlist ── */}
            <div className="rip-stock-header">
              <div className="rip-name-row">
                <h3 className="rip-stock-name">
                  {stockData.shortName || symbol?.replace(/\.(NS|BO)$/, '')}
                </h3>
                <div className="rip-exchange-tags">
                  {stockData.exchange && <span className="rip-tag">{stockData.exchange}</span>}
                  <span className={`rip-tag ${stockData.marketState === 'REGULAR' ? 'live' : 'closed'}`}>
                    {stockData.marketState === 'REGULAR' ? 'LIVE' : 'CLOSED'}
                  </span>
                </div>
                {onToggleWatchlist && (
                  <button
                    className={`rip-watchlist-btn ${isInWatchlist ? 'active' : ''}`}
                    onClick={onToggleWatchlist}
                    title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isInWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="rip-price-row">
                <span className="rip-price">{formatINR(stockData.price)}</span>
                <span className={`rip-change ${isUp ? 'up' : 'down'}`}>
                  <svg className="change-arrow" width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                    {isUp
                      ? <path d="M5 1L9 7H1L5 1Z" />
                      : <path d="M5 9L1 3H9L5 9Z" />
                    }
                  </svg>
                  {formatChange(stockData.change)} ({formatPercent(stockData.changePercent)})
                </span>
              </div>
            </div>

            {/* ── 2. Day Range + 52-Week Range ── */}
            {(dayRange > 0 || w52Range > 0) && (
              <div className="rip-range-section">
                {dayRange > 0 && (
                  <div className="rip-range-row">
                    <div className="rip-range-labels">
                      <span className="rip-range-label">Day Range</span>
                      <span className="rip-range-values">{formatINR(dayLow)} — {formatINR(dayHigh)}</span>
                    </div>
                    <div className="rip-range-bar">
                      <div className="rip-range-fill" style={{ width: `${Math.min(100, Math.max(0, dayPos))}%` }} />
                      <div className="rip-range-marker" style={{ left: `${Math.min(100, Math.max(0, dayPos))}%` }} />
                    </div>
                  </div>
                )}
                {w52Range > 0 && (
                  <div className="rip-range-row">
                    <div className="rip-range-labels">
                      <span className="rip-range-label">52-Week Range</span>
                      <span className="rip-range-values">{formatINR(w52Low)} — {formatINR(w52High)}</span>
                    </div>
                    <div className="rip-range-bar">
                      <div className="rip-range-fill" style={{ width: `${Math.min(100, Math.max(0, w52Pos))}%` }} />
                      <div className="rip-range-marker" style={{ left: `${Math.min(100, Math.max(0, w52Pos))}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 3. Buy/Sell Order Form ── */}
            {onPlaceOrder && stockData?.price > 0 && (
              <div className="rip-trade-section">
                <OrderForm
                  symbol={symbol}
                  currentPrice={stockData.price}
                  onPlaceOrder={onPlaceOrder}
                  onOrderPlaced={onOrderPlaced}
                  stockName={stockData?.shortName}
                />
              </div>
            )}

            {/* ── 4. Key Stats ── */}
            <div className="rip-stats-section">
              <h4 className="rip-section-title">Key Statistics</h4>
              <div className="rip-stats-grid">
                {stockData.open > 0 && (
                  <div className="rip-stat-row">
                    <span className="rip-stat-label">Open</span>
                    <span className="rip-stat-value">{formatINR(stockData.open)}</span>
                  </div>
                )}
                {stockData.previousClose > 0 && (
                  <div className="rip-stat-row">
                    <span className="rip-stat-label">Prev Close</span>
                    <span className="rip-stat-value">{formatINR(stockData.previousClose)}</span>
                  </div>
                )}
                {stockData.volume > 0 && (
                  <div className="rip-stat-row">
                    <span className="rip-stat-label">Volume</span>
                    <span className="rip-stat-value">{formatVol(stockData.volume)}</span>
                  </div>
                )}
                {stockData.avgVolume > 0 && (
                  <div className="rip-stat-row">
                    <span className="rip-stat-label">Avg Volume</span>
                    <span className="rip-stat-value">{formatVol(stockData.avgVolume)}</span>
                  </div>
                )}
                {stockData.marketCap > 0 && (
                  <div className="rip-stat-row">
                    <span className="rip-stat-label">Market Cap</span>
                    <span className="rip-stat-value">{formatCompact(stockData.marketCap)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. Fundamentals ── */}
            {(stockData.peRatio || stockData.pbRatio || stockData.eps) && (
              <div className="rip-fundamentals-section">
                <h4 className="rip-section-title">Fundamentals</h4>
                <div className="rip-fund-grid">
                  {stockData.peRatio != null && (
                    <div className="rip-fund-item">
                      <span className="rip-fund-label">P/E Ratio</span>
                      <span className="rip-fund-value">{Number(stockData.peRatio).toFixed(2)}</span>
                    </div>
                  )}
                  {stockData.pbRatio != null && (
                    <div className="rip-fund-item">
                      <span className="rip-fund-label">P/B Ratio</span>
                      <span className="rip-fund-value">{Number(stockData.pbRatio).toFixed(2)}</span>
                    </div>
                  )}
                  {stockData.eps != null && (
                    <div className="rip-fund-item">
                      <span className="rip-fund-label">EPS (TTM)</span>
                      <span className="rip-fund-value">₹{Number(stockData.eps).toFixed(2)}</span>
                    </div>
                  )}
                  {stockData.bookValue != null && (
                    <div className="rip-fund-item">
                      <span className="rip-fund-label">Book Value</span>
                      <span className="rip-fund-value">₹{Number(stockData.bookValue).toFixed(2)}</span>
                    </div>
                  )}
                  {stockData.dividendYield != null && stockData.dividendYield > 0 && (
                    <div className="rip-fund-item">
                      <span className="rip-fund-label">Div Yield</span>
                      <span className="rip-fund-value">{(stockData.dividendYield * 100).toFixed(2)}%</span>
                    </div>
                  )}
                  {stockData.marketCap > 0 && stockData.eps > 0 && (
                    <div className="rip-fund-item">
                      <span className="rip-fund-label">Earning Yield</span>
                      <span className="rip-fund-value">{((stockData.eps / stockData.price) * 100).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </aside>
  );
}

export default memo(RightInfoPanel);
