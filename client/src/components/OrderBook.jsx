import { useMemo, memo } from 'react';

/**
 * Order Book / Market Depth display.
 * Column order: BID QTY | BID ORDERS | BID PRICE || ASK PRICE | ASK ORDERS | ASK QTY
 * Mobile: BID QTY | BID PRICE || ASK PRICE | ASK QTY  (orders hidden via CSS)
 */
function OrderBook({ orderBook, currentPrice, symbol }) {
  const book = useMemo(() => {
    if (orderBook && orderBook.bids?.length > 0) {
      return orderBook;
    }

    // Generate fallback data
    if (!currentPrice) return { bids: [], asks: [] };
    const bids = [], asks = [];
    const spread = currentPrice * 0.0005;

    for (let i = 0; i < 5; i++) {
      bids.push({
        price: Math.round((currentPrice - spread * (i + 1)) * 100) / 100,
        quantity: Math.floor(50 + Math.random() * 2000),
        orders: Math.floor(1 + Math.random() * 20),
        total: 0,
      });
      asks.push({
        price: Math.round((currentPrice + spread * (i + 1)) * 100) / 100,
        quantity: Math.floor(50 + Math.random() * 2000),
        orders: Math.floor(1 + Math.random() * 20),
        total: 0,
      });
    }

    let bt = 0, at = 0;
    bids.forEach(b => { bt += b.quantity; b.total = bt; });
    asks.forEach(a => { at += a.quantity; a.total = at; });

    return { bids, asks };
  }, [orderBook, currentPrice]);

  const displayBids = book.bids.slice(0, 5);
  const displayAsks = book.asks.slice(0, 5);

  const maxTotal = useMemo(() => {
    const maxBid = Math.max(...displayBids.map(b => b.total), 1);
    const maxAsk = Math.max(...displayAsks.map(a => a.total), 1);
    return Math.max(maxBid, maxAsk);
  }, [book]);

  if (!currentPrice) return null;

  return (
    <div className="order-book">
      <div className="order-book-header">
        <h3>Market Depth</h3>
        <span className="order-book-symbol">{symbol?.replace(/\.(NS|BO)$/, '')}</span>
      </div>

      <div className="order-book-table">
        {/* Header: Qty | Orders | Price || Price | Orders | Qty */}
        <div className="ob-row ob-header-row">
          <div className="ob-bid-side">
            <span className="ob-col">Qty</span>
            <span className="ob-col ob-orders-col">Orders</span>
            <span className="ob-col ob-price-col">Bid</span>
          </div>
          <div className="ob-ask-side">
            <span className="ob-col ob-price-col">Ask</span>
            <span className="ob-col ob-orders-col">Orders</span>
            <span className="ob-col">Qty</span>
          </div>
        </div>

        {displayBids.map((bid, i) => {
          const ask = displayAsks[i];
          const bidWidth = (bid.total / maxTotal) * 100;
          const askWidth = ask ? (ask.total / maxTotal) * 100 : 0;

          return (
            <div key={i} className="ob-row ob-data-row">
              <div className="ob-bid-side">
                <div className="ob-depth-bar bid-bar" style={{ width: `${bidWidth}%` }} />
                <span className="ob-col ob-qty">{bid.quantity.toLocaleString('en-IN')}</span>
                <span className="ob-col ob-orders">{bid.orders}</span>
                <span className="ob-col ob-price-col ob-bid-price">{bid.price.toFixed(2)}</span>
              </div>
              <div className="ob-ask-side">
                <div className="ob-depth-bar ask-bar" style={{ width: `${askWidth}%` }} />
                <span className="ob-col ob-price-col ob-ask-price">{ask?.price.toFixed(2)}</span>
                <span className="ob-col ob-orders">{ask?.orders}</span>
                <span className="ob-col ob-qty">{ask?.quantity.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}

        <div className="ob-row ob-totals-row">
          <div className="ob-bid-side">
            <span className="ob-col ob-total-qty">{displayBids.reduce((s, b) => s + b.quantity, 0).toLocaleString('en-IN')}</span>
            <span className="ob-col ob-orders">{displayBids.reduce((s, b) => s + b.orders, 0)}</span>
            <span className="ob-col" />
          </div>
          <div className="ob-ask-side">
            <span className="ob-col" />
            <span className="ob-col ob-orders">{displayAsks.reduce((s, a) => s + a.orders, 0)}</span>
            <span className="ob-col ob-total-qty">{displayAsks.reduce((s, a) => s + a.quantity, 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(OrderBook);
