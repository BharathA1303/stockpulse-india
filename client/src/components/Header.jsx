import { useState, useEffect, useRef, useCallback, memo } from 'react';
import SearchAutocomplete from './SearchAutocomplete';
import { isMarketOpen } from '../utils/formatters';
import { ALL_INDICES } from '../constants/marketIndices';
import { API_BASE_URL } from '../constants/stockSymbols';

/**
 * Premium header with:
 * - Globe logo + StockPulse^India branding
 * - Search bar (smaller, spaced)
 * - Dark-mode toggle
 * - Account balance display
 * - Live market indices (top 3 from ordered list) — WebSocket powered
 * - "All indices" button → right slide panel with drag-to-reorder
 */

const STORAGE_KEY = 'sp-indices-order';

function getStoredOrder() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function Header({ onSelectStock, darkMode, onToggleDarkMode, isMobile, onSearchOpen, livePrices }) {
  const marketOpen = isMarketOpen();

  // Ordered list of indices (user can reorder via drag)
  const [orderedIndices, setOrderedIndices] = useState(() => {
    const stored = getStoredOrder();
    if (stored && Array.isArray(stored)) {
      // Merge stored order with current ALL_INDICES (in case new ones are added)
      const knownSymbols = new Set(ALL_INDICES.map(i => i.symbol));
      const merged = stored
        .filter(s => knownSymbols.has(s))
        .map(s => ALL_INDICES.find(i => i.symbol === s))
        .filter(Boolean);
      // Add any new indices not in stored
      for (const idx of ALL_INDICES) {
        if (!merged.find(m => m.symbol === idx.symbol)) merged.push(idx);
      }
      return merged;
    }
    return [...ALL_INDICES];
  });

  const [indicesData, setIndicesData] = useState(() => {
    const map = {};
    ALL_INDICES.forEach(idx => { map[idx.symbol] = { price: idx.fallback, change: 0, changePercent: 0 }; });
    return map;
  });

  const [indicesPanelOpen, setIndicesPanelOpen] = useState(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Fetch indices data initially, then update from WebSocket livePrices
  useEffect(() => {
    let cancelled = false;
    const fetchIndices = async () => {
      try {
        const results = await Promise.allSettled(
          ALL_INDICES.map(async (idx) => {
            const res = await fetch(`${API_BASE_URL}/api/quote/${encodeURIComponent(idx.symbol)}`);
            if (!res.ok) throw new Error('fail');
            const json = await res.json();
            return { symbol: idx.symbol, price: json.price ?? idx.fallback, change: json.change ?? 0, changePercent: json.changePercent ?? 0 };
          })
        );
        if (cancelled) return;
        setIndicesData(prev => {
          const next = { ...prev };
          for (const r of results) {
            if (r.status === 'fulfilled') {
              next[r.value.symbol] = { price: r.value.price, change: r.value.change, changePercent: r.value.changePercent };
            }
          }
          return next;
        });
      } catch { /* silent */ }
    };
    fetchIndices();
    return () => { cancelled = true; };
  }, []);

  // Update indices from WebSocket livePrices (real-time, no polling)
  useEffect(() => {
    if (!livePrices || typeof livePrices !== 'object') return;
    setIndicesData(prev => {
      const next = { ...prev };
      let changed = false;
      for (const idx of ALL_INDICES) {
        const tick = livePrices[idx.symbol];
        if (tick && tick.price) {
          const updated = { price: tick.price, change: tick.change || 0, changePercent: tick.changePercent || 0 };
          if (next[idx.symbol]?.price !== updated.price || next[idx.symbol]?.change !== updated.change) {
            next[idx.symbol] = updated;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [livePrices]);

  // Save order to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orderedIndices.map(i => i.symbol)));
  }, [orderedIndices]);

  // Drag handlers
  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setOrderedIndices(prev => {
      const list = [...prev];
      const [removed] = list.splice(dragIdx, 1);
      list.splice(dropIdx, 0, removed);
      return list;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  return (
    <>
      <header className={`header ${isMobile ? 'header-mobile' : ''}`} role="banner">
        <div className="header-left">
          <div className="logo" aria-label="StockPulse India">
            <div className="logo-icon">
              <img src="/logo.svg" alt="StockPulse" width="32" height="32" style={{ borderRadius: '6px' }} />
            </div>
            {!isMobile && (
              <h1 className="logo-text">
                StockPulse<sup className="logo-india">India</sup>
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

          {/* Dark mode toggle */}
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

          {/* Market Indices - Desktop only */}
          {!isMobile && (
            <div className="header-indices">
              {/* All indices button */}
              <button
                className="header-all-indices-btn"
                onClick={() => setIndicesPanelOpen(prev => !prev)}
                title="View all market indices"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                All Indices
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}

          {/* Market status */}
          <div
            className={`market-status-badge ${marketOpen ? 'open' : 'closed'}`}
            aria-label={`Market is ${marketOpen ? 'open' : 'closed'}`}
          >
            <span className="status-dot" />
            {isMobile ? (marketOpen ? 'Open' : 'Closed') : (marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED')}
          </div>
        </div>
      </header>

      {/* All Indices Slide Panel (from right) — drag to reorder */}
      {indicesPanelOpen && (
        <>
          <div className="indices-overlay" onClick={() => setIndicesPanelOpen(false)} />
          <div className="indices-slide-panel">
            <div className="indices-slide-header">
              <button className="indices-slide-close" onClick={() => setIndicesPanelOpen(false)} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h3 className="indices-slide-title">All indices</h3>
            </div>
            <p className="indices-slide-hint">Drag to reorder. Click to view a stock.</p>
            <div className="indices-slide-list">
              {orderedIndices.map((idx, i) => {
                const d = indicesData[idx.symbol] || {};
                const isUp = (d.change || 0) >= 0;
                const handleItemClick = (e) => {
                  // Only navigate if not dragging
                  if (dragIdx !== null) return;
                  onSelectStock?.(idx.symbol);
                  setIndicesPanelOpen(false);
                };
                return (
                  <div
                    key={idx.symbol}
                    className={`indices-slide-item ${dragOverIdx === i ? 'drag-over' : ''} ${dragIdx === i ? 'dragging' : ''} ${i < 3 ? 'top-three' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    onClick={handleItemClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="indices-slide-item-left">
                      <span className="indices-slide-drag" title="Drag to reorder" onClick={e => e.stopPropagation()}>⠿</span>
                      <span className="indices-slide-name">{idx.shortName}</span>
                    </div>
                    <div className="indices-slide-item-right">
                      <span className="indices-slide-price">
                        {typeof d.price === 'number'
                          ? d.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                          : '—'}
                      </span>
                      <span className={`indices-slide-change ${isUp ? 'up' : 'down'}`}>
                        {Math.abs(d.change || 0).toFixed(2)} ({Math.abs(d.changePercent || 0).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default memo(Header);
