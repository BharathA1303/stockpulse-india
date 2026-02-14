import { memo } from 'react';

/**
 * MobileTabs — Horizontal scrollable tab bar for mobile.
 * Used for Overview / Depth / Trades / Fundamentals sections.
 */
function MobileTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="mobile-tabs" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`mobile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default memo(MobileTabs);
