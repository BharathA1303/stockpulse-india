import { memo, useState, useCallback } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import Header from '../Header';
import TickerTape from '../TickerTape';
import BottomNav from '../BottomNav';
import Drawer from '../Drawer';
import MobileTabs from '../MobileTabs';
import MobileStockCard from '../MobileStockCard';
import SearchAutocomplete from '../SearchAutocomplete';
import WatchlistSection from '../WatchlistSection';
import MarketSummary from '../MarketSummary';
import LivePriceDisplay from '../LivePriceDisplay';
import OrderBook from '../OrderBook';
import TradesTicker from '../TradesTicker';
import OrderForm from '../trading/OrderForm';
import BalancePanel from '../panels/BalancePanel';
import OrdersPanel from '../panels/OrdersPanel';
import { POPULAR_STOCKS } from '../../constants/stockSymbols';

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
 * LayoutMobile — Full-featured mobile layout with 100% feature parity.
 * Vertical stack + bottom nav + floating buy/sell + drawers.
 */
function LayoutMobile({
  handleSelectStock,
  darkMode,
  handleToggleDarkMode,
  livePrices,
  ws,
  watchlistData,
  handleRemoveFromWatchlist,
  handleAddToWatchlist,
  selectedSymbol,
  handleCreateWatchlist,
  handleDeleteWatchlist,
  handleRenameWatchlist,
  handleSetActiveWatchlist,
  displayOrderBook,
  stockData,
  displayNewTrades,
  trading,
  ChartBlock,
  WelcomeBlock,
  watchlist,
  handleToggleWatchlist,
  WsStatus,
  user,
  logout,
  handleOrderPlaced,
  loading,
}) {
  const [mobileNavTab, setMobileNavTab] = useState('chart');
  const [mobileContentTab, setMobileContentTab] = useState('overview');
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);

  const handleMobileNavChange = useCallback((tab) => {
    setMobileNavTab(tab);
    if (tab === 'orders') setMobileContentTab('depth');
    if (tab === 'more') setMobileContentTab('overview');
  }, []);

  return (
    <ErrorBoundary>
      <div className="app app-mobile">
        <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}
          isMobile={true} onSearchOpen={() => setSearchDrawerOpen(true)}
          livePrices={livePrices} user={user} onLogout={logout} />
        <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />

        <main className="mobile-main">
          {/* ── Chart Tab ── */}
          {mobileNavTab === 'chart' && (
            <>
              {selectedSymbol ? (
                <div className="mobile-chart-view">
                  <div className="mobile-chart-top-bar">
                    <MobileStockCard stockData={stockData} symbol={selectedSymbol}
                      isInWatchlist={watchlist.includes(selectedSymbol)}
                      onToggleWatchlist={() => handleToggleWatchlist(selectedSymbol)} />
                    {/* Compact inline Buy/Sell */}
                    <div className="mobile-compact-trade">
                      <button className="mobile-compact-btn buy" onClick={() => setOrderDrawerOpen(true)}>BUY</button>
                      <button className="mobile-compact-btn sell" onClick={() => setOrderDrawerOpen(true)}>SELL</button>
                    </div>
                  </div>
                  <div className="mobile-chart-container">
                    {ChartBlock}
                  </div>
                </div>
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

        {/* ── Search Drawer ── */}
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

        {/* ── Order Drawer (Buy/Sell) ── */}
        <Drawer open={orderDrawerOpen} onClose={() => setOrderDrawerOpen(false)} position="bottom" title={`Trade ${stockData?.shortName || selectedSymbol?.replace(/\.(NS|BO)$/, '') || ''}`}>
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

export default memo(LayoutMobile);
