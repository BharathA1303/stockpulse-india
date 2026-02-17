# Changelog

All notable changes to **StockPulse India** will be documented in this file.

## [2.0.0] - 2026-02-17

### Added
- Paper trading engine with Market/Limit orders, Buy/Sell, CNC/MIS product types
- SQLite persistence layer (better-sqlite3) for trading data
- Trading API routes (orders, positions, account, SL/Target triggers)
- WebSocket integration with Socket.IO for live price ticks & order book
- Market simulator service with CSV-based price generation
- Professional sidebar with icon rail + expandable drawer panels
- Sidebar panels: Watchlist, Orders, Trades, Market Depth, Indices, Balance
- Resizable right info panel with drag handle and container queries
- Multi-watchlist support with CRUD operations (create, rename, delete, switch)
- Inline stock search within watchlists with auto-naming (Watchlist 1, 2, 3…)
- Top indices bar with real-time NIFTY, SENSEX, BANK NIFTY tracking
- Live ticker tape with scrolling price updates
- Order form with quantity, price, SL, target, and order summary
- Position tracking with real-time unrealised P&L
- Account balance panel with margin and funds management
- Container queries for responsive panel content on drag-resize

### Fixed
- Search autocomplete reliability — replaced useStockSearch hook with direct fetch + AbortController
- Right panel empty space below content — flexbox layout fills available height
- Search results clearing properly on selection and when input is emptied

### Changed
- Upgraded from single watchlist to multi-watchlist architecture
- Chart component enhanced with multiple chart types
- Stock card and market summary components updated for live data

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
