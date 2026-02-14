# Changelog

All notable changes to **StockPulse India** will be documented in this file.

## [1.0.0] - 2026-02-14

### Added
- Project scaffolding with Vite + React 18 frontend
- Express API proxy backend with yahoo-finance2
- Stock search with debounced autocomplete (NSE/BSE filter)
- Real-time stock price card with Indian numbering system
- Interactive historical price chart (1D/1W/1M/3M/1Y) via Recharts
- Watchlist with localStorage persistence
- Market summary for NIFTY 50, SENSEX, BANK NIFTY
- Dark mode toggle with CSS custom properties
- Responsive design (375px → 1440px)
- Skeleton loaders and error states with retry buttons
- Input sanitisation on all API endpoints
- In-memory TTL cache (60s) for API responses
- Rate limiting (100 req/15 min per IP)
- Helmet.js security headers
- 25+ Vitest unit & component tests
- Comprehensive README with setup instructions
