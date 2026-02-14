import { useEffect, useRef, useCallback, memo } from 'react';

/**
 * Drawer — Slide-in panel from left/right/bottom.
 * Used for mobile watchlist, filters, etc.
 * Touch-friendly with backdrop and swipe-to-close.
 */
function Drawer({ open, onClose, position = 'left', title, children }) {
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);
  const startYRef = useRef(0);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Swipe to close (bottom drawer)
  const handleTouchStart = useCallback((e) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (position === 'bottom') {
      const endY = e.changedTouches[0].clientY;
      if (endY - startYRef.current > 80) onClose();
    }
  }, [position, onClose]);

  return (
    <div className={`drawer-overlay ${open ? 'open' : ''}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        ref={backdropRef}
        onClick={onClose}
        aria-label="Close drawer"
      />

      {/* Drawer panel */}
      <div
        className={`drawer-panel drawer-${position}`}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar for bottom drawer */}
        {position === 'bottom' && (
          <div className="drawer-handle-bar">
            <div className="drawer-handle" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="drawer-header">
            <h3 className="drawer-title">{title}</h3>
            <button className="drawer-close" onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default memo(Drawer);
