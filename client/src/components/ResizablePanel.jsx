import { useRef, useCallback, useEffect, useState, memo } from 'react';

/**
 * ResizablePanel — Wrapper for a panel with a left-edge drag handle.
 * Used to make the right info panel resizable.
 *
 * Props:
 *   children     — Panel content
 *   defaultWidth — Default width in px (340)
 *   minWidth     — Min width in px (280)
 *   maxWidth     — Max width in px (520)
 *   storageKey   — localStorage key for persisting width
 *   className    — Additional class names
 *   side         — 'left' | 'right' (which side has the handle)
 */
function ResizablePanel({
  children,
  defaultWidth = 340,
  minWidth = 280,
  maxWidth = 520,
  storageKey = 'sp-panel-width',
  className = '',
  side = 'left',
}) {
  const [width, setWidth] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const val = parseInt(stored, 10);
        if (val >= minWidth && val <= maxWidth) return val;
      }
    } catch { /* ignore */ }
    return defaultWidth;
  });

  const panelRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Save width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(width));
    } catch { /* ignore */ }
  }, [width, storageKey]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;

      let delta;
      if (side === 'left') {
        // Panel is on the right, dragging left edge: moving left = wider
        delta = startX.current - e.clientX;
      } else {
        delta = e.clientX - startX.current;
      }

      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [maxWidth, minWidth, side]);

  return (
    <div
      ref={panelRef}
      className={`resizable-panel ${className}`}
      style={{ width: `${width}px`, minWidth: `${minWidth}px`, maxWidth: `${maxWidth}px` }}
    >
      {/* Drag Handle */}
      <div
        className={`resize-handle resize-handle-${side}`}
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      >
        <div className="resize-handle-bar" />
      </div>
      {children}
    </div>
  );
}

export default memo(ResizablePanel);
