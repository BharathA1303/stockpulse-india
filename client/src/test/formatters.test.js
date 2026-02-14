import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatLargeNumber,
  formatPercent,
  formatChange,
  isMarketOpen,
  formatChartDate,
  formatVolume,
} from '../utils/formatters';

describe('formatINR', () => {
  it('formats a regular number in Indian Rupees', () => {
    const result = formatINR(1234567.89);
    // en-IN locale → ₹12,34,567.89
    expect(result).toContain('₹');
    expect(result).toContain('12');
    expect(result).toContain('34');
    expect(result).toContain('567.89');
  });

  it('returns ₹0.00 for null or NaN', () => {
    expect(formatINR(null)).toBe('₹0.00');
    expect(formatINR(undefined)).toBe('₹0.00');
    expect(formatINR(NaN)).toBe('₹0.00');
  });

  it('respects custom decimal places', () => {
    const result = formatINR(100, 0);
    expect(result).toContain('100');
    expect(result).not.toContain('.');
  });

  it('formats zero correctly', () => {
    const result = formatINR(0);
    expect(result).toContain('₹');
    expect(result).toContain('0.00');
  });
});

describe('formatLargeNumber', () => {
  it('formats crores (≥ 1,00,00,000)', () => {
    expect(formatLargeNumber(1_50_00_000)).toBe('1.50 Cr');
    expect(formatLargeNumber(10_00_00_000)).toBe('10.00 Cr');
  });

  it('formats lakhs (≥ 1,00,000)', () => {
    expect(formatLargeNumber(2_50_000)).toBe('2.50 L');
    expect(formatLargeNumber(99_99_999)).toBe('100.00 L');
  });

  it('formats numbers below 1 lakh with commas', () => {
    const result = formatLargeNumber(50_000);
    expect(result).toBe('50,000');
  });

  it('handles zero', () => {
    expect(formatLargeNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatLargeNumber(-2_00_00_000)).toBe('-2.00 Cr');
    expect(formatLargeNumber(-5_00_000)).toBe('-5.00 L');
  });

  it('returns "0" for null/NaN', () => {
    expect(formatLargeNumber(null)).toBe('0');
    expect(formatLargeNumber(NaN)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('adds + sign for positive values', () => {
    expect(formatPercent(2.5)).toBe('+2.50%');
  });

  it('shows negative sign for negative values', () => {
    expect(formatPercent(-3.14)).toBe('-3.14%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('returns 0.00% for null', () => {
    expect(formatPercent(null)).toBe('0.00%');
  });
});

describe('formatChange', () => {
  it('adds + sign for positive values', () => {
    expect(formatChange(10.5)).toBe('+10.50');
  });

  it('shows negative sign', () => {
    expect(formatChange(-5.25)).toBe('-5.25');
  });

  it('handles zero', () => {
    expect(formatChange(0)).toBe('0.00');
  });
});

describe('isMarketOpen', () => {
  /**
   * IST = UTC+5:30
   * Market hours: Mon–Fri 9:15 AM – 3:30 PM IST
   *
   * To create a date at 10:00 AM IST on a Monday:
   * UTC = 10:00 - 5:30 = 4:30 AM UTC
   */
  it('returns true during market hours on a weekday', () => {
    // Monday 10:00 AM IST → Monday 4:30 AM UTC
    const monday10amIST = new Date('2026-02-16T04:30:00Z'); // Mon
    expect(isMarketOpen(monday10amIST)).toBe(true);
  });

  it('returns false before market opens', () => {
    // Monday 9:00 AM IST → Monday 3:30 AM UTC
    const monday9amIST = new Date('2026-02-16T03:30:00Z');
    expect(isMarketOpen(monday9amIST)).toBe(false);
  });

  it('returns false after market closes', () => {
    // Monday 4:00 PM IST → Monday 10:30 AM UTC
    const monday4pmIST = new Date('2026-02-16T10:30:00Z');
    expect(isMarketOpen(monday4pmIST)).toBe(false);
  });

  it('returns false on Saturday', () => {
    // Saturday 12:00 PM IST → Saturday 6:30 AM UTC
    const saturday = new Date('2026-02-14T06:30:00Z');
    expect(isMarketOpen(saturday)).toBe(false);
  });

  it('returns false on Sunday', () => {
    const sunday = new Date('2026-02-15T06:30:00Z');
    expect(isMarketOpen(sunday)).toBe(false);
  });
});

describe('formatChartDate', () => {
  it('formats intraday (1d) as time', () => {
    const result = formatChartDate('2026-02-16T10:30:00Z', '1d');
    // Should contain hour/minute representation
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats weekly (1w) with weekday', () => {
    const result = formatChartDate('2026-02-16T10:00:00Z', '1w');
    expect(result).toBeTruthy();
  });

  it('returns empty string for invalid date', () => {
    expect(formatChartDate('not-a-date', '1mo')).toBe('');
  });
});

describe('formatVolume', () => {
  it('delegates to formatLargeNumber', () => {
    expect(formatVolume(5_00_000)).toBe('5.00 L');
  });
});
