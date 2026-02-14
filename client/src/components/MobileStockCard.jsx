import { memo } from 'react';
import { formatINR, formatChange, formatPercent } from '../utils/formatters';

/**
 * MobileStockCard — Compact stock header for mobile.
 * Single row: [Star] [Name + Badge] ———— [Price + Change]
 * Min-height 64px, 16px horizontal padding, flex baseline alignment.
 */
function MobileStockCard({ stockData, symbol, isInWatchlist, onToggleWatchlist }) {
  if (!stockData) return null;

  const isUp = (stockData.change || 0) >= 0;

  return (
    <div className="mobile-stock-card">
      {onToggleWatchlist && (
        <button
          className={`msc-star ${isInWatchlist ? 'active' : ''}`}
          onClick={onToggleWatchlist}
          aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isInWatchlist ? '★' : '☆'}
        </button>
      )}
      <div className="msc-left">
        <div className="msc-name-row">
          <span className="msc-name">{stockData.shortName || symbol?.replace(/\.(NS|BO)$/, '')}</span>
          <span className="msc-exchange">{stockData.exchange || 'NSE'}</span>
        </div>
        <span className="msc-symbol">{symbol?.replace(/\.(NS|BO)$/, '')}</span>
      </div>
      <div className="msc-right">
        <div className="msc-price-block">
          <span className="msc-price">{formatINR(stockData.price)}</span>
          <div className={`msc-change ${isUp ? 'up' : 'down'}`}>
            <span>{isUp ? '▲' : '▼'} {formatChange(stockData.change)} ({formatPercent(stockData.changePercent)})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(MobileStockCard);
