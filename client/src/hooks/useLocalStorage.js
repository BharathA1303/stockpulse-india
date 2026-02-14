import { useState, useEffect } from 'react';

/**
 * Persist state in localStorage. Falls back to `initialValue` when the
 * key doesn't exist or parsing fails.
 *
 * @param {string} key   localStorage key
 * @param {any} initialValue  default value
 * @returns {[any, Function]}
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // localStorage may be full or blocked
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
