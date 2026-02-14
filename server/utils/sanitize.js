/**
 * Input‐sanitisation helpers used across route handlers.
 */

/**
 * Sanitise a stock symbol — alphanumeric, dots, hyphens, carets only.
 * Returns the sanitised string or null if input is invalid.
 */
export function sanitizeSymbol(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  // Allow A-Z, 0-9, dots, hyphens, carets, ampersands
  if (!/^[A-Z0-9\.\-\^&]{1,20}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Sanitise a free-text search query — strip anything that isn't
 * alphanumeric, space, dot, or hyphen. Max 40 chars.
 */
export function sanitizeQuery(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 40);
  return trimmed.replace(/[^a-zA-Z0-9 .\-&]/g, '');
}

/**
 * If the symbol doesn't already end with .NS or .BO, append .NS (NSE default).
 */
export function ensureExchangeSuffix(symbol) {
  if (!symbol) return symbol;
  if (symbol.startsWith('^')) return symbol; // index symbols
  if (/\.(NS|BO)$/i.test(symbol)) return symbol;
  return `${symbol}.NS`;
}
