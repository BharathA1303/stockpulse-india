import { memo } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import Header from '../Header';
import TickerTape from '../TickerTape';
import Sidebar from '../Sidebar';
import RightInfoPanel from '../RightInfoPanel';
import ResizablePanel from '../ResizablePanel';

/**
 * LayoutDesktop — 3-column trading terminal for >= 1024px.
 * | Sidebar | Chart | Right Info Panel |
 */
function LayoutDesktop({
  // Header
  handleSelectStock,
  darkMode,
  handleToggleDarkMode,
  livePrices,
  // Ticker
  ws,
  // Sidebar
  sidebarOpen,
  activeSidebarTab,
  setActiveSidebarTab,
  setSidebarOpen,
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
  // Chart
  ChartBlock,
  WelcomeBlock,
  // Right panel
  watchlist,
  handleToggleWatchlist,
  loading,
  handleOrderPlaced,
  currentSymbolPositions,
  // WS Status
  WsStatus,
  // Auth
  user,
  logout,
}) {
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

export default memo(LayoutDesktop);
