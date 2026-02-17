import { memo } from 'react';
import OrderBook from '../OrderBook';

/**
 * DepthPanel — Sidebar drawer content for Market Depth / Order Book.
 * Wraps the existing OrderBook component for use inside the Sidebar system.
 */
function DepthPanel({ orderBook, currentPrice, symbol }) {
  return (
    <div className="sidebar-panel depth-panel">
      <OrderBook
        orderBook={orderBook}
        currentPrice={currentPrice}
        symbol={symbol}
      />
    </div>
  );
}

export default memo(DepthPanel);
