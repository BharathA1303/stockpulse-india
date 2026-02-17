import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { formatINR, formatPercent } from '../utils/formatters';
import { API_BASE_URL } from '../constants/stockSymbols';
import { useDebounce } from '../hooks/useDebounce';

/**
 * WatchlistSection — Full-screen multi-watchlist page for mobile.
 * Supports switching between multiple watchlists, inline search, create/rename/delete.
 */
function WatchlistSection({
  watchlistData,
  onRemove,
  onAdd,
  onSelect,
  selectedSymbol,
  allTicks,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
  onSetActiveWatchlist,
}) {
  const { lists = [], activeId } = watchlistData || {};
  const activeList = lists.find((l) => l.id === activeId) || lists[0];
  const watchlist = activeList?.symbols || [];

  const [restPrices, setRestPrices] = useState({});
  const prevTickRef = useRef(null);

  // ── Inline search state ─────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debouncedQuery = useDebounce(searchQuery, 250);
  const searchRef = useRef(null);
  const searchAbortRef = useRef(null);

  // ── Create / dropdown state ─────────────────────────
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef(null);

  // REST fallback: fetch prices for all watchlist symbols
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setIsCreating(false);
        setEditingId(null);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    let cancelled = false;
    const doSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/search/${encodeURIComponent(debouncedQuery.trim())}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setSearchResults(json);
          if (json.length > 0) {
            setSearchOpen(true);
            setHighlightIdx(-1);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    doSearch();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

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

  const filteredResults = useMemo(() => {
    return searchResults.filter((r) => !watchlist.includes(r.symbol));
  }, [searchResults, watchlist]);

  const handleSearchSelect = (symbol) => {
    onAdd(symbol, activeList.id);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (!searchOpen || filteredResults.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, filteredResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && filteredResults[highlightIdx]) {
          handleSearchSelect(filteredResults[highlightIdx].symbol);
        } else if (filteredResults.length > 0) {
          handleSearchSelect(filteredResults[0].symbol);
        }
        break;
      case 'Escape':
        setSearchOpen(false);
        break;
    }
  };

  const handleCreateList = () => {
    onCreateWatchlist(newName.trim() || '');
    setNewName('');
    setIsCreating(false);
    setShowDropdown(false);
  };

  const handleRename = (listId) => {
    if (editName.trim()) onRenameWatchlist(listId, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="watchlist-section">
      {/* ── Watchlist Selector ── */}
      <div className="ws-header">
        <div className="ws-selector-row" ref={dropdownRef}>
          <button
            className="ws-selector-btn"
            onClick={() => setShowDropdown((p) => !p)}
          >
            <h2 className="ws-title">{activeList?.name}</h2>
            <svg
              className={`ws-selector-arrow ${showDropdown ? 'open' : ''}`}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            className="ws-create-btn"
            onClick={() => { setIsCreating(true); setShowDropdown(true); }}
            title="Create new watchlist"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {watchlist.length > 0 && (
            <span className="ws-count">{watchlist.length} stocks</span>
          )}

          {/* Mobile dropdown */}
          {showDropdown && (
            <div className="ws-dropdown">
              <div className="ws-dropdown-header">My Watchlists</div>
              <ul className="ws-dropdown-list">
                {lists.map((list) => (
                  <li key={list.id} className={`ws-dropdown-item ${list.id === activeId ? 'active' : ''}`}>
                    {editingId === list.id ? (
                      <input
                        className="ws-rename-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(list.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => handleRename(list.id)}
                        autoFocus
                        maxLength={30}
                      />
                    ) : (
                      <button
                        className="ws-dropdown-select"
                        onClick={() => { onSetActiveWatchlist(list.id); setShowDropdown(false); }}
                      >
                        <span>{list.name}</span>
                        <span className="ws-dropdown-count">{list.symbols.length}</span>
                      </button>
                    )}
                    <div className="ws-dropdown-actions">
                      <button
                        className="ws-dd-action"
                        onClick={(e) => { e.stopPropagation(); setEditingId(list.id); setEditName(list.name); }}
                        title="Rename"
                      >✎</button>
                      {lists.length > 1 && (
                        <button
                          className="ws-dd-action ws-dd-delete"
                          onClick={(e) => { e.stopPropagation(); onDeleteWatchlist(list.id); setShowDropdown(false); }}
                          title="Delete"
                        >×</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {isCreating ? (
                <div className="ws-create-row">
                  <input
                    className="ws-create-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateList();
                      if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
                    }}
                    placeholder="Name (optional)"
                    autoFocus
                    maxLength={30}
                  />
                  <button className="ws-create-confirm" onClick={handleCreateList}>Create</button>
                </div>
              ) : (
                <button className="ws-dropdown-new" onClick={() => setIsCreating(true)}>
                  + New Watchlist
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Inline Search ── */}
      <div className="ws-search" ref={searchRef}>
        <div className="ws-search-wrapper">
          <svg className="ws-search-icon" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="ws-search-input"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.length === 0) {
                setSearchResults([]);
                setSearchOpen(false);
              }
            }}
            onFocus={() => filteredResults.length > 0 && searchQuery.length > 0 && setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search & add stocks…"
            autoComplete="off"
          />
          {searchLoading && <span className="ws-search-spinner" />}
        </div>

        {searchOpen && filteredResults.length > 0 && (
          <ul className="ws-search-results">
            {filteredResults.slice(0, 8).map((item, idx) => (
              <li
                key={item.symbol}
                className={`ws-search-item ${idx === highlightIdx ? 'highlighted' : ''}`}
                onClick={() => handleSearchSelect(item.symbol)}
              >
                <span className="ws-search-symbol">{item.symbol.replace(/\.(NS|BO)$/, '')}</span>
                <span className="ws-search-name">{item.shortName}</span>
                <span className="ws-search-add">+</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Stock List ── */}
      {watchlist.length === 0 && (
        <div className="ws-empty">
          <div className="ws-empty-icon">☆</div>
          <p className="ws-empty-title">Your watchlist is empty</p>
          <p className="ws-empty-hint">Use the search box above or tap ☆ to add stocks</p>
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
                  onClick={(e) => { e.stopPropagation(); onRemove(symbol, activeList.id); }}
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
