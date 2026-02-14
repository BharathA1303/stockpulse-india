import { useState, useEffect, useRef } from 'react';
import { POPULAR_STOCKS, API_BASE_URL } from '../constants/stockSymbols';

/**
 * Horizontal scrolling ticker tape — uses WebSocket allTicks for live updates.
 * Clicking a stock selects it in the app.
 * Scroll speed is intentionally slow for readability.
 */
export default function TickerTape({ allTicks = [], connected, requestAllQuotes, onSelectStock }) {
  const [tickers, setTickers] = useState([]);
  const initialFetched = useRef(false);

  // Fetch initial data via REST
  useEffect(() => {
    if (initialFetched.current) return;

    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/stocks`);
        if (res.ok) {
          const data = await res.json();
          setTickers(data.map(d => ({
            symbol: (d.symbol || '').replace(/\.(NS|BO)$/, ''),
            fullSymbol: d.symbol,
            price: d.price,
            change: d.change,
            changePercent: d.changePercent,
          })));
          initialFetched.current = true;
        }
      } catch {
        setTickers(POPULAR_STOCKS.slice(0, 15).map(s => {
          const fakePrice = 500 + Math.random() * 3000;
          const fakeChange = (Math.random() - 0.45) * fakePrice * 0.02;
          return {
            symbol: s.symbol.replace('.NS', ''),
            fullSymbol: s.symbol,
            price: Math.round(fakePrice * 100) / 100,
            change: Math.round(fakeChange * 100) / 100,
            changePercent: Math.round((fakeChange / fakePrice) * 10000) / 100,
          };
        }));
      }
    };

    fetchInitial();
  }, []);

  // Update from WebSocket ticks
  useEffect(() => {
    if (allTicks && allTicks.length > 0) {
      setTickers(allTicks.map(t => ({
        symbol: (t.symbol || '').replace(/\.(NS|BO)$/, ''),
        fullSymbol: t.symbol,
        price: t.price,
        change: t.change,
        changePercent: t.changePercent,
      })));
    }
  }, [allTicks]);

  const handleClick = (ticker) => {
    if (onSelectStock && ticker.fullSymbol) {
      onSelectStock(ticker.fullSymbol);
    }
  };

  if (tickers.length === 0) return null;

  // Triplicate for seamless infinite scroll
  const allTkrs = [...tickers, ...tickers, ...tickers];

  return (
    <div className="ticker-tape">
      <div className="ticker-scroll">
        {allTkrs.map((t, i) => {
          const isUp = t.change >= 0;
          return (
            <button
              key={`${t.symbol}-${i}`}
              className="ticker-item"
              onClick={() => handleClick(t)}
              title={`View ${t.symbol}`}
            >
              <span className="ticker-symbol">{t.symbol}</span>
              <span className="ticker-price">
                ₹{t.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`ticker-change ${isUp ? 'up' : 'down'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(t.changePercent || 0).toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
