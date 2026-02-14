import { memo, useState, useEffect, useRef } from 'react';
import { formatINR, formatPercent } from '../utils/formatters';
import { API_BASE_URL } from '../constants/stockSymbols';

/**
 * WatchlistSection — Full-screen watchlist page for mobile.
 * Replaces the old modal/drawer-based watchlist.
 * Renders as a dedicated section via BottomNav, NOT a popup.
 * Fetches its own price data via REST — independent of chart state.
 */
function WatchlistSection({ watchlist, onRemove, onSelect, selectedSymbol, allTicks }) {
  const [restPrices, setRestPrices] = useState({});
  const prevTickRef = useRef(null);

  // REST fallback: fetch prices for all watchlist symbols on mount & periodically
  useEffect(() => {
    if (watchlist.length === 0) {
      setRestPrices({});
      return;
    }
    let cancelled = false;
    const fetchAll = async () => {
      const results = {};
      await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/quote/${encodeURIComponent(symbol)}`);
            if (res.ok) results[symbol] = await res.json();
          } catch { /* skip */ }
        })
      );
      if (!cancelled) setRestPrices(prev => ({ ...prev, ...results }));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [watchlist]);

  // Merge live WS ticks into display data
  const getStockData = (symbol) => {
    const tick = allTicks?.[symbol];
    const rest = restPrices[symbol];
    const price = tick?.price || rest?.price;
    const change = tick?.change ?? rest?.change ?? 0;
    const changePct = tick?.changePercent ?? rest?.changePercent ?? 0;
    const name = tick?.shortName || rest?.shortName || symbol.replace(/\.(NS|BO)$/, '');
    const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
    return { price, change, changePct, name, exchange };
  };
  return (
    <div className="watchlist-section">
      <div className="ws-header">
        <h2 className="ws-title">Watchlist</h2>
        {watchlist.length > 0 && (
          <span className="ws-count">{watchlist.length} stocks</span>
        )}
      </div>

      {watchlist.length === 0 && (
        <div className="ws-empty">
          <div className="ws-empty-icon">☆</div>
          <p className="ws-empty-title">Your watchlist is empty</p>
          <p className="ws-empty-hint">Search for a stock and tap ☆ to add it here</p>
        </div>
      )}

      {watchlist.length > 0 && (
        <ul className="ws-list">
          {watchlist.map((symbol) => {
            const { price, change, changePct, name, exchange } = getStockData(symbol);
            const isUp = change >= 0;

            return (
              <li key={symbol} className="ws-item">
                <button
                  className="ws-item-btn"
                  onClick={() => onSelect(symbol)}
                  aria-label={`View ${name}`}
                >
                  <div className="ws-item-left">
                    <span className="ws-item-name">{name}</span>
                    <div className="ws-item-meta">
                      <span className="ws-item-symbol">{symbol.replace(/\.(NS|BO)$/, '')}</span>
                      <span className="ws-item-exchange">{exchange}</span>
                    </div>
                  </div>
                  <div className="ws-item-right">
                    <span className="ws-item-price">{price ? formatINR(price) : '—'}</span>
                    <span className={`ws-item-change ${isUp ? 'up' : 'down'}`}>
                      {price ? `${isUp ? '+' : ''}${formatPercent(changePct)}` : ''}
                    </span>
                  </div>
                </button>
                <button
                  className="ws-item-remove"
                  onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
                  aria-label={`Remove ${symbol}`}
                  title="Remove from watchlist"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default memo(WatchlistSection);
