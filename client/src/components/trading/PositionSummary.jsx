import { memo, useMemo } from 'react';
import { formatINR } from '../../utils/formatters';

/**
 * PositionSummary — Shows open positions for the current symbol
 * with live unrealised P&L.
 */
function PositionSummary({ positions, livePrices, onClosePosition }) {
  const openPositions = useMemo(() => {
    return positions.filter(p => p.status === 'OPEN');
  }, [positions]);

  if (openPositions.length === 0) return null;

  return (
    <div className="position-summary">
      <h4 className="position-summary-title">Open Positions</h4>
      {openPositions.map(pos => {
        const priceData = livePrices[pos.symbol];
        const currentPrice = priceData?.price || pos.avgPrice;

        let pnl;
        if (pos.side === 'BUY') {
          pnl = (currentPrice - pos.avgPrice) * pos.quantity;
        } else {
          pnl = (pos.avgPrice - currentPrice) * pos.quantity;
        }

        const pnlPercent = pos.avgPrice > 0
          ? ((pnl / (pos.avgPrice * pos.quantity)) * 100)
          : 0;

        const isUp = pnl >= 0;

        return (
          <div key={pos.id} className={`position-card ${isUp ? 'profit' : 'loss'}`}>
            <div className="position-card-header">
              <div className="position-card-left">
                <span className={`position-side ${pos.side.toLowerCase()}`}>
                  {pos.side}
                </span>
                <span className="position-symbol">{pos.symbol.replace(/\.(NS|BO)$/, '')}</span>
                <span className="position-product">{pos.product === 'MIS' ? 'Intraday' : 'Delivery'}</span>
              </div>
              <button
                className="position-close-btn"
                onClick={() => onClosePosition(pos.id, currentPrice)}
                title="Close position"
              >
                EXIT
              </button>
            </div>
            <div className="position-card-body">
              <div className="position-detail">
                <span className="position-detail-label">Qty</span>
                <span className="position-detail-value">{pos.quantity}</span>
              </div>
              <div className="position-detail">
                <span className="position-detail-label">Avg</span>
                <span className="position-detail-value">{formatINR(pos.avgPrice)}</span>
              </div>
              <div className="position-detail">
                <span className="position-detail-label">LTP</span>
                <span className="position-detail-value">{formatINR(currentPrice)}</span>
              </div>
              <div className="position-detail">
                <span className="position-detail-label">P&L</span>
                <span className={`position-detail-value ${isUp ? 'green' : 'red'}`}>
                  {isUp ? '+' : ''}{formatINR(pnl)} ({pnlPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            {(pos.stopLoss || pos.target) && (
              <div className="position-card-footer">
                {pos.stopLoss && (
                  <span className="position-sl">SL: {formatINR(pos.stopLoss)}</span>
                )}
                {pos.target && (
                  <span className="position-tgt">TGT: {formatINR(pos.target)}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PositionSummary);
