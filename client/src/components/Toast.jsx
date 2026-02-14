import { createContext, useContext, useState, useCallback, useRef, memo } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const recentRef = useRef(new Map());  // dedup: message -> timestamp

  const addToast = useCallback((message, { type = 'success', duration = 2500 } = {}) => {
    // Deduplicate: skip if same message was shown within 500ms
    const now = Date.now();
    const lastShown = recentRef.current.get(message);
    if (lastShown && now - lastShown < 500) return null;
    recentRef.current.set(message, now);
    // Clean old entries
    if (recentRef.current.size > 20) {
      for (const [k, v] of recentRef.current) {
        if (now - v > 5000) recentRef.current.delete(k);
      }
    }

    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    timersRef.current[id] = setTimeout(() => {
      // Start exit animation
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      // Remove after animation
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        delete timersRef.current[id];
      }, 300);
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

const ToastContainer = memo(function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
          onClick={() => onDismiss(toast.id)}
          role="alert"
        >
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
});
