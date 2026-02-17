import { memo, useCallback, useState } from 'react';
import { formatINR } from '../../utils/formatters';

/**
 * BalancePanel — Groww-style account balance page.
 * Shown in sidebar drawer when the Balance tab is selected.
 */
function BalancePanel({ balance, usedMargin, realisedPnL, unrealisedPnL, onResetAccount, onAddMoney }) {
  const totalPnL = (realisedPnL || 0) + (unrealisedPnL || 0);
  const isPnLPositive = totalPnL >= 0;
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const QUICK_AMOUNTS = [100000, 500000, 1000000, 2500000, 5000000];

  const handleReset = useCallback(async () => {
    if (window.confirm('Reset your trading account? All positions & orders will be cleared and balance restored to ₹10,00,000.')) {
      setIsResetting(true);
      try {
        await onResetAccount?.();
      } finally {
        setIsResetting(false);
      }
    }
  }, [onResetAccount]);

  const handleAddMoney = useCallback(async () => {
    setAddError('');
    setAddSuccess('');
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) {
      setAddError('Enter a valid amount');
      return;
    }
    if (amount > 10000000) {
      setAddError('Maximum ₹1,00,00,000 per transaction');
      return;
    }
    const result = await onAddMoney?.(amount);
    if (result?.success) {
      setAddSuccess(`₹${amount.toLocaleString('en-IN')} added successfully!`);
      setAddAmount('');
      setTimeout(() => {
        setAddSuccess('');
        setShowAddMoney(false);
      }, 2000);
    } else {
      setAddError(result?.error || 'Failed to add money');
    }
  }, [addAmount, onAddMoney]);

  const handleQuickAdd = useCallback(async (amount) => {
    setAddAmount(String(amount));
    setAddError('');
    setAddSuccess('');
    const result = await onAddMoney?.(amount);
    if (result?.success) {
      setAddSuccess(`₹${amount.toLocaleString('en-IN')} added successfully!`);
      setTimeout(() => {
        setAddSuccess('');
        setShowAddMoney(false);
      }, 2000);
    } else {
      setAddError(result?.error || 'Failed to add money');
    }
  }, [onAddMoney]);

  return (
    <div className="balance-panel">
      {/* Main Balance Card */}
      <div className="bp-card bp-main-card">
        <div className="bp-card-header">
          <span className="bp-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </span>
          <span className="bp-card-label">Stocks &amp; F&amp;O Balance</span>
        </div>
        <div className="bp-main-amount">{formatINR(balance || 0)}</div>
      </div>

      {/* Balance Breakdown */}
      <div className="bp-card bp-breakdown">
        <div className="bp-row">
          <div className="bp-row-left">
            <span className="bp-dot bp-dot-green" />
            <span className="bp-label">Available Cash</span>
          </div>
          <span className="bp-value">{formatINR((balance || 0) - (usedMargin || 0))}</span>
        </div>

        <div className="bp-row">
          <div className="bp-row-left">
            <span className="bp-dot bp-dot-orange" />
            <span className="bp-label">Used Margin</span>
          </div>
          <span className="bp-value">{formatINR(usedMargin || 0)}</span>
        </div>

        <div className="bp-divider" />

        <div className="bp-row">
          <div className="bp-row-left">
            <span className="bp-dot bp-dot-blue" />
            <span className="bp-label">Realised P&amp;L</span>
          </div>
          <span className={`bp-value ${(realisedPnL || 0) >= 0 ? 'up' : 'down'}`}>
            {(realisedPnL || 0) >= 0 ? '+' : ''}{formatINR(realisedPnL || 0)}
          </span>
        </div>

        <div className="bp-row">
          <div className="bp-row-left">
            <span className="bp-dot bp-dot-purple" />
            <span className="bp-label">Unrealised P&amp;L</span>
          </div>
          <span className={`bp-value ${(unrealisedPnL || 0) >= 0 ? 'up' : 'down'}`}>
            {(unrealisedPnL || 0) >= 0 ? '+' : ''}{formatINR(unrealisedPnL || 0)}
          </span>
        </div>

        <div className="bp-divider" />

        <div className="bp-row bp-row-total">
          <div className="bp-row-left">
            <span className={`bp-dot ${isPnLPositive ? 'bp-dot-green' : 'bp-dot-red'}`} />
            <span className="bp-label">Total P&amp;L</span>
          </div>
          <span className={`bp-value bp-total ${isPnLPositive ? 'up' : 'down'}`}>
            {isPnLPositive ? '+' : ''}{formatINR(totalPnL)}
          </span>
        </div>
      </div>

      {/* Add Money Expandable Section */}
      {showAddMoney && (
        <div className="bp-card bp-add-money-section">
          <h4 className="bp-add-money-title">Add Funds (Simulated)</h4>
          <div className="bp-quick-amounts">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                className="bp-quick-btn"
                onClick={() => handleQuickAdd(amt)}
              >
                ₹{(amt / 100000).toFixed(amt >= 100000 ? (amt % 100000 === 0 ? 0 : 1) : 2)}L
              </button>
            ))}
          </div>
          <div className="bp-custom-amount">
            <input
              type="number"
              className="bp-amount-input"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              placeholder="Enter custom amount"
              min="1"
              max="10000000"
            />
            <button className="bp-confirm-add-btn" onClick={handleAddMoney}>
              Add
            </button>
          </div>
          {addError && <div className="bp-add-error">{addError}</div>}
          {addSuccess && <div className="bp-add-success">{addSuccess}</div>}
        </div>
      )}

      {/* Actions */}
      <div className="bp-actions">
        <button className="bp-add-money-btn" onClick={() => setShowAddMoney(prev => !prev)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {showAddMoney ? 'Close' : 'Add Money'}
        </button>
        <button className="bp-reset-btn" onClick={handleReset} disabled={isResetting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          {isResetting ? 'Resetting...' : 'Reset Account'}
        </button>
      </div>

      <p className="bp-footnote">
        This is a simulated trading account for learning purposes. No real money is involved.
      </p>
    </div>
  );
}

export default memo(BalancePanel);
