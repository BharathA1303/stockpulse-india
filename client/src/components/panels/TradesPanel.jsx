import { memo } from 'react';
import TradesTicker from '../TradesTicker';

/**
 * TradesPanel — Sidebar drawer content for Time & Sales / recent trades.
 * Wraps the existing TradesTicker component for use inside the Sidebar system.
 */
function TradesPanel({ newTrades, currentPrice, symbol }) {
  return (
    <div className="sidebar-panel trades-panel">
      <TradesTicker
        newTrades={newTrades}
        currentPrice={currentPrice}
        symbol={symbol}
      />
    </div>
  );
}

export default memo(TradesPanel);
