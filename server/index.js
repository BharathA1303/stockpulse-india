/**
 * StockPulse India — Express + Socket.IO Server
 *
 * Integrates:
 *   - MarketSimulator for realistic stock data simulation
 *   - Socket.IO WebSocket for real-time price streaming
 *   - REST API endpoints for quotes, charts, and search
 *   - Yahoo Finance as optional data enrichment
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import MarketSimulator from './services/marketSimulator.js';
import SocketManager from './services/socketManager.js';
import quoteRouter from './routes/quote.js';
import chartRouter from './routes/chart.js';
import searchRouter from './routes/search.js';
import tradingRouter from './routes/trading.js';

// ─── Initialize ─────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Create and start the market simulator
const simulator = new MarketSimulator();
simulator.start(1000); // Tick every 1 second

// Attach simulator to app for routes to access
app.set('simulator', simulator);

// Initialize WebSocket layer
const socketManager = new SocketManager(httpServer, simulator);

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    methods: ['GET', 'POST'],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/quote', quoteRouter);
app.use('/api/chart', chartRouter);
app.use('/api/search', searchRouter);
app.use('/api/trading', tradingRouter);

// Health check with system info
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stocks: simulator.getSymbols().length,
    wsConnections: socketManager.getConnectionCount(),
    uptime: process.uptime(),
  });
});

// All available stocks endpoint
app.get('/api/stocks', (_req, res) => {
  res.json(simulator.getAllQuotes());
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ──────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`🚀 StockPulse server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`📊 Simulating ${simulator.getSymbols().length} stocks`);
});

export default app;
