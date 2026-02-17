import { memo, useCallback } from 'react';
import WatchlistPanel from './panels/WatchlistPanel';
import DepthPanel from './panels/DepthPanel';
import TradesPanel from './panels/TradesPanel';
import OrdersPanel from './panels/OrdersPanel';
import BalancePanel from './panels/BalancePanel';

/**
 * Sidebar — Slim professional sidebar with icon rail + drawer panels.
 * Inspired by Groww Terminal's left sidebar.
 *
 * Tabs: watchlist, depth, trades, orders
 */

const SIDEBAR_TABS = [
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: 'depth',
    label: 'Depth',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <polyline points="8 7 12 3 16 7" />
        <polyline points="8 17 12 21 16 17" />
      </svg>
    ),
  },
  {
    id: 'trades',
    label: 'Trades',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'balance',
    label: 'Balance',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="16" cy="15" r="2" />
      </svg>
    ),
  },
];

function Sidebar({
  open,
  activeTab,
  setActiveTab,
  setOpen,
  // Multi-watchlist props
  watchlistData,
  onRemoveFromWatchlist,
  onAddToWatchlist,
  onSelectStock,
  selectedSymbol,
  allTicks,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
  onSetActiveWatchlist,
  // Depth props
  orderBook,
  currentPrice,
  symbol,
  // Trades props
  newTrades,
  // Orders/Trading props
  openPositions,
  closedPositions,
  openOrders,
  executedOrders,
  livePrices,
  onClosePosition,
  onCancelOrder,
  balance,
  usedMargin,
  realisedPnL,
  unrealisedPnL,
  onResetAccount,
  onAddMoney,
}) {
  const handleTabClick = useCallback((tabId) => {
    if (activeTab === tabId && open) {
      setOpen(false);
      setActiveTab(null);
    } else {
      setActiveTab(tabId);
      setOpen(true);
    }
  }, [activeTab, open, setActiveTab, setOpen]);

  const renderDrawerContent = () => {
    switch (activeTab) {
      case 'watchlist':
        return (
          <WatchlistPanel
            watchlistData={watchlistData}
            onRemove={onRemoveFromWatchlist}
            onAdd={onAddToWatchlist}
            onSelect={onSelectStock}
            selectedSymbol={selectedSymbol}
            allTicks={allTicks}
            onCreateWatchlist={onCreateWatchlist}
            onDeleteWatchlist={onDeleteWatchlist}
            onRenameWatchlist={onRenameWatchlist}
            onSetActiveWatchlist={onSetActiveWatchlist}
          />
        );
      case 'depth':
        return (
          <DepthPanel
            orderBook={orderBook}
            currentPrice={currentPrice}
            symbol={symbol}
          />
        );
      case 'trades':
        return (
          <TradesPanel
            newTrades={newTrades}
            currentPrice={currentPrice}
            symbol={symbol}
          />
        );
      case 'orders':
        return (
          <OrdersPanel
            openPositions={openPositions || []}
            closedPositions={closedPositions || []}
            openOrders={openOrders || []}
            executedOrders={executedOrders || []}
            livePrices={livePrices || {}}
            onClosePosition={onClosePosition}
            onCancelOrder={onCancelOrder}
            balance={balance || 0}
            realisedPnL={realisedPnL || 0}
            unrealisedPnL={unrealisedPnL || 0}
          />
        );
      case 'balance':
        return (
          <BalancePanel
            balance={balance || 0}
            usedMargin={usedMargin || 0}
            realisedPnL={realisedPnL || 0}
            unrealisedPnL={unrealisedPnL || 0}
            onResetAccount={onResetAccount}
            onAddMoney={onAddMoney}
          />
        );
      default:
        return null;
    }
  };

  return (
    <aside className={`pro-sidebar ${open ? 'expanded' : 'collapsed'}`}>
      {/* Icon Rail */}
      <div className="sidebar-icon-rail">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-icon-btn ${activeTab === tab.id && open ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            title={tab.label}
            aria-label={tab.label}
          >
            <span className="sidebar-icon">{tab.icon}</span>
            <span className="sidebar-icon-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Drawer Content */}
      <div className="sidebar-drawer">
        {open && activeTab && (
          <div className="sidebar-drawer-inner">
            <div className="sidebar-drawer-header">
              <h3 className="sidebar-drawer-title">
                {SIDEBAR_TABS.find(t => t.id === activeTab)?.label || ''}
              </h3>
              <button
                className="sidebar-drawer-close"
                onClick={() => { setOpen(false); setActiveTab(null); }}
                aria-label="Close panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="sidebar-drawer-content">
              {renderDrawerContent()}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default memo(Sidebar);
