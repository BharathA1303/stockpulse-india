import { memo, useMemo } from 'react';
import { formatINR } from '../../utils/formatters';

/**
 * AccountBalance — Compact account info for the header.
 * Shows balance, realised P&L, and unrealised P&L.
 */
function AccountBalance({ balance, realisedPnL, unrealisedPnL }) {
  const balFormatted = useMemo(() => formatCompact(balance), [balance]);
  const rPnL = useMemo(() => realisedPnL || 0, [realisedPnL]);
  const uPnL = useMemo(() => unrealisedPnL || 0, [unrealisedPnL]);

  return (
    <div className="account-balance-header">
      <div className="ab-item">
        <span className="ab-label">Balance</span>
        <span className="ab-value">{balFormatted}</span>
      </div>
      <div className="ab-divider" />
      <div className="ab-item">
        <span className="ab-label">Realised</span>
        <span className={`ab-value ${rPnL >= 0 ? 'up' : 'down'}`}>
          {rPnL >= 0 ? '+' : ''}{formatCompact(rPnL)}
        </span>
      </div>
      <div className="ab-divider" />
      <div className="ab-item">
        <span className="ab-label">Unrealised</span>
        <span className={`ab-value ${uPnL >= 0 ? 'up' : 'down'}`}>
          {uPnL >= 0 ? '+' : ''}{formatCompact(uPnL)}
        </span>
      </div>
    </div>
  );
}

function formatCompact(value) {
  if (value == null || isNaN(value)) return '₹0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export default memo(AccountBalance);
