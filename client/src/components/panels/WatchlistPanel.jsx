import { memo } from 'react';
import Watchlist from '../Watchlist';

/**
 * WatchlistPanel — Sidebar drawer content for multi-watchlist.
 * Wraps the Watchlist component for use inside the Sidebar system.
 */
function WatchlistPanel({
  watchlistData,
  onRemove,
  onAdd,
  onSelect,
  selectedSymbol,
  allTicks,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
  onSetActiveWatchlist,
}) {
  return (
    <div className="sidebar-panel watchlist-panel">
      <Watchlist
        watchlistData={watchlistData}
        onRemove={onRemove}
        onAdd={onAdd}
        onSelect={onSelect}
        selectedSymbol={selectedSymbol}
        allTicks={allTicks}
        onCreateWatchlist={onCreateWatchlist}
        onDeleteWatchlist={onDeleteWatchlist}
        onRenameWatchlist={onRenameWatchlist}
        onSetActiveWatchlist={onSetActiveWatchlist}
      />
    </div>
  );
}

export default memo(WatchlistPanel);
