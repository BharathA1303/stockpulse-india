import { memo, useState } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import Header from '../Header';
import TickerTape from '../TickerTape';
import Sidebar from '../Sidebar';
import LivePriceDisplay from '../LivePriceDisplay';
import OrderBook from '../OrderBook';
import TradesTicker from '../TradesTicker';
import OrderForm from '../trading/OrderForm';

/**
 * LayoutTablet — 2-column adaptive for 768-1023px.
 * Chart + collapsible sidebar + bottom panel with tabs.
 */
function LayoutTablet({
  handleSelectStock,
  darkMode,
  handleToggleDarkMode,
  livePrices,
  ws,
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
  ChartBlock,
  WelcomeBlock,
  watchlist,
  handleToggleWatchlist,
  WsStatus,
  user,
  logout,
  handleOrderPlaced,
}) {
  const [activeTab, setActiveTab] = useState('price');

  return (
    <ErrorBoundary>
      <div className="app app-tablet terminal-layout">
        <TickerTape allTicks={ws.allTicks} connected={ws.connected} requestAllQuotes={ws.requestAllQuotes} onSelectStock={handleSelectStock} />
        <Header onSelectStock={handleSelectStock} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}
          livePrices={livePrices} user={user} onLogout={logout} />

        <div className="layout-wrapper">
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

        {/* Tablet bottom panel */}
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

export default memo(LayoutTablet);
