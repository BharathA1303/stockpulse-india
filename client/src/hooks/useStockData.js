import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../constants/stockSymbols';

/**
 * Hook to fetch stock quote data for a given symbol.
 *
 * @param {string|null} symbol – e.g. "RELIANCE.NS"
 * @returns {{ data, loading, error, refetch }}
 */
export function useStockData(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const retryRef = useRef(null);

  // Clear stale data immediately when symbol changes
  useEffect(() => {
    setData(null);
    setError(null);
  }, [symbol]);

  const fetchQuote = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/quote/${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      // Clear any pending retry on success
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    } catch (err) {
      setError(err.message || 'Failed to fetch stock data');
      // Auto-retry after 3 seconds on failure
      retryRef.current = setTimeout(() => {
        fetchQuote();
      }, 3000);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchQuote();
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
  }, [fetchQuote]);

  return { data, loading, error, refetch: fetchQuote };
}

/**
 * Hook to fetch historical chart data.
 *
 * @param {string|null} symbol
 * @param {string} range – e.g. "1d","1w","1mo","3mo","1y"
 * @returns {{ data, loading, error, refetch }}
 */
export function useChartData(symbol, range = '1mo') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const retryRef = useRef(null);

  const fetchChart = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/chart/${encodeURIComponent(symbol)}?range=${range}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      // Clear any pending retry on success
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    } catch (err) {
      setError(err.message || 'Failed to fetch chart data');
      // Auto-retry after 3 seconds on failure
      retryRef.current = setTimeout(() => {
        fetchChart();
      }, 3000);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    fetchChart();
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
  }, [fetchChart]);

  return { data, loading, error, refetch: fetchChart };
}

/**
 * Hook to search stocks by query text.
 *
 * @param {string} query
 * @returns {{ results, loading, error }}
 */
export function useStockSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/search/${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setResults(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [query]);

  return { results, loading, error };
}
