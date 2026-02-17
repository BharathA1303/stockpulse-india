import { useState, useEffect, memo } from 'react';
import { ALL_INDICES } from '../../constants/marketIndices';
import { API_BASE_URL } from '../../constants/stockSymbols';

/**
 * IndicesPanel — Sidebar drawer content showing all market indices.
 * Uses WebSocket livePrices for real-time updates, REST for initial load.
 */
function IndicesPanel({ onSelectIndex, livePrices }) {
  const [data, setData] = useState(() =>
    ALL_INDICES.map(idx => ({
      ...idx,
      price: idx.fallback,
      change: 0,
      changePercent: 0,
    }))
  );

  // Initial fetch via REST
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          ALL_INDICES.map(async (idx) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/quote/${encodeURIComponent(idx.symbol)}`);
              if (!res.ok) throw new Error('API error');
              const json = await res.json();
              return {
                ...idx,
                price: json.price ?? idx.fallback,
                change: json.change ?? 0,
                changePercent: json.changePercent ?? 0,
              };
            } catch {
              return { ...idx, price: idx.fallback, change: 0, changePercent: 0 };
            }
          })
        );
        if (!cancelled) setData(results);
      } catch { /* silent */ }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // Update from WebSocket livePrices
  useEffect(() => {
    if (!livePrices || typeof livePrices !== 'object') return;
    setData(prev => {
      let changed = false;
      const next = prev.map(idx => {
        const tick = livePrices[idx.symbol];
        if (tick && tick.price && tick.price !== idx.price) {
          changed = true;
          return {
            ...idx,
            price: tick.price,
            change: tick.change || 0,
            changePercent: tick.changePercent || 0,
          };
        }
        return idx;
      });
      return changed ? next : prev;
    });
  }, [livePrices]);

  return (
    <div className="sidebar-panel indices-panel">
      <div className="indices-panel-header">
        <h3 className="panel-section-title">Market Indices</h3>
      </div>
      <div className="indices-list">
        {data.map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <button
              key={idx.symbol}
              className={`indices-card ${isUp ? 'up' : 'down'}`}
              onClick={() => onSelectIndex?.(idx.symbol)}
            >
              <div className="indices-card-left">
                <span className="indices-card-name">{idx.shortName}</span>
                <span className="indices-card-fullname">{idx.name}</span>
              </div>
              <div className="indices-card-right">
                <span className="indices-card-price">
                  {typeof idx.price === 'number'
                    ? idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : '—'}
                </span>
                <span className={`indices-card-change ${isUp ? 'up' : 'down'}`}>
                  <svg className="change-arrow" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    {isUp
                      ? <path d="M5 1L9 7H1L5 1Z" />
                      : <path d="M5 9L1 3H9L5 9Z" />
                    }
                  </svg>
                  {Math.abs(idx.change).toFixed(2)} ({Math.abs(idx.changePercent).toFixed(2)}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(IndicesPanel);
