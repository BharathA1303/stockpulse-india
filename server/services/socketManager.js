/**
 * SocketManager — WebSocket layer using Socket.IO.
 *
 * Handles real-time communication between the market simulator and
 * connected clients. Supports per-symbol subscriptions, ticker tape
 * broadcasts, order book updates, and live trade feeds.
 *
 * Events (Server → Client):
 *   tick:all     — All stock price ticks (for ticker tape)
 *   tick:{sym}   — Individual stock tick
 *   orderbook    — Order book snapshot for subscribed symbol
 *   trades       — Recent trades for subscribed symbol
 *   candle       — New candle for live chart streaming
 *
 * Events (Client → Server):
 *   subscribe    — { symbol } — join a symbol room
 *   unsubscribe  — { symbol } — leave a symbol room
 */

import { Server } from 'socket.io';

export default class SocketManager {
  /**
   * @param {import('http').Server} httpServer
   * @param {import('./marketSimulator.js').default} simulator
   */
  constructor(httpServer, simulator) {
    this.simulator = simulator;
    this.io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this._tickCount = 0;
    this._setupHandlers();
    this._setupSimulatorBridge();
  }

  /** Handle new client connections */
  _setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Subscribe to a symbol's room
      socket.on('subscribe', ({ symbol }) => {
        if (!symbol) return;
        socket.join(`stock:${symbol}`);
        // Send immediate snapshot
        const quote = this.simulator.getQuote(symbol);
        if (quote) socket.emit('snapshot', quote);
        const book = this.simulator.getOrderBook(symbol);
        socket.emit('orderbook', { symbol, ...book });
        const trades = this.simulator.getRecentTrades(symbol, 25);
        socket.emit('trades', { symbol, trades });
      });

      // Unsubscribe from a symbol's room
      socket.on('unsubscribe', ({ symbol }) => {
        if (!symbol) return;
        socket.leave(`stock:${symbol}`);
      });

      // Request chart data via WebSocket
      socket.on('getChart', ({ symbol, range }) => {
        const data = this.simulator.getChartData(symbol, range);
        socket.emit('chartData', data);
      });

      // Search stocks
      socket.on('search', ({ query }) => {
        const results = this.simulator.searchStocks(query);
        socket.emit('searchResults', results);
      });

      // Request all quotes (for initial ticker tape load)
      socket.on('getAllQuotes', () => {
        const quotes = this.simulator.getAllQuotes();
        socket.emit('allQuotes', quotes);
      });

      socket.on('disconnect', () => {
        // cleanup is automatic with Socket.IO rooms
      });
    });
  }

  /** Bridge simulator ticks to WebSocket broadcasts */
  _setupSimulatorBridge() {
    this.simulator.onTick((updates) => {
      this._tickCount++;

      // Broadcast all ticks for ticker tape (throttle to every 2 seconds)
      if (this._tickCount % 2 === 0) {
        this.io.emit('tick:all', updates);
      }

      // Send individual ticks to subscribed rooms
      for (const tick of updates) {
        this.io.to(`stock:${tick.symbol}`).emit('tick', tick);
      }

      // Update order books every 2 ticks for subscribed stocks
      if (this._tickCount % 2 === 0) {
        const rooms = this.io.sockets.adapter.rooms;
        for (const [roomName] of rooms) {
          if (roomName.startsWith('stock:')) {
            const symbol = roomName.replace('stock:', '');
            const book = this.simulator.getOrderBook(symbol);
            this.io.to(roomName).emit('orderbook', { symbol, ...book });
          }
        }
      }

      // Generate trades every tick for subscribed stocks
      const rooms = this.io.sockets.adapter.rooms;
      for (const [roomName] of rooms) {
        if (roomName.startsWith('stock:')) {
          const symbol = roomName.replace('stock:', '');
          const stock = this.simulator.stocks.get(symbol);
          if (!stock) continue;

          // Generate 1-3 random trades per tick
          const tradeCount = 1 + Math.floor(Math.random() * 3);
          const trades = [];
          for (let i = 0; i < tradeCount; i++) {
            const price = stock.currentPrice + (Math.random() - 0.5) * stock.currentPrice * 0.001;
            const ts = Date.now();
            trades.push({
              id: `t-${ts}-${Math.random().toString(36).substr(2, 5)}`,
              price: Math.round(price * 100) / 100,
              quantity: Math.floor(10 + Math.random() * 500),
              time: ts,
              type: Math.random() > 0.45 ? 'buy' : 'sell',
              timestamp: ts,
            });
          }
          this.io.to(roomName).emit('newTrades', { symbol, trades });
        }
      }
    });
  }

  /** Get count of connected clients */
  getConnectionCount() {
    return this.io.engine?.clientsCount || 0;
  }
}
