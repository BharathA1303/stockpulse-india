import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { API_BASE_URL } from "../constants/stockSymbols";
import { formatINR, formatPercent } from "../utils/formatters";
import { useDebounce } from "../hooks/useDebounce";

/**
 * Multi-Watchlist sidebar component.
 * Supports creating, renaming, deleting multiple watchlists,
 * with an inline search box to add stocks to the active watchlist.
 */
export default function Watchlist({
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

  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const prevTickRef = useRef(null);

  // ── Inline search state ─────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debouncedQuery = useDebounce(searchQuery, 250);
  const searchRef = useRef(null);
  const searchAbortRef = useRef(null);

  // ── Create / rename / dropdown state ─────────────────
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const dropdownRef = useRef(null);
  const createInputRef = useRef(null);
  const renameInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setIsCreating(false);
        setEditingId(null);
        setShowDeleteConfirm(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-focus create input
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  // Auto-focus rename input
  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingId]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Open search dropdown when results arrive
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
        if (err.name !== "AbortError" && !cancelled) {
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

  // Merge allTicks into prices when available
  useEffect(() => {
    if (!allTicks || Object.keys(allTicks).length === 0) return;
    if (prevTickRef.current === allTicks) return;
    prevTickRef.current = allTicks;

    setPrices((prev) => {
      const updated = { ...prev };
      watchlist.forEach((symbol) => {
        const tick = allTicks[symbol];
        if (tick) {
          updated[symbol] = {
            ...updated[symbol],
            price: tick.price,
            change: tick.change,
            changePercent: tick.changePercent,
            shortName:
              tick.shortName ||
              updated[symbol]?.shortName ||
              symbol.replace(/\.(NS|BO)$/, ""),
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
              `${API_BASE_URL}/api/quote/${encodeURIComponent(symbol)}`,
            );
            if (res.ok) {
              newPrices[symbol] = await res.json();
            }
          } catch {
            // silently skip failed fetches
          }
        }),
      );
      if (!cancelled) {
        setPrices((prev) => ({ ...prev, ...newPrices }));
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchlist]);

  // ── Handlers ─────────────────────────────────────────

  const handleCreateList = () => {
    const name = newName.trim();
    onCreateWatchlist(name || "");
    setNewName("");
    setIsCreating(false);
    setShowDropdown(false);
  };

  const handleRename = (listId) => {
    if (editName.trim()) {
      onRenameWatchlist(listId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDeleteList = (listId) => {
    onDeleteWatchlist(listId);
    setShowDeleteConfirm(null);
    setShowDropdown(false);
  };

  const handleSearchSelect = (symbol) => {
    onAdd(symbol, activeList.id);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (!searchOpen || filteredResults.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, filteredResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIdx >= 0 && filteredResults[highlightIdx]) {
          handleSearchSelect(filteredResults[highlightIdx].symbol);
        } else if (filteredResults.length > 0) {
          handleSearchSelect(filteredResults[0].symbol);
        }
        break;
      case "Escape":
        setSearchOpen(false);
        break;
    }
  };

  // Filter out stocks already in this watchlist from search results
  const filteredResults = useMemo(() => {
    return searchResults.filter((r) => !watchlist.includes(r.symbol));
  }, [searchResults, watchlist]);

  return (
    <aside className="watchlist" aria-label="Your watchlist">
      {/* ── Watchlist Selector Header ── */}
      <div className="watchlist-selector" ref={dropdownRef}>
        <button
          className="watchlist-selector-btn"
          onClick={() => setShowDropdown((p) => !p)}
          title="Switch watchlist"
        >
          <span className="watchlist-selector-name">{activeList?.name}</span>
          <svg
            className={`watchlist-selector-arrow ${showDropdown ? "open" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button
          className="watchlist-create-btn"
          onClick={() => {
            setIsCreating(true);
            setShowDropdown(true);
          }}
          title="Create new watchlist"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <span className="watchlist-count">{watchlist.length}</span>

        {/* ── Dropdown ── */}
        {showDropdown && (
          <div className="watchlist-dropdown">
            <div className="watchlist-dropdown-header">My Watchlists</div>
            <ul className="watchlist-dropdown-list">
              {lists.map((list) => (
                <li
                  key={list.id}
                  className={`watchlist-dropdown-item ${list.id === activeId ? "active" : ""}`}
                >
                  {editingId === list.id ? (
                    <div className="watchlist-rename-row">
                      <input
                        ref={renameInputRef}
                        className="watchlist-rename-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(list.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => handleRename(list.id)}
                        maxLength={30}
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        className="watchlist-dropdown-select"
                        onClick={() => {
                          onSetActiveWatchlist(list.id);
                          setShowDropdown(false);
                        }}
                      >
                        <span className="wdd-name">{list.name}</span>
                        <span className="wdd-count">{list.symbols.length}</span>
                      </button>
                      <div className="watchlist-dropdown-actions">
                        <button
                          className="wdd-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(list.id);
                            setEditName(list.name);
                          }}
                          title="Rename"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {lists.length > 1 && (
                          <>
                            {showDeleteConfirm === list.id ? (
                              <div className="wdd-delete-confirm">
                                <button
                                  className="wdd-confirm-yes"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteList(list.id);
                                  }}
                                >
                                  Delete
                                </button>
                                <button
                                  className="wdd-confirm-no"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(null);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                className="wdd-action-btn wdd-delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(list.id);
                                }}
                                title="Delete"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>

            {/* ── Create new watchlist input ── */}
            {isCreating && (
              <div className="watchlist-create-row">
                <input
                  ref={createInputRef}
                  className="watchlist-create-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateList();
                    if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Watchlist name (optional)"
                  maxLength={30}
                />
                <button className="watchlist-create-confirm" onClick={handleCreateList}>
                  Create
                </button>
              </div>
            )}

            {!isCreating && (
              <button
                className="watchlist-dropdown-create"
                onClick={() => setIsCreating(true)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Watchlist
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Inline Search to Add Stocks ── */}
      <div className="watchlist-search" ref={searchRef}>
        <div className="watchlist-search-wrapper">
          <svg
            className="watchlist-search-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="watchlist-search-input"
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
          {searchLoading && (
            <span className="watchlist-search-spinner" />
          )}
        </div>

        {searchOpen && filteredResults.length > 0 && (
          <ul className="watchlist-search-results">
            {filteredResults.slice(0, 8).map((item, idx) => (
              <li
                key={item.symbol}
                className={`watchlist-search-item ${idx === highlightIdx ? "highlighted" : ""}`}
                onClick={() => handleSearchSelect(item.symbol)}
                onMouseEnter={() => setHighlightIdx(idx)}
              >
                <div className="wsi-left">
                  <span className="wsi-symbol">
                    {item.symbol.replace(/\.(NS|BO)$/, "")}
                  </span>
                  <span className="wsi-name">{item.shortName}</span>
                </div>
                <div className="wsi-right">
                  <span className="wsi-exchange">
                    {item.symbol.endsWith(".NS") ? "NSE" : "BSE"}
                  </span>
                  <span className="wsi-add-icon">+</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {searchOpen &&
          searchQuery.length > 0 &&
          filteredResults.length === 0 &&
          !searchLoading && (
            <div className="watchlist-search-results watchlist-search-empty">
              {watchlist.length > 0 && searchResults.length > 0
                ? "Already in this watchlist"
                : `No results for "${searchQuery}"`}
            </div>
          )}
      </div>

      {/* ── Stock List ── */}
      {watchlist.length === 0 && (
        <div className="watchlist-empty">
          <div className="watchlist-empty-icon">☆</div>
          <p>Your watchlist is empty</p>
          <p className="hint">Use the search box above or click ☆ on any stock</p>
        </div>
      )}

      {loading && watchlist.length > 0 && (
        <div className="watchlist-loading" aria-busy="true">
          {watchlist.map((sym) => (
            <div key={sym} className="watchlist-item skeleton">
              <div className="skeleton-line" style={{ height: "42px" }} />
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
              <li
                key={symbol}
                className={`watchlist-item ${isUp ? "up" : "down"} ${symbol === selectedSymbol ? "selected" : ""}`}
              >
                <button
                  className="watchlist-item-btn"
                  onClick={() => onSelect(symbol)}
                  aria-label={`View ${symbol}`}
                >
                  <div className="watchlist-item-left">
                    <span className="watchlist-symbol">
                      {symbol.replace(/\.(NS|BO)$/, "")}
                    </span>
                    <span className="watchlist-name">
                      {p?.shortName || symbol}
                    </span>
                  </div>
                  <div className="watchlist-item-right">
                    <span className="watchlist-price">
                      {p ? formatINR(p.price) : "—"}
                    </span>
                    <span
                      className={`watchlist-change ${isUp ? "up" : "down"}`}
                    >
                      {p
                        ? `${isUp ? " " : " "}${formatPercent(p.changePercent)}`
                        : ""}
                    </span>
                  </div>
                </button>
                <button
                  className="watchlist-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(symbol, activeList.id);
                  }}
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
