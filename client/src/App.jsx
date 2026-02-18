import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import TickerTape from './components/TickerTape';
import Sidebar from './components/Sidebar';
import RightInfoPanel from './components/RightInfoPanel';
import ResizablePanel from './components/ResizablePanel';
import LivePriceDisplay from './components/LivePriceDisplay';
import CustomChart from './components/CustomChart';
import OrderBook from './components/OrderBook';
import TradesTicker from './components/TradesTicker';
import WatchlistSection from './components/WatchlistSection';
import MarketSummary from './components/MarketSummary';
import SearchAutocomplete from './components/SearchAutocomplete';
import BottomNav from './components/BottomNav';
import Drawer from './components/Drawer';
import MobileTabs from './components/MobileTabs';
import MobileStockCard from './components/MobileStockCard';
import OrderForm from './components/trading/OrderForm';
import BalancePanel from './components/panels/BalancePanel';
import OrdersPanel from './components/panels/OrdersPanel';
import { ToastProvider, useToast } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useWebSocket } from './hooks/useWebSocket';
import { useStockData, useChartData } from './hooks/useStockData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useBreakpoint } from './hooks/useBreakpoint';
import { useLiveMarketStore } from './hooks/useLiveMarketStore';
import { useTrading } from './hooks/useTrading';
import TopIndicesBar from './components/TopIndicesBar';
import { POPULAR_STOCKS } from './constants/stockSymbols';

// Build initial multi-watchlist data, migrating from old single-list format
const INITIAL_WATCHLISTS = (() => {
  try {
    const existing = window.localStorage.getItem('sp-watchlists');
    if (existing) return JSON.parse(existing);
    const old = JSON.parse(window.localStorage.getItem('sp-watchlist') || '[]');
    return {
      lists: [{ id: 'wl-1', name: 'Watchlist 1', symbols: Array.isArray(old) ? old : [] }],
      activeId: 'wl-1',
      nextNum: 2,
    };
  } catch {
    return { lists: [{ id: 'wl-1', name: 'Watchlist 1', symbols: [] }], activeId: 'wl-1', nextNum: 2 };
  }
})();

const DEPTH_TRADES_TABS = [
  { id: 'depth', label: 'Depth' },
  { id: 'trades', label: 'Trades' },
];

const INFO_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'orders', label: 'Orders' },
  { id: 'balance', label: 'Balance' },
];

/**
 * Root application — Responsive trading terminal.
 * Mobile (<768): Stacked layout + bottom nav + drawers
 * Tablet (768-1023): Sidebar overlay + chart + bottom panel
 * Desktop (1024+): Sidebar + chart + right info panel
 */
function AppInner() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const toast = useToast();
  const { user, logout } = useAuth();

  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS');
  const [watchlistData, setWatchlistData] = useLocalStorage('sp-watchlists', INITIAL_WATCHLISTS);
  const [darkMode, setDarkMode] = useLocalStorage('sp-dark-mode', true);
  const [activeTab, setActiveTab] = useState('depth');
  const [chartRange, setChartRange] = useState('1mo');
  const [isLive, setIsLive] = useState(true);

  // Professional sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState(null);

  // Mobile state
  const [mobileNavTab, setMobileNavTab] = useState('chart');
  const [mobileContentTab, setMobileContentTab] = useState('overview');
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);

  const ws = useWebSocket();
  const { data: restStockData, loading } = useStockData(selectedSymbol);
  const { data: restChartData } = useChartData(selectedSymbol, chartRange);

  // Centralized live price store from WebSocket
  const { prices: livePrices } = useLiveMarketStore(ws);

  // Trading engine
  const trading = useTrading(livePrices);

  // ── Multi-Watchlist derived state ──
  const activeWatchlist = useMemo(() => {
    return watchlistData.lists.find(l => l.id === watchlistData.activeId) || watchlistData.lists[0];
  }, [watchlistData]);

  // Flat array of active watchlist symbols (used for backward compat)
  const watchlist = activeWatchlist?.symbols || [];

  // All symbols across every watchlist (for star-button check)
  const allWatchlistSymbols = useMemo(() => {
    const symbols = new Set();
    watchlistData.lists.forEach(l => l.symbols.forEach(s => symbols.add(s)));
    return [...symbols];
  }, [watchlistData]);

  // Positions for currently selected symbol
  const currentSymbolPositions = useMemo(() => {
    return trading.openPositions.filter(p => p.symbol === selectedSymbol);
  }, [trading.openPositions, selectedSymbol]);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }

  // Ensure proper viewport meta tag
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  }, []);

  useEffect(() => {
    if (selectedSymbol && ws.connected) {
      ws.subscribe(selectedSymbol);
      ws.requestChart(selectedSymbol, chartRange);
    }
  }, [selectedSymbol, ws.connected, chartRange]);

  // ── Refetch REST data when WebSocket reconnects (server may have restarted) ──
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (ws.connected && !prevConnectedRef.current) {
      // WebSocket just connected/reconnected — refresh REST data too
      if (restStockData === null || restChartData === null) {
        // Data hooks will auto-retry, but request via WS as well
        ws.requestAllQuotes();
      }
    }
    prevConnectedRef.current = ws.connected;
  }, [ws.connected]);

  // ── Freeze Depth/Trades when Live is OFF ──
  const frozenOrderBookRef = useRef(null);
  useEffect(() => {
    if (isLive && ws.orderBook) {
      frozenOrderBookRef.current = ws.orderBook;
    }
  }, [isLive, ws.orderBook]);

  const displayOrderBook = isLive ? ws.orderBook : frozenOrderBookRef.current;
  const displayNewTrades = isLive ? ws.newTrades : null; // null stops accumulation

  const stockData = useMemo(() => {
    const base = restStockData || ws.snapshot;
    if (!base) {
      const stock = POPULAR_STOCKS.find(s => s.symbol === selectedSymbol);
      const bp = 1500 + Math.random() * 2000;
      const ch = (Math.random() - 0.45) * bp * 0.02;
      return {
        symbol: selectedSymbol,
        shortName: stock?.name || selectedSymbol?.replace(/\.(NS|BO)$/, ''),
        exchange: 'NSE', marketState: 'REGULAR',
        price: Math.round(bp * 100) / 100,
        previousClose: Math.round((bp - ch) * 100) / 100,
        open: Math.round(bp * 100) / 100,
        dayHigh: Math.round(bp * 1.012 * 100) / 100,
        dayLow: Math.round(bp * 0.988 * 100) / 100,
        fiftyTwoWeekHigh: Math.round(bp * 1.3 * 100) / 100,
        fiftyTwoWeekLow: Math.round(bp * 0.72 * 100) / 100,
        volume: Math.floor(8e6 + Math.random() * 15e6),
        marketCap: Math.floor(bp * 6e9),
        change: Math.round(ch * 100) / 100,
        changePercent: Math.round((ch / bp) * 10000) / 100,
        peRatio: 20 + Math.random() * 30,
        pbRatio: 2 + Math.random() * 8,
        eps: Math.round(bp / 25 * 100) / 100,
        bookValue: Math.round(bp / 3.5 * 100) / 100,
        dividendYield: Math.random() * 0.03,
      };
    }
    if (isLive && ws.liveTick && ws.liveTick.symbol === selectedSymbol) {
      return {
        ...base,
        price: ws.liveTick.price,
        change: ws.liveTick.change,
        changePercent: ws.liveTick.changePercent,
        volume: ws.liveTick.volume || base.volume,
        dayHigh: Math.max(base.dayHigh || 0, ws.liveTick.dayHigh || 0),
        dayLow: ws.liveTick.dayLow > 0 ? Math.min(base.dayLow || Infinity, ws.liveTick.dayLow) : base.dayLow,
      };
    }
    return base;
  }, [restStockData, ws.snapshot, ws.liveTick, selectedSymbol, isLive]);

  const baseChartCandles = useMemo(() => {
    const source = ws.chartData || restChartData;
    if (!source?.data?.length) return [];
    return source.data.map(d => ({
      date: d.date,
      open: d.open ?? d.close,
      high: d.high ?? d.close,
      low: d.low ?? d.close,
      close: d.close,
      volume: d.volume || 0,
    }));
  }, [ws.chartData, restChartData]);

  const chartDataSource = useMemo(() => {
    const source = ws.chartData || restChartData;
    return source?.source || 'simulator';
  }, [ws.chartData, restChartData]);

  // Accumulate live ticks into chart candles using state for proper reactivity
  const liveCandleRef = useRef({ candle: null, baseLen: 0, lastSymbol: null, lastRange: null });

  const chartCandles = useMemo(() => {
    if (!isLive || !ws.liveTick || ws.liveTick.symbol !== selectedSymbol || baseChartCandles.length === 0) {
      liveCandleRef.current = { candle: null, baseLen: baseChartCandles.length, lastSymbol: selectedSymbol, lastRange: chartRange };
      return baseChartCandles;
    }

    const tick = ws.liveTick;
    const lc = liveCandleRef.current;

    // Reset live candle tracking when base data, symbol, or range changes
    if (lc.baseLen !== baseChartCandles.length || lc.lastSymbol !== selectedSymbol || lc.lastRange !== chartRange) {
      lc.candle = null;
      lc.baseLen = baseChartCandles.length;
      lc.lastSymbol = selectedSymbol;
      lc.lastRange = chartRange;
    }

    const now = new Date();
    // Determine candle interval based on chart range
    const intervalMs = chartRange === '1m' ? 60000 : chartRange === '5m' ? 300000 :
      chartRange === '1d' ? 300000 : chartRange === '1w' ? 900000 : 86400000;

    const lastBase = baseChartCandles[baseChartCandles.length - 1];
    const lastBaseTime = new Date(lastBase.date).getTime();
    const currentBucket = Math.floor(now.getTime() / intervalMs) * intervalMs;

    if (!lc.candle || lc.candle._bucket !== currentBucket) {
      // Start a new live candle — don't mutate, create fresh
      lc.candle = {
        date: new Date(currentBucket).toISOString(),
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume || 0,
        _bucket: currentBucket,
      };
    } else {
      // Update existing live candle — create a NEW object to avoid stale ref issues
      lc.candle = {
        ...lc.candle,
        close: tick.price,
        high: Math.max(lc.candle.high, tick.price),
        low: Math.min(lc.candle.low, tick.price),
        volume: lc.candle.volume + (tick.lastTradeQty || 0),
      };
    }

    // Build the final candle (strip internal _bucket key)
    const { _bucket, ...liveCandle } = lc.candle;

    // If the live candle bucket is same as last base candle, update it; otherwise append
    if (currentBucket <= lastBaseTime) {
      const updated = [...baseChartCandles];
      const lastCandle = updated[updated.length - 1];
      updated[updated.length - 1] = {
        ...lastCandle,
        close: liveCandle.close,
        high: Math.max(lastCandle.high, liveCandle.high),
        low: Math.min(lastCandle.low, liveCandle.low),
        volume: lastCandle.volume + (tick.lastTradeQty || 0),
        date: lastBase.date,
      };
      return updated;
    }
    return [...baseChartCandles, liveCandle];
  }, [baseChartCandles, ws.liveTick, isLive, selectedSymbol, chartRange]);

  // ── Handlers ──────────────────────────────────────────
  const handleSelectStock = useCallback((symbol) => {
    setSelectedSymbol(symbol);
    setChartRange('1mo');
    // On mobile, go to chart after selection
    if (window.innerWidth < 768) {
      setMobileNavTab('chart');
      setSearchDrawerOpen(false);
    }
  }, []);

  const handleToggleDarkMode = useCallback(() => setDarkMode(prev => !prev), [setDarkMode]);

  // ── Order placed handler: toast + auto-open orders panel ──
  const handleOrderPlaced = useCallback((orderInfo) => {
    const { side, quantity, stockName, price } = orderInfo;
    toast.addToast(
      `${side} order placed: ${quantity} × ${stockName} @ ${price?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`,
      { type: 'success', duration: 4000 }
    );
    // Auto-open the orders panel in sidebar
    setActiveSidebarTab('orders');
    setSidebarOpen(true);
  }, [toast, setActiveSidebarTab, setSidebarOpen]);

  const handleToggleWatchlist = useCallback((symbol) => {
    const name = symbol.replace(/\.(NS|BO)$/, '');
    const isInActive = activeWatchlist.symbols.includes(symbol);

    setWatchlistData(prev => {
      const newLists = prev.lists.map(l => {
        if (l.id === prev.activeId) {
          return {
            ...l,
            symbols: isInActive
              ? l.symbols.filter(s => s !== symbol)
              : [...l.symbols, symbol],
          };
        }
        return l;
      });
      return { ...prev, lists: newLists };
    });

    // Auto-open sidebar watchlist when adding a stock
    if (!isInActive && window.innerWidth >= 768) {
      setActiveSidebarTab('watchlist');
      setSidebarOpen(true);
    }

    // Toast feedback
    if (isInActive) {
      toast.addToast(`${name} removed from ${activeWatchlist.name}`, { type: 'info' });
    } else {
      toast.addToast(`${name} added to ${activeWatchlist.name}`, { type: 'success' });
    }
  }, [setWatchlistData, toast, activeWatchlist, setSidebarOpen, setActiveSidebarTab]);

  const handleRemoveFromWatchlist = useCallback((symbol, listId) => {
    setWatchlistData(prev => {
      const targetId = listId || prev.activeId;
      const newLists = prev.lists.map(l => {
        if (l.id === targetId) {
          return { ...l, symbols: l.symbols.filter(s => s !== symbol) };
        }
        return l;
      });
      return { ...prev, lists: newLists };
    });
  }, [setWatchlistData]);

  const handleAddToWatchlist = useCallback((symbol, listId) => {
    setWatchlistData(prev => {
      const targetId = listId || prev.activeId;
      const newLists = prev.lists.map(l => {
        if (l.id === targetId) {
          if (l.symbols.includes(symbol)) return l;
          return { ...l, symbols: [...l.symbols, symbol] };
        }
        return l;
      });
      return { ...prev, lists: newLists };
    });
    const name = symbol.replace(/\.(NS|BO)$/, '');
    toast.addToast(`${name} added to watchlist`, { type: 'success' });
  }, [setWatchlistData, toast]);

  const handleCreateWatchlist = useCallback((name) => {
    setWatchlistData(prev => {
      const newId = `wl-${prev.nextNum}`;
      const newName = name?.trim() || `Watchlist ${prev.nextNum}`;
      return {
        ...prev,
        lists: [...prev.lists, { id: newId, name: newName, symbols: [] }],
        activeId: newId,
        nextNum: prev.nextNum + 1,
      };
    });
  }, [setWatchlistData]);

  const handleDeleteWatchlist = useCallback((listId) => {
    setWatchlistData(prev => {
      if (prev.lists.length <= 1) return prev;
      const newLists = prev.lists.filter(l => l.id !== listId);
      const newActiveId = prev.activeId === listId ? newLists[0].id : prev.activeId;
      return { ...prev, lists: newLists, activeId: newActiveId };
    });
  }, [setWatchlistData]);

  const handleRenameWatchlist = useCallback((listId, newName) => {
    setWatchlistData(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? { ...l, name: newName.trim() || l.name } : l),
    }));
  }, [setWatchlistData]);

  const handleSetActiveWatchlist = useCallback((listId) => {
    setWatchlistData(prev => ({ ...prev, activeId: listId }));
  }, [setWatchlistData]);

  const handleRangeChange = useCallback((range) => {
    setChartRange(range);
    if (ws.connected && selectedSymbol) ws.requestChart(selectedSymbol, range);
  }, [ws.connected, selectedSymbol]);

  const handleMobileNavChange = useCallback((tab) => {
    setMobileNavTab(tab);
    if (tab === 'orders') setMobileContentTab('depth');
    if (tab === 'more') setMobileContentTab('overview');
  }, []);

  // ── Welcome block (shared) ──────────────────────────────
  const WelcomeBlock = (
    <div className="terminal-welcome">
      <section className="welcome-section">
        <div className="welcome-icon">
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
            <rect width="64" height="64" rx="16" fill="url(#wg)" />
            <defs><linearGradient id="wg" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
            <path d="M12 44 L24 28 L34 35 L52 16" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="52" cy="16" r="4" fill="#00d09c" />
          </svg>
        </div>
        <h2>Welcome to StockPulse Terminal</h2>
        <p>Search or select a stock to begin</p>
        <p className="welcome-subtitle">Popular Stocks</p>
        <div className="popular-stocks">
          {POPULAR_STOCKS.slice(0, isMobile ? 12 : 15).map(stock => (
            <button key={stock.symbol} className="popular-stock-btn" onClick={() => handleSelectStock(stock.symbol)}>
              <span className="psb-symbol">{stock.symbol.replace('.NS', '')}</span>
              <span className="psb-name">{stock.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  // Order markers removed — no indicators on chart after order placement

  // ── Chart block (shared) ─────────────────────────────────
  const ChartBlock = selectedSymbol ? (
    <CustomChart
      candles={chartCandles} chartType="candle" currentPrice={stockData?.price}
      symbol={selectedSymbol} range={chartRange} onRangeChange={handleRangeChange}
      isLive={isLive} onToggleLive={() => setIsLive(prev => !prev)}
      stockName={stockData?.shortName || selectedSymbol?.replace(/\.(NS|BO)$/, '')}
      exchange={stockData?.exchange || 'NSE'}
      dataSource={chartDataSource}
    />
  ) : null;

  // ── WS Status (shared) ──────────────────────────────────
  const WsStatus = (
    <div className={`ws-status ${isMobile ? 'mobile' : ''} ${ws.connected ? 'connected' : 'disconnected'}`}>
      <span className={`ws-dot ${ws.connected ? 'pulsing' : ''}`} />
      {ws.connected ? 'Live' : isMobile ? '...' : 'Connecting...'}
    </div>
  );

  // ═══════════════════════════════════════════════════════
  //  MOBILE LAYOUT  (<768px)
  // ═══════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <ErrorBoundary>
        <div className="app app-mobile">
          <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}
            isMobile={true} onSearchOpen={() => setSearchDrawerOpen(true)}
            livePrices={livePrices} user={user} onLogout={logout} />
          <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />
          <TopIndicesBar onSelectIndex={handleSelectStock} />

          <main className="mobile-main">
            {/* ── Chart Tab ── */}
            {mobileNavTab === 'chart' && (
              <>
                {selectedSymbol ? (
                  <>
                    <MobileStockCard stockData={stockData} symbol={selectedSymbol}
                      isInWatchlist={watchlist.includes(selectedSymbol)}
                      onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                    <div className="mobile-chart-container">
                      {ChartBlock}
                    </div>
                    {/* Floating Buy/Sell buttons — full feature parity */}
                    <div className="mobile-floating-trade">
                      <button className="mobile-trade-btn buy" onClick={() => setOrderDrawerOpen(true)}>
                        BUY
                      </button>
                      <button className="mobile-trade-btn sell" onClick={() => setOrderDrawerOpen(true)}>
                        SELL
                      </button>
                    </div>
                  </>
                ) : WelcomeBlock}
              </>
            )}

            {/* ── Watchlist Tab ── */}
            {mobileNavTab === 'watchlist' && (
              <WatchlistSection
                watchlistData={watchlistData}
                onRemove={handleRemoveFromWatchlist}
                onAdd={handleAddToWatchlist}
                onSelect={handleSelectStock}
                selectedSymbol={selectedSymbol}
                allTicks={ws.allTicks}
                onCreateWatchlist={handleCreateWatchlist}
                onDeleteWatchlist={handleDeleteWatchlist}
                onRenameWatchlist={handleRenameWatchlist}
                onSetActiveWatchlist={handleSetActiveWatchlist}
              />
            )}

            {/* ── Market Overview Tab ── */}
            {mobileNavTab === 'market' && (
              <div className="mobile-section">
                <MarketSummary onSelectIndex={handleSelectStock} compact={false} />
              </div>
            )}

            {/* ── Depth / Trades Tab ── */}
            {mobileNavTab === 'orders' && selectedSymbol && (
              <div className="mobile-section">
                <MobileStockCard stockData={stockData} symbol={selectedSymbol}
                  isInWatchlist={watchlist.includes(selectedSymbol)}
                  onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                <MobileTabs tabs={DEPTH_TRADES_TABS} activeTab={mobileContentTab} onTabChange={setMobileContentTab} />
                <div className="mobile-tab-content">
                  {mobileContentTab === 'depth' && (
                    <OrderBook orderBook={displayOrderBook} currentPrice={stockData?.price} symbol={selectedSymbol} />
                  )}
                  {mobileContentTab === 'trades' && (
                    <TradesTicker newTrades={displayNewTrades} currentPrice={stockData?.price} symbol={selectedSymbol} />
                  )}
                </div>
              </div>
            )}

            {/* ── More — Overview + Fundamentals + Orders + Balance ── */}
            {mobileNavTab === 'more' && selectedSymbol && (
              <div className="mobile-section">
                <MobileStockCard stockData={stockData} symbol={selectedSymbol}
                  isInWatchlist={watchlist.includes(selectedSymbol)}
                  onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                <MobileTabs tabs={INFO_TABS} activeTab={mobileContentTab} onTabChange={setMobileContentTab} />
                <div className="mobile-tab-content">
                  {mobileContentTab === 'overview' && (
                    <LivePriceDisplay key={selectedSymbol} stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                      isInWatchlist={watchlist.includes(selectedSymbol)}
                      onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} compact={true} />
                  )}
                  {mobileContentTab === 'fundamentals' && stockData && (
                    <div className="mobile-fundamentals">
                      <LivePriceDisplay key={`${selectedSymbol}-fund`} stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                        isInWatchlist={watchlist.includes(selectedSymbol)}
                        onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} showOnlyFundamentals={true} />
                    </div>
                  )}
                  {mobileContentTab === 'orders' && (
                    <div className="mobile-orders-section">
                      <OrdersPanel
                        openPositions={trading.openPositions || []}
                        closedPositions={trading.closedPositions || []}
                        openOrders={trading.openOrders || []}
                        executedOrders={trading.executedOrders || []}
                        livePrices={livePrices || {}}
                        onClosePosition={trading.closePosition}
                        onCancelOrder={trading.cancelOrder}
                        balance={trading.balance || 0}
                        realisedPnL={trading.realisedPnL || 0}
                        unrealisedPnL={trading.unrealisedPnL || 0}
                      />
                    </div>
                  )}
                  {mobileContentTab === 'balance' && (
                    <div className="mobile-balance-section">
                      <BalancePanel
                        balance={trading.balance || 0}
                        usedMargin={trading.usedMargin || 0}
                        realisedPnL={trading.realisedPnL || 0}
                        unrealisedPnL={trading.unrealisedPnL || 0}
                        onResetAccount={trading.resetAccount}
                        onAddMoney={trading.addMoney}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Search Drawer */}
          <Drawer open={searchDrawerOpen} onClose={() => setSearchDrawerOpen(false)} position="bottom" title="Search Stocks">
            <div className="drawer-search-content">
              <SearchAutocomplete onSelect={(sym) => { handleSelectStock(sym); setSearchDrawerOpen(false); }} />
              <div className="drawer-popular">
                <p className="drawer-popular-label">Popular</p>
                <div className="drawer-popular-grid">
                  {POPULAR_STOCKS.slice(0, 12).map(stock => (
                    <button key={stock.symbol} className="popular-stock-btn" onClick={() => { handleSelectStock(stock.symbol); setSearchDrawerOpen(false); }}>
                      <span className="psb-symbol">{stock.symbol.replace('.NS', '')}</span>
                      <span className="psb-name">{stock.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Drawer>

          {/* Order Drawer — Buy/Sell panel on mobile */}
          <Drawer open={orderDrawerOpen} onClose={() => setOrderDrawerOpen(false)} position="bottom"
            title={`Trade ${stockData?.shortName || selectedSymbol?.replace(/\.(NS|BO)$/, '') || ''}`}>
            <div className="mobile-order-drawer-content">
              {selectedSymbol && stockData?.price > 0 && (
                <OrderForm
                  symbol={selectedSymbol}
                  currentPrice={stockData.price}
                  onPlaceOrder={trading.placeOrder}
                  onOrderPlaced={(info) => {
                    handleOrderPlaced(info);
                    setOrderDrawerOpen(false);
                  }}
                  stockName={stockData?.shortName}
                />
              )}
            </div>
          </Drawer>

          <BottomNav activeTab={mobileNavTab} onTabChange={handleMobileNavChange} />
          {WsStatus}
        </div>
      </ErrorBoundary>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  TABLET LAYOUT  (768-1023px)
  // ═══════════════════════════════════════════════════════
  if (isTablet) {
    return (
      <ErrorBoundary>
        <div className="app app-tablet terminal-layout">
          <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />
          <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}
            livePrices={livePrices} user={user} onLogout={logout} />

          <div className="layout-wrapper">
            {/* Sidebar overlay on tablet */}
            <Sidebar
              open={sidebarOpen}
              activeTab={activeSidebarTab}
              setActiveTab={setActiveSidebarTab}
              setOpen={setSidebarOpen}
              watchlistData={watchlistData}
              onRemoveFromWatchlist={handleRemoveFromWatchlist}
              onAddToWatchlist={handleAddToWatchlist}
              onSelectStock={handleSelectStock}
              selectedSymbol={selectedSymbol}
              allTicks={ws.allTicks}
              onCreateWatchlist={handleCreateWatchlist}
              onDeleteWatchlist={handleDeleteWatchlist}
              onRenameWatchlist={handleRenameWatchlist}
              onSetActiveWatchlist={handleSetActiveWatchlist}
              orderBook={displayOrderBook}
              currentPrice={stockData?.price}
              symbol={selectedSymbol}
              newTrades={displayNewTrades}
              openPositions={trading.openPositions}
              closedPositions={trading.closedPositions}
              openOrders={trading.openOrders}
              executedOrders={trading.executedOrders}
              livePrices={livePrices}
              onClosePosition={trading.closePosition}
              onCancelOrder={trading.cancelOrder}
              balance={trading.balance}
              usedMargin={trading.usedMargin}
              realisedPnL={trading.realisedPnL}
              unrealisedPnL={trading.unrealisedPnL}
              onResetAccount={trading.resetAccount}
              onAddMoney={trading.addMoney}
            />

            <div className="chart-section">
              {selectedSymbol ? ChartBlock : WelcomeBlock}
            </div>
          </div>

          {/* Tablet bottom panel with Trade tab added */}
          {selectedSymbol && (
            <div className="tablet-bottom-panel">
              <div className="tablet-bottom-tabs">
                <button className={`panel-tab ${activeTab === 'price' ? 'active' : ''}`} onClick={() => setActiveTab('price')}>Price</button>
                <button className={`panel-tab ${activeTab === 'depth' ? 'active' : ''}`} onClick={() => setActiveTab('depth')}>Depth</button>
                <button className={`panel-tab ${activeTab === 'trades' ? 'active' : ''}`} onClick={() => setActiveTab('trades')}>Trades</button>
                <button className={`panel-tab ${activeTab === 'order' ? 'active' : ''}`} onClick={() => setActiveTab('order')}>Trade</button>
                <button className={`panel-tab ${activeTab === 'fundamentals' ? 'active' : ''}`} onClick={() => setActiveTab('fundamentals')}>Fundamentals</button>
              </div>
              <div className="tablet-bottom-content">
                {activeTab === 'price' && (
                  <LivePriceDisplay key={selectedSymbol} stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                    isInWatchlist={watchlist.includes(selectedSymbol)}
                    onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                )}
                {activeTab === 'depth' && <OrderBook orderBook={displayOrderBook} currentPrice={stockData?.price} symbol={selectedSymbol} />}
                {activeTab === 'trades' && <TradesTicker newTrades={displayNewTrades} currentPrice={stockData?.price} symbol={selectedSymbol} />}
                {activeTab === 'order' && stockData?.price > 0 && (
                  <div className="tablet-order-section">
                    <OrderForm
                      symbol={selectedSymbol}
                      currentPrice={stockData.price}
                      onPlaceOrder={trading.placeOrder}
                      onOrderPlaced={handleOrderPlaced}
                      stockName={stockData?.shortName}
                    />
                  </div>
                )}
                {activeTab === 'fundamentals' && stockData && (
                  <LivePriceDisplay key={`${selectedSymbol}-fund`} stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                    isInWatchlist={watchlist.includes(selectedSymbol)}
                    onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} showOnlyFundamentals={true} />
                )}
              </div>
            </div>
          )}

          {WsStatus}
        </div>
      </ErrorBoundary>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  DESKTOP LAYOUT  (1024px+)
  // ═══════════════════════════════════════════════════════
  return (
    <ErrorBoundary>
      <div className="app app-desktop terminal-layout">
        <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />
        <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}
          livePrices={livePrices} user={user} onLogout={logout} />

        <div className="layout-wrapper">
          {/* LEFT — Professional Sidebar */}
          <Sidebar
            open={sidebarOpen}
            activeTab={activeSidebarTab}
            setActiveTab={setActiveSidebarTab}
            setOpen={setSidebarOpen}
            watchlistData={watchlistData}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
            onAddToWatchlist={handleAddToWatchlist}
            onSelectStock={handleSelectStock}
            selectedSymbol={selectedSymbol}
            allTicks={ws.allTicks}
            onCreateWatchlist={handleCreateWatchlist}
            onDeleteWatchlist={handleDeleteWatchlist}
            onRenameWatchlist={handleRenameWatchlist}
            onSetActiveWatchlist={handleSetActiveWatchlist}
            orderBook={displayOrderBook}
            currentPrice={stockData?.price}
            symbol={selectedSymbol}
            newTrades={displayNewTrades}
            openPositions={trading.openPositions}
            closedPositions={trading.closedPositions}
            openOrders={trading.openOrders}
            executedOrders={trading.executedOrders}
            livePrices={livePrices}
            onClosePosition={trading.closePosition}
            onCancelOrder={trading.cancelOrder}
            balance={trading.balance}
            usedMargin={trading.usedMargin}
            realisedPnL={trading.realisedPnL}
            unrealisedPnL={trading.unrealisedPnL}
            onResetAccount={trading.resetAccount}
            onAddMoney={trading.addMoney}
          />

          {/* CENTER — Chart */}
          <div className="chart-section">
            {selectedSymbol ? ChartBlock : WelcomeBlock}
          </div>

          {/* RIGHT — Resizable Stock Info + Trading Panel */}
          <ResizablePanel
            defaultWidth={340}
            minWidth={280}
            maxWidth={520}
            storageKey="sp-right-panel-width"
            className="right-panel-resizable"
          >
            <RightInfoPanel
              key={selectedSymbol}
              stockData={stockData}
              symbol={selectedSymbol}
              liveTick={ws.liveTick}
              isInWatchlist={watchlist.includes(selectedSymbol)}
              onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)}
              loading={loading}
              onPlaceOrder={trading.placeOrder}
              onOrderPlaced={handleOrderPlaced}
              positions={currentSymbolPositions}
              livePrices={livePrices}
              onClosePosition={trading.closePosition}
            />
          </ResizablePanel>
        </div>

        {WsStatus}
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppInner />
              </ProtectedRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
