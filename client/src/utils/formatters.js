/**
 * Formatting utilities for Indian currency, numbering system, and dates.
 */

/**
 * Format a number in Indian Rupees using the en-IN locale.
 * Produces ₹12,34,567.89 (lakhs/crores format).
 *
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatINR(value, decimals = 2) {
  if (value == null || isNaN(value)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a large number into human-readable Indian notation:
 *   - ≥ 1 Crore  → "1.50 Cr"
 *   - ≥ 1 Lakh   → "2.35 L"
 *   - < 1 Lakh   → comma‐formatted number
 *
 * @param {number} value
 * @returns {string}
 */
export function formatLargeNumber(value) {
  if (value == null || isNaN(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_00_00_000) {
    return `${sign}${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}${(abs / 1_00_000).toFixed(2)} L`;
  }
  return `${sign}${new Intl.NumberFormat('en-IN').format(Math.round(abs))}`;
}

/**
 * Format a percentage value with sign and two decimal places.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a number with sign (e.g. +123.45 or -42.10).
 *
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatChange(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0.00';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Check whether the Indian stock market is currently open.
 * Market hours: 9:15 AM – 3:30 PM IST, Monday–Friday.
 *
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isMarketOpen(now = new Date()) {
  // Convert to IST (UTC+5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const ist = new Date(utc + 5.5 * 60 * 60_000);

  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMins = hours * 60 + minutes;

  const open = 9 * 60 + 15; // 9:15 AM
  const close = 15 * 60 + 30; // 3:30 PM

  return totalMins >= open && totalMins <= close;
}

/**
 * Format a Date for chart axis labels depending on the range.
 *
 * @param {string|Date} date
 * @param {string} range – one of '1d','1w','1mo','3mo','1y'
 * @returns {string}
 */
export function formatChartDate(date, range) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (range) {
    case '1d':
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    case '1w':
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    case '1mo':
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    case '3mo':
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    case '1y':
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    default:
      return d.toLocaleDateString('en-IN');
  }
}

/**
 * Format volume with Indian notation.
 *
 * @param {number} vol
 * @returns {string}
 */
export function formatVolume(vol) {
  return formatLargeNumber(vol);
}
