# StockPulse India 📈🇮🇳

Real-time Indian stock market monitoring dashboard tracking **NSE** (National Stock Exchange) and **BSE** (Bombay Stock Exchange) listed companies.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

## Live Demo

| | URL |
|---|---|
| **Frontend** | _Deploy to Netlify_ |
| **Backend** | _Deploy to Render / Railway_ |

## Features

- 🔍 **Stock Search** — Debounced autocomplete filtered to NSE/BSE equities
- 💰 **Real-Time Prices** — Current price in ₹ with Indian numbering (₹12,34,567)
- 📊 **Interactive Charts** — 1D / 1W / 1M / 3M / 1Y historical data via Recharts
- ⭐ **Watchlist** — Add/remove stocks, persisted in localStorage
- 📉 **Market Summary** — NIFTY 50, SENSEX, BANK NIFTY at a glance
- 🌙 **Dark Mode** — One-click theme toggle with smooth transitions
- 📱 **Responsive Design** — Mobile-first, 375 px → 1440 px breakpoints
- ♿ **Accessible** — Semantic HTML, ARIA labels, keyboard navigation

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite | Fast HMR, modern ESM bundler |
| Charts | Recharts | Declarative, responsive, React-native |
| Backend | Node.js + Express | Lightweight API proxy |
| Data | yahoo-finance2 | Free Yahoo Finance wrapper, no API key |
| Styling | CSS Custom Properties | Themeable, no runtime cost |
| Testing | Vitest + Testing Library | Fast, Vite-native test runner |

## Folder Structure

```
stockpulse-india/
├── server/                  # Express API proxy
│   ├── index.js             # Server entry
│   ├── routes/
│   │   ├── quote.js         # GET /api/quote/:symbol
│   │   ├── chart.js         # GET /api/chart/:symbol?range=
│   │   └── search.js        # GET /api/search/:query
│   └── utils/
│       ├── cache.js          # In-memory TTL cache
│       └── sanitize.js       # Input sanitisation helpers
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Formatters (INR, lakhs/crores)
│   │   ├── constants/       # Stock symbols, indices
│   │   ├── styles/          # CSS
│   │   ├── test/            # Vitest tests
│   │   ├── App.jsx          # Root component
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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/quote/:symbol` | Current price quote. Auto-appends `.NS` if no exchange suffix. |
| `GET` | `/api/chart/:symbol?range=` | Historical OHLCV data. Range: `1d`, `1w`, `1mo`, `3mo`, `1y` |
| `GET` | `/api/search/:query` | Autocomplete search filtered to NSE (`.NS`) & BSE (`.BO`) |
| `GET` | `/api/health` | Health check endpoint |

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
