import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import TickerTape from './components/TickerTape';
import MarketSummary from './components/MarketSummary';
import LivePriceDisplay from './components/LivePriceDisplay';
import CustomChart from './components/CustomChart';
import OrderBook from './components/OrderBook';
import TradesTicker from './components/TradesTicker';
import Watchlist from './components/Watchlist';
import WatchlistSection from './components/WatchlistSection';
import SearchAutocomplete from './components/SearchAutocomplete';
import BottomNav from './components/BottomNav';
import Drawer from './components/Drawer';
import MobileTabs from './components/MobileTabs';
import MobileStockCard from './components/MobileStockCard';
import { ToastProvider, useToast } from './components/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import { useStockData, useChartData } from './hooks/useStockData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useBreakpoint } from './hooks/useBreakpoint';
import { POPULAR_STOCKS } from './constants/stockSymbols';

const DEPTH_TRADES_TABS = [
  { id: 'depth', label: 'Depth' },
  { id: 'trades', label: 'Trades' },
];

const INFO_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'fundamentals', label: 'Fundamentals' },
];

/**
 * Root application — Responsive trading terminal.
 * Mobile (<768): Stacked layout + bottom nav + drawers
 * Tablet (768-1023): Collapsible sidebar + chart + bottom panel
 * Desktop (1024+): 3-column terminal layout
 */
function AppInner() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const toast = useToast();

  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS');
  const [watchlist, setWatchlist] = useLocalStorage('sp-watchlist', []);
  const [darkMode, setDarkMode] = useLocalStorage('sp-dark-mode', true);
  const [activeTab, setActiveTab] = useState('depth');
  const [chartRange, setChartRange] = useState('1mo');
  const [isLive, setIsLive] = useState(true);

  // Desktop sidebar
  const [sidebarOpen, setSidebarOpen] = useLocalStorage('sp-sidebar-open', true);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [rightDividerDragging, setRightDividerDragging] = useState(false);
  const [rightTopRatio, setRightTopRatio] = useState(0.45);
  const rightSidebarRef = useRef(null);

  // Mobile state
  const [mobileNavTab, setMobileNavTab] = useState('chart');
  const [mobileContentTab, setMobileContentTab] = useState('overview');
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);

  const ws = useWebSocket();
  const { data: restStockData, loading } = useStockData(selectedSymbol);
  const { data: restChartData } = useChartData(selectedSymbol, chartRange);

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

  // Sidebar resize (desktop only)
  useEffect(() => {
    if (!isResizing || isMobile) return;
    const onMove = (e) => setSidebarWidth(Math.max(180, Math.min(380, e.clientX)));
    const onUp = () => { setIsResizing(false); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isResizing, isMobile]);

  // Right panel divider resize (desktop only)
  useEffect(() => {
    if (!rightDividerDragging || isMobile) return;
    const onMove = (e) => {
      const sidebar = rightSidebarRef.current;
      if (!sidebar) return;
      const rect = sidebar.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = Math.max(0.08, Math.min(0.92, y / rect.height));
      setRightTopRatio(ratio);
    };
    const onUp = () => { setRightDividerDragging(false); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [rightDividerDragging, isMobile]);

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

  // Accumulate live ticks into chart candles
  const liveCandleRef = useRef({ candle: null, baseLen: 0 });

  const chartCandles = useMemo(() => {
    if (!isLive || !ws.liveTick || ws.liveTick.symbol !== selectedSymbol || baseChartCandles.length === 0) {
      liveCandleRef.current = { candle: null, baseLen: baseChartCandles.length };
      return baseChartCandles;
    }

    const tick = ws.liveTick;
    const lc = liveCandleRef.current;

    // Reset live candle tracking when base data changes
    if (lc.baseLen !== baseChartCandles.length) {
      lc.candle = null;
      lc.baseLen = baseChartCandles.length;
    }

    const now = new Date();
    // Determine candle interval based on chart range
    const intervalMs = chartRange === '1m' ? 60000 : chartRange === '5m' ? 300000 :
      chartRange === '1d' ? 300000 : chartRange === '1w' ? 900000 : 86400000;

    const lastBase = baseChartCandles[baseChartCandles.length - 1];
    const lastBaseTime = new Date(lastBase.date).getTime();
    const currentBucket = Math.floor(now.getTime() / intervalMs) * intervalMs;

    if (!lc.candle || lc.candle._bucket !== currentBucket) {
      // Start a new live candle
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
      // Update existing live candle
      lc.candle.close = tick.price;
      lc.candle.high = Math.max(lc.candle.high, tick.price);
      lc.candle.low = Math.min(lc.candle.low, tick.price);
      lc.candle.volume += (tick.lastTradeQty || 0);
    }

    // If the live candle bucket is same as last base candle, update it; otherwise append
    if (currentBucket <= lastBaseTime) {
      const updated = [...baseChartCandles];
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...lc.candle, date: lastBase.date };
      return updated;
    }
    return [...baseChartCandles, { ...lc.candle }];
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

  const handleToggleWatchlist = useCallback((symbol) => {
    const name = symbol.replace(/\.(NS|BO)$/, '');
    setWatchlist(prev => {
      const exists = prev.includes(symbol);
      if (!exists && window.innerWidth >= 1024) setSidebarOpen(true);
      return exists ? prev.filter(s => s !== symbol) : [...prev, symbol];
    });
    // Toast OUTSIDE the state updater to avoid double-fire in StrictMode
    const isCurrentlyInWatchlist = watchlist.includes(symbol);
    if (isCurrentlyInWatchlist) {
      toast.addToast(`${name} removed from Watchlist`, { type: 'info' });
    } else {
      toast.addToast(`${name} added to Watchlist`, { type: 'success' });
    }
  }, [setWatchlist, setSidebarOpen, toast, watchlist]);

  const handleRemoveFromWatchlist = useCallback((symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  }, [setWatchlist]);

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

  // ── Chart block (shared) ─────────────────────────────────
  const ChartBlock = selectedSymbol ? (
    <CustomChart
      candles={chartCandles} chartType="candle" currentPrice={stockData?.price}
      symbol={selectedSymbol} range={chartRange} onRangeChange={handleRangeChange}
      isLive={isLive} onToggleLive={() => setIsLive(prev => !prev)}
      stockName={stockData?.shortName || selectedSymbol?.replace(/\.(NS|BO)$/, '')}
      exchange={stockData?.exchange || 'NSE'}
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
            isMobile={true} onSearchOpen={() => setSearchDrawerOpen(true)} />
          <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />

          <main className="mobile-main">
            {/* ── Chart — TradingView mobile style: ONLY stock header + chart ── */}
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
                  </>
                ) : WelcomeBlock}
              </>
            )}

            {/* ── Watchlist — FULL SCREEN SECTION, NOT popup/drawer ── */}
            {mobileNavTab === 'watchlist' && (
              <WatchlistSection
                watchlist={watchlist}
                onRemove={handleRemoveFromWatchlist}
                onSelect={handleSelectStock}
                selectedSymbol={selectedSymbol}
                allTicks={ws.allTicks}
              />
            )}

            {/* ── Market Overview ── */}
            {mobileNavTab === 'market' && (
              <div className="mobile-section">
                <MarketSummary onSelectIndex={handleSelectStock} compact={false} />
              </div>
            )}

            {/* ── Depth / Trades — isolated section ── */}
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

            {/* ── More — Overview + Fundamentals ── */}
            {mobileNavTab === 'more' && selectedSymbol && (
              <div className="mobile-section">
                <MobileStockCard stockData={stockData} symbol={selectedSymbol}
                  isInWatchlist={watchlist.includes(selectedSymbol)}
                  onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                <MobileTabs tabs={INFO_TABS} activeTab={mobileContentTab} onTabChange={setMobileContentTab} />
                <div className="mobile-tab-content">
                  {mobileContentTab === 'overview' && (
                    <LivePriceDisplay stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                      isInWatchlist={watchlist.includes(selectedSymbol)}
                      onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} compact={true} />
                  )}
                  {mobileContentTab === 'fundamentals' && stockData && (
                    <div className="mobile-fundamentals">
                      <LivePriceDisplay stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                        isInWatchlist={watchlist.includes(selectedSymbol)}
                        onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} showOnlyFundamentals={true} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

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
        <div className="app app-tablet">
          <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />
          <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />
          <MarketSummary onSelectIndex={handleSelectStock} compact />

          <div className="tablet-body">
            <aside className={`tablet-sidebar-left ${sidebarOpen ? 'open' : 'collapsed'}`}>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(prev => !prev)}
                aria-label={sidebarOpen ? 'Hide watchlist' : 'Show watchlist'}>
                {sidebarOpen ? '◂' : '▸'}
              </button>
              {sidebarOpen && (
                <Watchlist watchlist={watchlist} onRemove={handleRemoveFromWatchlist}
                  onSelect={handleSelectStock} selectedSymbol={selectedSymbol} allTicks={ws.allTicks} />
              )}
            </aside>

            <div className="tablet-center">
              {selectedSymbol ? ChartBlock : WelcomeBlock}
            </div>
          </div>

          {selectedSymbol && (
            <div className="tablet-bottom-panel">
              <div className="tablet-bottom-tabs">
                <button className={`panel-tab ${activeTab === 'price' ? 'active' : ''}`} onClick={() => setActiveTab('price')}>Price</button>
                <button className={`panel-tab ${activeTab === 'depth' ? 'active' : ''}`} onClick={() => setActiveTab('depth')}>Depth</button>
                <button className={`panel-tab ${activeTab === 'trades' ? 'active' : ''}`} onClick={() => setActiveTab('trades')}>Trades</button>
              </div>
              <div className="tablet-bottom-content">
                {activeTab === 'price' && (
                  <LivePriceDisplay stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                    isInWatchlist={watchlist.includes(selectedSymbol)}
                    onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                )}
                {activeTab === 'depth' && <OrderBook orderBook={displayOrderBook} currentPrice={stockData?.price} symbol={selectedSymbol} />}
                {activeTab === 'trades' && <TradesTicker newTrades={displayNewTrades} currentPrice={stockData?.price} symbol={selectedSymbol} />}
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
        <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />
        <MarketSummary onSelectIndex={handleSelectStock} compact />

        <div className="terminal-body">
          {/* LEFT — Watchlist */}
          <aside
            className={`terminal-sidebar-left ${sidebarOpen ? 'open' : 'collapsed'}`}
            style={sidebarOpen ? { width: sidebarWidth + 'px', minWidth: sidebarWidth + 'px' } : undefined}
          >
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(prev => !prev)}
              aria-label={sidebarOpen ? 'Hide watchlist' : 'Show watchlist'}
              title={sidebarOpen ? 'Hide watchlist' : 'Show watchlist'}>
              {sidebarOpen ? '◂' : '▸'}
            </button>
            {!sidebarOpen && <span className="sidebar-collapsed-label">WATCHLIST</span>}
            {sidebarOpen && (
              <Watchlist watchlist={watchlist} onRemove={handleRemoveFromWatchlist}
                onSelect={handleSelectStock} selectedSymbol={selectedSymbol} allTicks={ws.allTicks} />
            )}
            {sidebarOpen && (
              <div className="sidebar-resize-handle" onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} />
            )}
          </aside>

          {/* CENTER */}
          <div className="terminal-center">
            {selectedSymbol ? ChartBlock : WelcomeBlock}
          </div>

          {/* RIGHT — Price + Depth/Trades */}
          {selectedSymbol && (
            <aside className="terminal-sidebar-right" ref={rightSidebarRef}>
              <div className="right-panel-price" style={{ flex: `0 0 ${rightTopRatio * 100}%` }}>
                {loading && !stockData ? (
                  <div className="stock-card skeleton" aria-busy="true">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-price" />
                    <div className="skeleton-line skeleton-meta" />
                  </div>
                ) : (
                  <LivePriceDisplay stockData={stockData} symbol={selectedSymbol} liveTick={ws.liveTick}
                    isInWatchlist={watchlist.includes(selectedSymbol)}
                    onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                )}
              </div>

              <div className="right-panel-divider" onMouseDown={(e) => { e.preventDefault(); setRightDividerDragging(true); }}>
                <div className="right-panel-divider-line" />
              </div>

              <div className="right-panel-bottom" style={{ flex: `0 0 ${(1 - rightTopRatio) * 100}%` }}>
                <div className="bottom-panel-tabs">
                  <button className={`panel-tab ${activeTab === 'depth' ? 'active' : ''}`} onClick={() => setActiveTab('depth')}>Depth</button>
                  <button className={`panel-tab ${activeTab === 'trades' ? 'active' : ''}`} onClick={() => setActiveTab('trades')}>Trades</button>
                </div>
                <div className="bottom-panel-content">
                  {activeTab === 'depth' && <OrderBook orderBook={displayOrderBook} currentPrice={stockData?.price} symbol={selectedSymbol} />}
                  {activeTab === 'trades' && <TradesTicker newTrades={displayNewTrades} currentPrice={stockData?.price} symbol={selectedSymbol} />}
                </div>
              </div>
            </aside>
          )}
        </div>

        {WsStatus}
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
