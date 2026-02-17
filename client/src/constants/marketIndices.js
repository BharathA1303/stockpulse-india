/**
 * Market indices configuration with priority ordering.
 * Priority 1-3 appear in the header bar; all appear in the "All Indices" slide panel.
 * User can drag-reorder; top 3 by current order are shown in the header.
 */
export const MARKET_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', shortName: 'NIFTY', priority: 1, fallback: 25000 },
  { symbol: '^BSESN', name: 'S&P BSE SENSEX', shortName: 'SENSEX', priority: 2, fallback: 82000 },
  { symbol: '^NSEBANK', name: 'NIFTY BANK', shortName: 'BANKNIFTY', priority: 3, fallback: 55000 },
  { symbol: '^NSEI_MIDCAP', name: 'NIFTY MIDCAP 50', shortName: 'MIDCPNIFTY', priority: 4, fallback: 13500 },
  { symbol: '^NSEI_FIN', name: 'NIFTY FINANCIAL', shortName: 'FINNIFTY', priority: 5, fallback: 28000 },
  { symbol: '^NSEI_IT', name: 'NIFTY IT', shortName: 'NIFTY IT', priority: 6, fallback: 42000 },
];

/** Default top 3 */
export const TOP_INDICES = MARKET_INDICES.filter(i => i.priority <= 3);

/** All indices for the full panel */
export const ALL_INDICES = [...MARKET_INDICES].sort((a, b) => a.priority - b.priority);
