import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

/**
 * useWebSocket — React hook for Socket.IO real-time market data.
 *
 * Returns:
 *   socket       — raw socket instance (for manual emit)
 *   connected    — boolean connection status
 *   subscribe    — (symbol) => void  — join a symbol room
 *   unsubscribe  — (symbol) => void  — leave a symbol room
 *   liveTick     — latest tick for the subscribed symbol
 *   allTicks     — latest batch of all stock ticks (for ticker tape)
 *   orderBook    — latest order book for subscribed symbol
 *   newTrades    — latest batch of new trades
 *   chartData    — chart data received via WebSocket
 *   searchResults — search results from WebSocket
 *   requestChart — (symbol, range) => void
 *   searchStocks — (query) => void
 *   requestAllQuotes — () => void
 *   allQuotes    — all quotes snapshot
 *   snapshot     — latest quote snapshot for subscribed symbol
 */
export function useWebSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [liveTick, setLiveTick] = useState(null);
  const [allTicks, setAllTicks] = useState({});
  const [orderBook, setOrderBook] = useState(null);
  const [newTrades, setNewTrades] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const currentSymbolRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('🔌 WebSocket connected');
      // Re-subscribe on reconnect
      if (currentSymbolRef.current) {
        socket.emit('subscribe', { symbol: currentSymbolRef.current });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Per-symbol tick
    socket.on('tick', (data) => {
      setLiveTick(data);
    });

    // All ticks for ticker tape — convert array to map keyed by symbol
    socket.on('tick:all', (data) => {
      if (Array.isArray(data)) {
        const tickMap = {};
        for (const t of data) {
          if (t.symbol) tickMap[t.symbol] = t;
        }
        setAllTicks(tickMap);
      } else {
        setAllTicks(data || {});
      }
    });

    // Order book updates
    socket.on('orderbook', (data) => {
      setOrderBook(data);
    });

    // New trades
    socket.on('newTrades', (data) => {
      setNewTrades(data);
    });

    // Chart data response
    socket.on('chartData', (data) => {
      setChartData(data);
    });

    // Search results
    socket.on('searchResults', (data) => {
      setSearchResults(data);
    });

    // All quotes
    socket.on('allQuotes', (data) => {
      setAllQuotes(data);
    });

    // Snapshot for subscribed symbol
    socket.on('snapshot', (data) => {
      setSnapshot(data);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((symbol) => {
    const socket = socketRef.current;
    if (!socket) return;

    // Unsubscribe from previous
    if (currentSymbolRef.current && currentSymbolRef.current !== symbol) {
      socket.emit('unsubscribe', { symbol: currentSymbolRef.current });
    }

    currentSymbolRef.current = symbol;
    socket.emit('subscribe', { symbol });
  }, []);

  const unsubscribe = useCallback((symbol) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('unsubscribe', { symbol });
    if (currentSymbolRef.current === symbol) {
      currentSymbolRef.current = null;
    }
  }, []);

  const requestChart = useCallback((symbol, range) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('getChart', { symbol, range });
  }, []);

  const searchStocks = useCallback((query) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('search', { query });
  }, []);

  const requestAllQuotes = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('getAllQuotes');
  }, []);

  return {
    socket: socketRef.current,
    connected,
    subscribe,
    unsubscribe,
    liveTick,
    allTicks,
    orderBook,
    newTrades,
    chartData,
    searchResults,
    searchStocks,
    requestChart,
    requestAllQuotes,
    allQuotes,
    snapshot,
  };
}
