import { memo, useState, useMemo } from 'react';
import { formatINR } from '../../utils/formatters';

/**
 * OrdersPanel — Sidebar panel showing orders, positions, and P&L.
 * Tabs: Positions | Orders | History
 */
function OrdersPanel({
  openPositions,
  closedPositions,
  openOrders,
  executedOrders,
  livePrices,
  onClosePosition,
  onCancelOrder,
  balance,
  realisedPnL,
  unrealisedPnL,
}) {
  const [tab, setTab] = useState('positions');

  return (
    <div className="orders-panel">
      {/* Account Summary */}
      <div className="orders-account-summary">
        <div className="oas-row">
          <span className="oas-label">Available</span>
          <span className="oas-value">{formatINR(balance)}</span>
        </div>
        <div className="oas-row">
          <span className="oas-label">Realised P&L</span>
          <span className={`oas-value ${realisedPnL >= 0 ? 'up' : 'down'}`}>
            {realisedPnL >= 0 ? '+' : ''}{formatINR(realisedPnL)}
          </span>
        </div>
        <div className="oas-row">
          <span className="oas-label">Unrealised P&L</span>
          <span className={`oas-value ${unrealisedPnL >= 0 ? 'up' : 'down'}`}>
            {unrealisedPnL >= 0 ? '+' : ''}{formatINR(unrealisedPnL)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="orders-tabs">
        <button
          className={`orders-tab ${tab === 'positions' ? 'active' : ''}`}
          onClick={() => setTab('positions')}
        >
          Positions ({openPositions.length})
        </button>
        <button
          className={`orders-tab ${tab === 'orders' ? 'active' : ''}`}
          onClick={() => setTab('orders')}
        >
          Orders ({openOrders.length})
        </button>
        <button
          className={`orders-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="orders-content">
        {tab === 'positions' && (
          <PositionsTab
            positions={openPositions}
            livePrices={livePrices}
            onClose={onClosePosition}
          />
        )}
        {tab === 'orders' && (
          <OpenOrdersTab
            orders={openOrders}
            onCancel={onCancelOrder}
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            closedPositions={closedPositions}
            executedOrders={executedOrders}
          />
        )}
      </div>
    </div>
  );
}

function PositionsTab({ positions, livePrices, onClose }) {
  if (positions.length === 0) {
    return <div className="orders-empty">No open positions</div>;
  }

  return (
    <div className="orders-list">
      {positions.map(pos => {
        const priceData = livePrices[pos.symbol];
        const currentPrice = priceData?.price || pos.avgPrice;
        let pnl;
        if (pos.side === 'BUY') {
          pnl = (currentPrice - pos.avgPrice) * pos.quantity;
        } else {
          pnl = (pos.avgPrice - currentPrice) * pos.quantity;
        }
        const isUp = pnl >= 0;

        return (
          <div key={pos.id} className="order-list-item">
            <div className="oli-header">
              <span className={`oli-side ${pos.side.toLowerCase()}`}>{pos.side}</span>
              <span className="oli-symbol">{pos.symbol.replace(/\.(NS|BO)$/, '')}</span>
              <span className="oli-product">{pos.product === 'MIS' ? 'Intraday' : 'Delivery'}</span>
              <button className="oli-exit-btn" onClick={() => onClose(pos.id, currentPrice)}>
                EXIT
              </button>
            </div>
            <div className="oli-details">
              <span>Qty: {pos.quantity}</span>
              <span>Avg: {formatINR(pos.avgPrice)}</span>
              <span>LTP: {formatINR(currentPrice)}</span>
            </div>
            <div className="oli-footer">
              <span className={`oli-pnl ${isUp ? 'up' : 'down'}`}>
                P&L: {isUp ? '+' : ''}{formatINR(pnl)}
              </span>
              {pos.stopLoss && <span className="oli-sl">SL: {formatINR(pos.stopLoss)}</span>}
              {pos.target && <span className="oli-tgt">TGT: {formatINR(pos.target)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OpenOrdersTab({ orders, onCancel }) {
  if (orders.length === 0) {
    return <div className="orders-empty">No open orders</div>;
  }

  return (
    <div className="orders-list">
      {orders.map(order => (
        <div key={order.id} className="order-list-item">
          <div className="oli-header">
            <span className={`oli-side ${order.side.toLowerCase()}`}>{order.side}</span>
            <span className="oli-symbol">{order.symbol.replace(/\.(NS|BO)$/, '')}</span>
            <span className="oli-product">{order.product === 'MIS' ? 'Intraday' : 'Delivery'}</span>
            <button className="oli-cancel-btn" onClick={() => onCancel(order.id)}>
              CANCEL
            </button>
          </div>
          <div className="oli-details">
            <span>Qty: {order.quantity}</span>
            <span>Limit: {formatINR(order.price)}</span>
            <span>{order.type}</span>
          </div>
          <div className="oli-footer">
            <span className="oli-time">
              {new Date(order.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {order.stopLoss && <span className="oli-sl">SL: {formatINR(order.stopLoss)}</span>}
            {order.target && <span className="oli-tgt">TGT: {formatINR(order.target)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ closedPositions, executedOrders }) {
  const items = useMemo(() => {
    return executedOrders.slice(0, 30);
  }, [executedOrders]);

  if (items.length === 0) {
    return <div className="orders-empty">No history yet</div>;
  }

  return (
    <div className="orders-list">
      {items.map(order => (
        <div key={order.id} className="order-list-item history">
          <div className="oli-header">
            <span className={`oli-side ${order.side.toLowerCase()}`}>{order.side}</span>
            <span className="oli-symbol">{order.symbol.replace(/\.(NS|BO)$/, '')}</span>
            <span className="oli-product">{order.product === 'MIS' ? 'Intraday' : 'Delivery'}</span>
            <span className="oli-status">{order.status}</span>
          </div>
          <div className="oli-details">
            <span>Qty: {order.quantity}</span>
            <span>Price: {formatINR(order.price)}</span>
          </div>
          <div className="oli-footer">
            <span className="oli-time">
              {new Date(order.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {order.note && <span className="oli-note">{order.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(OrdersPanel);
