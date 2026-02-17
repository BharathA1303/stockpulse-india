# StockPulse India 📈🇮🇳

Real-time Indian stock market trading terminal built with **React**, **Node.js** & **Socket.IO**. Features live charts, order book, watchlist, and market depth tracking **NSE** (National Stock Exchange) and **BSE** (Bombay Stock Exchange) listed companies.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

## Live Demo

| | URL |
|---|---|
| **Frontend** | _Deploy to Netlify_ |
| **Backend** | _Deploy to Render / Railway_ |

## Features

### Core Trading
- 🔍 **Stock Search** — Debounced autocomplete with AbortController for reliable results, filtered to NSE/BSE equities
- 💰 **Real-Time Prices** — Live price updates via WebSocket with Indian numbering (₹12,34,567)
- 📊 **Interactive Charts** — 1D / 1W / 1M / 3M / 1Y historical data via Recharts with multiple chart types
- 📈 **Live Market Data** — Real-time ticker tape, top indices bar (NIFTY 50, SENSEX, BANK NIFTY), and market depth

### Trading Engine
- 💹 **Paper Trading** — Simulated trading engine with ₹10,00,000 starting balance
- 📋 **Order Management** — Market & Limit orders with Buy/Sell, CNC/MIS product types
- 🎯 **Stop Loss & Target** — Automated position closing on SL/Target triggers
- 📊 **Position Tracking** — Open/closed positions with real-time P&L calculation
- 🏦 **Account Management** — Balance tracking, margin calculation, add funds support
- 💾 **SQLite Persistence** — All trading data persisted via better-sqlite3

### Multi-Watchlist
- ⭐ **Multiple Watchlists** — Create unlimited watchlists with custom names
- ✏️ **Inline CRUD** — Rename, delete, and switch between watchlists in the sidebar
- 🔎 **Inline Search** — Search and add stocks directly within each watchlist
- 📝 **Auto-Naming** — Auto-assigns names (Watchlist 1, 2, 3…) when no name is provided
- 💾 **Persistent Storage** — All watchlists saved to localStorage

### Professional UI
- 🖥️ **Professional Sidebar** — Icon rail with expandable drawer panels (Watchlist, Orders, Trades, Depth, Indices, Balance)
- 📐 **Resizable Right Panel** — Drag-to-resize stock info panel with container queries for responsive content
- 🏗️ **Responsive Layout** — Adaptive design from mobile (375px) to ultra-wide (1440px+) with tablet overlay support
- 🌙 **Dark Mode** — One-click theme toggle with smooth CSS transitions
- ♿ **Accessible** — Semantic HTML, ARIA labels, keyboard navigation

### Real-Time Features
- 🔌 **WebSocket Integration** — Socket.IO for live price ticks, order book updates, and market data streaming
- 📡 **Market Simulator** — Server-side price simulation from CSV dataset with realistic tick generation
- 📊 **Order Book** — Live bid/ask depth visualization
- 📰 **Trades Ticker** — Real-time trade feed display

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite | Fast HMR, modern ESM bundler |
| Charts | Recharts | Declarative, responsive, React-native |
| Backend | Node.js + Express | Lightweight API proxy |
| Real-Time | Socket.IO | WebSocket for live price updates |
| Data | yahoo-finance2 | Free Yahoo Finance wrapper, no API key |
| Database | better-sqlite3 | Fast SQLite for trading persistence |
| Styling | CSS Custom Properties | Themeable, container queries, no runtime cost |
| Testing | Vitest + Testing Library | Fast, Vite-native test runner |

## Folder Structure

```
stockpulse-india/
├── server/                  # Express API + WebSocket server
│   ├── index.js             # Server entry + Socket.IO setup
│   ├── routes/
│   │   ├── quote.js         # GET /api/quote/:symbol
│   │   ├── chart.js         # GET /api/chart/:symbol?range=
│   │   ├── search.js        # GET /api/search/:query
│   │   └── trading.js       # Trading REST API (orders, positions, account)
│   ├── services/
│   │   ├── marketSimulator.js  # CSV-based price simulation engine
│   │   ├── socketManager.js    # WebSocket event management
│   │   └── tradingDB.js        # SQLite trading persistence layer
│   └── utils/
│       ├── cache.js          # In-memory TTL cache
│       └── sanitize.js       # Input sanitisation helpers
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React UI components
│   │   │   ├── panels/      # Sidebar drawer panels (Watchlist, Orders, Trades, etc.)
│   │   │   └── trading/     # Trading components (OrderForm, PositionSummary, etc.)
│   │   ├── hooks/           # Custom React hooks (useWebSocket, useTrading, etc.)
│   │   ├── services/        # Client-side trading engine
│   │   ├── utils/           # Formatters (INR, lakhs/crores)
│   │   ├── constants/       # Stock symbols, market indices
│   │   ├── styles/          # CSS with container queries
│   │   ├── test/            # Vitest tests
│   │   ├── App.jsx          # Root component with responsive layouts
│   │   └── main.jsx         # Entry point
│   └── vite.config.js
├── package.json             # Root (dev scripts)
└── README.md
```

## Setup Instructions

### Prerequisites

- **Node.js ≥ 18** and **npm ≥ 9**

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/stockpulse-india.git
cd stockpulse-india
npm run install:all
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Express server port |
| `NODE_ENV` | `development` | Environment |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |

For production, create `client/.env.production`:

```
VITE_API_URL=https://your-backend-url.com
```

### 3. Run Development Servers

```bash
# From project root — starts both servers concurrently
npm run dev
```

Or individually:

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client && npm run dev
```

### 4. Run Tests

```bash
cd client && npm test
```

## API Endpoints

All endpoints are prefixed with `/api`.

### Market Data

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/quote/:symbol` | Current price quote. Auto-appends `.NS` if no exchange suffix. |
| `GET` | `/api/chart/:symbol?range=` | Historical OHLCV data. Range: `1d`, `1w`, `1mo`, `3mo`, `1y` |
| `GET` | `/api/search/:query` | Autocomplete search filtered to NSE (`.NS`) & BSE (`.BO`) |
| `GET` | `/api/health` | Health check endpoint |

### Trading

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/trading/account` | Account balance, margin, and P&L |
| `GET` | `/api/trading/positions` | Open and closed positions |
| `GET` | `/api/trading/orders` | Open and executed orders |
| `POST` | `/api/trading/order` | Place a new order (Market/Limit, Buy/Sell) |
| `POST` | `/api/trading/close/:id` | Close an open position |
| `POST` | `/api/trading/cancel/:id` | Cancel a pending limit order |
| `POST` | `/api/trading/check-triggers` | Check SL/Target triggers against live prices |
| `POST` | `/api/trading/add-money` | Add funds to trading account |
| `POST` | `/api/trading/reset` | Reset account to defaults (₹10,00,000) |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe` | Client → Server | Subscribe to a stock symbol for live ticks |
| `unsubscribe` | Client → Server | Unsubscribe from a stock symbol |
| `liveTick` | Server → Client | Real-time price update for subscribed symbol |
| `allTicks` | Server → Client | Batch tick updates for all active symbols |
| `orderBook` | Server → Client | Live order book depth data |

### Symbol Convention

| Exchange | Suffix | Example |
|----------|--------|---------|
| NSE | `.NS` | `RELIANCE.NS`, `TCS.NS`, `INFY.NS` |
| BSE | `.BO` | `RELIANCE.BO` |
| Index | `^` prefix | `^NSEI` (NIFTY), `^BSESN` (SENSEX), `^NSEBANK` |

## Indian Numbering Format

This app uses the **Indian numbering system** (lakhs and crores), not the Western million/billion system:

| Value | Western | Indian |
|-------|---------|--------|
| 100,000 | 100K | 1 L (Lakh) |
| 10,000,000 | 10M | 1 Cr (Crore) |
| 1,234,567 | 1,234,567 | 12,34,567 |

Currency is always formatted using `Intl.NumberFormat('en-IN')` for locale-correct grouping.

## Deployment

### Frontend → Netlify

1. Connect your GitHub repo to Netlify
2. Build command: `cd client && npm run build`
3. Publish directory: `client/dist`
4. Environment variable: `VITE_API_URL=https://your-backend.onrender.com`

### Backend → Render

1. Create a new Web Service on Render
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variable: `CLIENT_URL=https://your-app.netlify.app`

## License

MIT © 2026
