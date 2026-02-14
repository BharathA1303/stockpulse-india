import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '../constants/stockSymbols';
import { formatINR, formatChange, formatPercent } from '../utils/formatters';

/**
 * Premium sidebar watchlist with color-coded items and live prices.
 * Uses WebSocket allTicks for real-time updates, REST as fallback.
 */
export default function Watchlist({ watchlist, onRemove, onSelect, selectedSymbol, allTicks }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const prevTickRef = useRef(null);

  // Merge allTicks into prices when available
  useEffect(() => {
    if (!allTicks || Object.keys(allTicks).length === 0) return;
    if (prevTickRef.current === allTicks) return;
    prevTickRef.current = allTicks;

    setPrices(prev => {
      const updated = { ...prev };
      watchlist.forEach(symbol => {
        const tick = allTicks[symbol];
        if (tick) {
          updated[symbol] = {
            ...updated[symbol],
            price: tick.price,
            change: tick.change,
            changePercent: tick.changePercent,
            shortName: tick.shortName || updated[symbol]?.shortName || symbol.replace(/\.(NS|BO)$/, ''),
          };
        }
      });
      return updated;
    });
    setLoading(false);
  }, [allTicks, watchlist]);

  // REST fallback — initial load & periodic refresh
  useEffect(() => {
    if (watchlist.length === 0) {
      setPrices({});
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      const newPrices = {};
      await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/api/quote/${encodeURIComponent(symbol)}`
            );
            if (res.ok) {
              newPrices[symbol] = await res.json();
            }
          } catch {
            // silently skip failed fetches
          }
        })
      );
      if (!cancelled) {
        setPrices(prev => ({ ...prev, ...newPrices }));
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 120_000); // less frequent since WS provides live data
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchlist]);

  return (
    <aside className="watchlist" aria-label="Your watchlist">
      <div className="watchlist-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Watchlist</h2>
        {watchlist.length > 0 && (
          <span className="watchlist-count">{watchlist.length} stocks</span>
        )}
      </div>

      {watchlist.length === 0 && (
        <div className="watchlist-empty">
          <div className="watchlist-empty-icon">☆</div>
          <p>Your watchlist is empty</p>
          <p className="hint">Search for a stock and click ☆ to add it here</p>
        </div>
      )}

      {loading && watchlist.length > 0 && (
        <div className="watchlist-loading" aria-busy="true">
          {watchlist.map((sym) => (
            <div key={sym} className="watchlist-item skeleton">
              <div className="skeleton-line" style={{ height: '42px' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && watchlist.length > 0 && (
        <ul className="watchlist-list">
          {watchlist.map((symbol) => {
            const p = prices[symbol];
            const isUp = p ? p.change >= 0 : true;
            return (
              <li key={symbol} className={`watchlist-item ${isUp ? 'up' : 'down'} ${symbol === selectedSymbol ? 'selected' : ''}`}>
                <button
                  className="watchlist-item-btn"
                  onClick={() => onSelect(symbol)}
                  aria-label={`View ${symbol}`}
                >
                  <div className="watchlist-item-left">
                    <span className="watchlist-symbol">
                      {symbol.replace(/\.(NS|BO)$/, '')}
                    </span>
                    <span className="watchlist-name">
                      {p?.shortName || symbol}
                    </span>
                  </div>
                  <div className="watchlist-item-right">
                    <span className="watchlist-price">
                      {p ? formatINR(p.price) : '—'}
                    </span>
                    <span className={`watchlist-change ${isUp ? 'up' : 'down'}`}>
                      {p
                        ? `${isUp ? '+' : ''}${formatPercent(p.changePercent)}`
                        : ''}
                    </span>
                  </div>
                </button>
                <button
                  className="watchlist-remove"
                  onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
                  aria-label={`Remove ${symbol} from watchlist`}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
