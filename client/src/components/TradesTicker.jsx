import { useState, useEffect, useRef } from 'react';

/**
 * Time & Sales / Recent Trades ticker.
 * Receives trade data from WebSocket.
 * Displays a scrolling feed of recent trades.
 */
export default function TradesTicker({ newTrades, currentPrice, symbol }) {
  const [trades, setTrades] = useState([]);
  const listRef = useRef(null);
  const prevTradesRef = useRef(null);

  // Accumulate incoming trades, keep last 50
  useEffect(() => {
    if (!newTrades || !newTrades.trades?.length) return;
    // Avoid duplicates from same reference
    if (prevTradesRef.current === newTrades) return;
    prevTradesRef.current = newTrades;

    setTrades(prev => {
      const merged = [...newTrades.trades, ...prev];
      return merged.slice(0, 50);
    });
  }, [newTrades]);

  // Generate some initial trades if websocket hasn't sent any yet
  useEffect(() => {
    if (trades.length > 0 || !currentPrice) return;

    const initial = [];
    const now = Date.now();
    for (let i = 0; i < 15; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const px = currentPrice + dir * currentPrice * Math.random() * 0.002;
      initial.push({
        id: `init-${i}`,
        price: Math.round(px * 100) / 100,
        quantity: Math.floor(1 + Math.random() * 500),
        time: now - i * 2000,
        type: dir > 0 ? 'buy' : 'sell',
      });
    }
    setTrades(initial);
  }, [currentPrice, trades.length]);

  // Auto-scroll to latest
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [trades]);

  // Reset on symbol change
  useEffect(() => {
    setTrades([]);
  }, [symbol]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    // Handle both numeric timestamps and date strings
    const d = new Date(typeof ts === 'number' ? ts : Number(ts) || ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="trades-ticker">
      <div className="trades-header">
        <h3>Time &amp; Sales</h3>
        <span className="trades-count">{trades.length} trades</span>
      </div>

      <div className="trades-table-head">
        <span className="trades-col">Time</span>
        <span className="trades-col trades-price-col">Price</span>
        <span className="trades-col">Qty</span>
        <span className="trades-col">Type</span>
      </div>

      <div className="trades-list" ref={listRef}>
        {trades.map((t, i) => (
          <div
            key={t.id || i}
            className={`trades-row ${t.type === 'buy' ? 'trade-buy' : 'trade-sell'} ${i === 0 ? 'trade-new' : ''}`}
          >
            <span className="trades-col trades-time">{formatTime(t.timestamp || t.time)}</span>
            <span className="trades-col trades-price-col trades-price">
              ₹{t.price?.toFixed(2)}
            </span>
            <span className="trades-col trades-qty">{t.quantity?.toLocaleString('en-IN')}</span>
            <span className={`trades-col trades-type ${t.type}`}>
              {t.type === 'buy' ? 'B' : 'S'}
            </span>
          </div>
        ))}
        {trades.length === 0 && (
          <div className="trades-empty">Waiting for trades...</div>
        )}
      </div>
    </div>
  );
}
