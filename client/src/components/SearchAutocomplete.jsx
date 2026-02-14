import { useState, useRef, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useStockSearch } from '../hooks/useStockData';

/**
 * Search bar with debounced autocomplete dropdown.
 * Filters to NSE/BSE stocks only.
 *
 * @param {{ onSelect: (symbol: string) => void }} props
 */
export default function SearchAutocomplete({ onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const { results, loading } = useStockSearch(debouncedQuery);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when results change
  useEffect(() => {
    if (results.length > 0 && query.length > 0) {
      setIsOpen(true);
      setHighlightIndex(-1);
    }
  }, [results, query]);

  const handleSelect = (symbol) => {
    setQuery('');
    setIsOpen(false);
    onSelect(symbol);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && results[highlightIndex]) {
          handleSelect(results[highlightIndex].symbol);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="search-autocomplete" ref={wrapperRef} role="combobox" aria-expanded={isOpen}>
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search stocks… e.g. Reliance, TCS, INFY"
          aria-label="Search Indian stocks"
          aria-autocomplete="list"
          autoComplete="off"
          className="search-input"
        />
        {loading && <span className="search-spinner" aria-label="Searching…" />}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="search-dropdown" role="listbox">
          {results.map((item, idx) => (
            <li
              key={item.symbol}
              role="option"
              aria-selected={idx === highlightIndex}
              className={`search-dropdown-item ${idx === highlightIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelect(item.symbol)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              <span className="search-symbol">{item.symbol}</span>
              <span className="search-name">{item.shortName}</span>
              <span className="search-exchange">
                {item.symbol.endsWith('.NS') ? 'NSE' : 'BSE'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.length > 0 && results.length === 0 && !loading && (
        <div className="search-dropdown search-no-results">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
