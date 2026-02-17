import { memo } from 'react';
import { formatINR, formatChange, formatPercent } from '../utils/formatters';
import OrderForm from './trading/OrderForm';

/**
 * RightInfoPanel — Clean right sidebar for desktop.
 *
 * Layout (top to bottom, scrollable):
 *   1. Stock name + live price + change + watchlist button
 *   2. Buy/Sell order form
 *   3. Fundamentals (P/E, P/B, EPS, etc.)
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
                {/* Watchlist toggle button */}
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

            {/* ── 2. Buy/Sell Order Form ── */}
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

            {/* ── 3. Fundamentals ── */}
            <div className="rip-fundamentals-section">
              {(stockData.peRatio || stockData.pbRatio || stockData.eps) ? (
                <>
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
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

export default memo(RightInfoPanel);
