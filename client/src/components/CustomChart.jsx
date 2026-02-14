import { useEffect, useRef, useState, useCallback, memo } from 'react';

/**
 * Custom Canvas-based Candlestick / Line chart — zero dependencies.
 *
 * Features:
 *  - Theme-aware (dark/light) canvas rendering
 *  - Candlestick + Line chart modes
 *  - Volume histogram at bottom
 *  - Crosshair with OHLCV tooltip (DOM-ref, no React re-render)
 *  - Smooth mouse wheel zoom (passive:false)
 *  - Drag to pan (grab cursor)
 *  - Touch: pinch zoom, drag pan
 *  - Current price dashed line
 *  - Responsive via ResizeObserver
 *  - HiDPI / Retina support
 */

const DARK = {
  bg: '#0f1118', grid: 'rgba(42,46,57,0.35)', text: '#6b7280', textBright: '#c8ccd4',
  upBody: '#0ecb81', downBody: '#f6465d', upWick: '#0ecb81', downWick: '#f6465d',
  upVolume: 'rgba(14,203,129,0.22)', downVolume: 'rgba(246,70,93,0.22)',
  crosshair: 'rgba(99,102,241,0.55)', crossLabel: '#6366f1', priceLine: '#6366f1',
  lineChart: '#6366f1', lineGrad1: 'rgba(99,102,241,0.18)', lineGrad2: 'rgba(99,102,241,0.01)',
};
const LIGHT = {
  bg: '#ffffff', grid: 'rgba(200,204,212,0.4)', text: '#6b7280', textBright: '#1e2329',
  upBody: '#0ecb81', downBody: '#f6465d', upWick: '#0ecb81', downWick: '#f6465d',
  upVolume: 'rgba(14,203,129,0.18)', downVolume: 'rgba(246,70,93,0.18)',
  crosshair: 'rgba(99,102,241,0.50)', crossLabel: '#6366f1', priceLine: '#6366f1',
  lineChart: '#6366f1', lineGrad1: 'rgba(99,102,241,0.12)', lineGrad2: 'rgba(99,102,241,0.01)',
};

const PAD = { top: 16, right: 70, bottom: 30, left: 8 };
const VOL_RATIO = 0.18;
const MIN_CW = 3;
const MAX_CW = 28;

const TIME_RANGES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '1Y', value: '1y' },
];

// ── Component ────────────────────────────────────────────────
function CustomChartInner({
  candles = [], chartType = 'candle', currentPrice, symbol,
  range, onRangeChange, isLive, onToggleLive, stockName, exchange,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);
  const chartTypeRef = useRef(chartType);
  const S = useRef({
    candles: [], visibleStart: 0, visibleEnd: 0,
    crosshairX: -1, crosshairY: -1,
    isDragging: false, dragStartX: 0, dragVisibleStart: 0,
    width: 800, height: 400, dpr: 1, lastTouchDist: 0,
    currentPrice: null,
  });

  const [internalChartType, setInternalChartType] = useState(chartType);
  const [cursorStyle, setCursorStyle] = useState('crosshair');
  useEffect(() => { setInternalChartType(chartType); }, [chartType]);
  useEffect(() => { chartTypeRef.current = internalChartType; }, [internalChartType]);

  // ── Update candle data — only reset viewport on full data change, not live updates ───
  const prevCandleLenRef = useRef(0);
  useEffect(() => {
    const s = S.current;
    const prevLen = prevCandleLenRef.current;
    s.candles = candles;
    if (candles.length > 0) {
      // Only reset viewport when data fundamentally changes (e.g. range switch, symbol change)
      // NOT when a single candle is appended/updated from live feed
      const isLiveUpdate = candles.length >= prevLen && candles.length <= prevLen + 1 && prevLen > 0;
      if (!isLiveUpdate) {
        const visible = Math.min(candles.length, Math.max(20, Math.floor(s.width / 10)));
        s.visibleStart = Math.max(0, candles.length - visible);
        s.visibleEnd = candles.length;
      } else {
        // For live updates, just extend the visible end if already at the edge
        if (s.visibleEnd >= prevLen) {
          s.visibleEnd = candles.length;
        }
      }
    }
    prevCandleLenRef.current = candles.length;
    scheduleDraw();
  }, [candles]);

  // ── Update current price via ref (no re-render, just redraw) ───
  useEffect(() => {
    S.current.currentPrice = currentPrice;
    scheduleDraw();
  }, [currentPrice]);

  // ── Canvas + resize observer ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resize = () => {
      const r = container.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const s = S.current;
      s.dpr = window.devicePixelRatio || 1;
      s.width = r.width; s.height = r.height;
      const cv = canvasRef.current;
      if (cv) { cv.width = r.width * s.dpr; cv.height = r.height * s.dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
      scheduleDraw();
    };
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    resize();
    return () => obs.disconnect();
  }, []);

  // ── Wheel zoom — native passive:false ───
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (e) => {
      e.preventDefault(); e.stopPropagation();
      const s = S.current;
      if (s.candles.length === 0) return;
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const cL = PAD.left, cR = s.width - PAD.right;
      const ratio = Math.max(0, Math.min(1, (mx - cL) / (cR - cL)));
      const rng = s.visibleEnd - s.visibleStart;
      const fac = e.deltaY > 0 ? 1.12 : 0.88;
      const newRange = Math.max(8, Math.min(s.candles.length, Math.round(rng * fac)));
      const delta = newRange - rng;
      s.visibleStart = Math.max(0, s.visibleStart - Math.round(delta * ratio));
      s.visibleEnd = Math.min(s.candles.length, s.visibleEnd + (delta - Math.round(delta * ratio)));
      if (s.visibleEnd - s.visibleStart < 8) s.visibleStart = Math.max(0, s.visibleEnd - 8);
      scheduleDraw();
    };
    cv.addEventListener('wheel', onWheel, { passive: false });
    return () => cv.removeEventListener('wheel', onWheel);
  }, []);

  // Redraw on chart type change
  useEffect(() => { scheduleDraw(); }, [internalChartType]);

  // Theme observer
  useEffect(() => {
    const obs = new MutationObserver(() => scheduleDraw());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  function scheduleDraw() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawChart);
  }

  function getColors() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT : DARK;
  }

  // ─────────────────── TOOLTIP DOM UPDATE (no React re-render) ───
  function updateTooltip(cd) {
    const el = tooltipRef.current;
    if (!el) return;
    if (!cd) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const upCls = cd.close >= cd.open ? 'up' : 'down';
    el.innerHTML =
      `<span class="ohlcv-date">${cd.dateStr}</span>` +
      `<span>O <b class="${upCls}">${fmtPrice(cd.open)}</b></span>` +
      `<span>H <b class="up">${fmtPrice(cd.high)}</b></span>` +
      `<span>L <b class="down">${fmtPrice(cd.low)}</b></span>` +
      `<span>C <b class="${upCls}">${fmtPrice(cd.close)}</b></span>` +
      `<span>V <b>${(cd.volume || 0).toLocaleString('en-IN')}</b></span>`;
  }

  // ──────────────────────── DRAWING ──────────────────────────────
  function drawChart() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const s = S.current;
    const { width: W, height: H, dpr } = s;
    const cType = chartTypeRef.current;
    const C = getColors();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const data = s.candles;
    if (!data || data.length === 0) {
      ctx.fillStyle = C.text; ctx.font = '13px "Inter",sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('No chart data available', W / 2, H / 2);
      updateTooltip(null); return;
    }

    s.visibleStart = Math.max(0, s.visibleStart);
    s.visibleEnd = Math.min(data.length, s.visibleEnd);
    if (s.visibleEnd <= s.visibleStart) { s.visibleStart = 0; s.visibleEnd = data.length; }

    const slice = data.slice(s.visibleStart, s.visibleEnd);
    if (slice.length === 0) return;

    const cL = PAD.left, cR = W - PAD.right, cT = PAD.top, cB = H - PAD.bottom;
    const cW = cR - cL;
    const volTop = cB - (cB - cT) * VOL_RATIO;

    // Price range
    let pMin = Infinity, pMax = -Infinity, vMax = 0;
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      let lo = Math.min(c.open, c.close, c.low);
      let hi = Math.max(c.open, c.close, c.high);
      if (lo < pMin) pMin = lo;
      if (hi > pMax) pMax = hi;
      if (c.volume > vMax) vMax = c.volume;
    }
    const pSpan = pMax - pMin;
    const pad = pSpan > 0 ? pSpan * 0.08 : (pMax * 0.02 || 10);
    pMin = Math.max(0, pMin - pad); pMax += pad;

    const xIdx = (i) => cL + (i + 0.5) * (cW / slice.length);
    const yP = (p) => cT + (1 - (p - pMin) / (pMax - pMin)) * (volTop - cT);
    const yV = (v) => cB - (v / (vMax || 1)) * (cB - volTop) * 0.85;

    // ── Grid ──
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    const priceSteps = Math.min(6, Math.max(3, Math.floor((volTop - cT) / 50)));
    ctx.font = '10px "JetBrains Mono",monospace';
    for (let i = 0; i <= priceSteps; i++) {
      const p = pMin + (pMax - pMin) * (i / priceSteps);
      const y = yP(p);
      ctx.beginPath(); ctx.moveTo(cL, y); ctx.lineTo(cR, y); ctx.stroke();
      ctx.fillStyle = C.text; ctx.textAlign = 'left';
      ctx.fillText(fmtPrice(p), cR + 6, y + 3);
    }

    // ── Time-axis labels ──
    const maxLabels = Math.max(3, Math.floor(cW / 90));
    const labelInt = Math.max(1, Math.ceil(slice.length / maxLabels));
    ctx.fillStyle = C.text; ctx.textAlign = 'center';
    for (let i = 0; i < slice.length; i += labelInt) {
      const x = xIdx(i);
      ctx.fillText(fmtTimeAxis(slice[i].date, range), x, cB + 16);
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(x, cT); ctx.lineTo(x, cB); ctx.stroke();
    }

    // ── Volume bars ──
    const candleW = Math.max(MIN_CW, Math.min(MAX_CW, cW / slice.length * 0.7));
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i]; const x = xIdx(i);
      ctx.fillStyle = c.close >= c.open ? C.upVolume : C.downVolume;
      ctx.fillRect(x - candleW / 2, yV(c.volume), candleW, cB - yV(c.volume));
    }

    // ── Candles or Line ──
    if (cType === 'line') {
      const grad = ctx.createLinearGradient(0, cT, 0, volTop);
      grad.addColorStop(0, C.lineGrad1); grad.addColorStop(1, C.lineGrad2);
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) { const x = xIdx(i), y = yP(slice[i].close); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineTo(xIdx(slice.length - 1), volTop); ctx.lineTo(xIdx(0), volTop); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) { const x = xIdx(i), y = yP(slice[i].close); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = C.lineChart; ctx.lineWidth = 2; ctx.stroke();
    } else {
      for (let i = 0; i < slice.length; i++) {
        const c = slice[i]; const x = xIdx(i); const isUp = c.close >= c.open;
        const bTop = yP(Math.max(c.open, c.close));
        const bBot = yP(Math.min(c.open, c.close));
        const bH = Math.max(1, bBot - bTop);
        ctx.strokeStyle = isUp ? C.upWick : C.downWick; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, yP(c.high)); ctx.lineTo(x, yP(c.low)); ctx.stroke();
        ctx.fillStyle = isUp ? C.upBody : C.downBody;
        ctx.fillRect(x - candleW / 2, bTop, candleW, bH <= 1 ? 1 : bH);
      }
    }

    // ── Current price line ──
    const cp = s.currentPrice;
    if (cp != null && cp >= pMin && cp <= pMax) {
      const y = yP(cp);
      ctx.setLineDash([4, 3]); ctx.strokeStyle = C.priceLine; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cL, y); ctx.lineTo(cR, y); ctx.stroke(); ctx.setLineDash([]);
      const lbl = fmtPrice(cp); const tw = ctx.measureText(lbl).width;
      ctx.fillStyle = C.crossLabel; ctx.fillRect(cR + 1, y - 9, tw + 10, 18);
      ctx.fillStyle = '#fff'; ctx.font = '10px "JetBrains Mono",monospace'; ctx.textAlign = 'left';
      ctx.fillText(lbl, cR + 6, y + 4);
    }

    // ── Crosshair ──
    const mx = s.crosshairX, my = s.crosshairY;
    if (mx >= cL && mx <= cR && my >= cT && my <= cB) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.crosshair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mx, cT); ctx.lineTo(mx, cB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cL, my); ctx.lineTo(cR, my); ctx.stroke(); ctx.setLineDash([]);

      // Price label on right
      const price = pMin + (1 - (my - cT) / (volTop - cT)) * (pMax - pMin);
      const lbl = fmtPrice(price); const tw = ctx.measureText(lbl).width;
      ctx.fillStyle = 'rgba(99,102,241,0.85)';
      ctx.fillRect(cR + 1, my - 9, tw + 10, 18);
      ctx.fillStyle = '#fff'; ctx.font = '10px "JetBrains Mono",monospace'; ctx.textAlign = 'left';
      ctx.fillText(lbl, cR + 6, my + 4);

      // Time label on bottom
      const ci = Math.min(slice.length - 1, Math.max(0, Math.floor((mx - cL) / cW * slice.length)));
      if (slice[ci]) {
        const tLbl = fmtTimeFull(slice[ci].date, range);
        const ttw = ctx.measureText(tLbl).width;
        const lx = Math.max(ttw / 2 + 8, Math.min(cR - ttw / 2 - 8, mx));
        ctx.fillStyle = 'rgba(99,102,241,0.85)';
        ctx.fillRect(lx - ttw / 2 - 5, cB + 1, ttw + 10, 20);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(tLbl, lx, cB + 14);

        updateTooltip({
          open: slice[ci].open, high: slice[ci].high, low: slice[ci].low, close: slice[ci].close,
          volume: slice[ci].volume, dateStr: fmtTimeFull(slice[ci].date, range),
        });
      }
    } else {
      updateTooltip(null);
    }
  }

  // ─────────────────── MOUSE HANDLERS ────────────────────────
  const handleMouseMove = useCallback((e) => {
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const s = S.current;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (s.isDragging) {
      const dx = e.clientX - s.dragStartX;
      const cpx = (s.visibleEnd - s.visibleStart) / s.width;
      const shift = Math.round(-dx * cpx * 1.5);
      const rng = s.visibleEnd - s.visibleStart;
      const newStart = Math.max(0, Math.min(s.candles.length - rng, s.dragVisibleStart + shift));
      s.visibleStart = newStart; s.visibleEnd = Math.min(s.candles.length, newStart + rng);
    }
    s.crosshairX = mx; s.crosshairY = my;
    scheduleDraw();
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const s = S.current;
    s.isDragging = true; s.dragStartX = e.clientX; s.dragVisibleStart = s.visibleStart;
    setCursorStyle('grabbing');
  }, []);

  const handleMouseUp = useCallback(() => {
    S.current.isDragging = false;
    setCursorStyle('crosshair');
  }, []);

  const handleMouseLeave = useCallback(() => {
    const s = S.current;
    s.crosshairX = -1; s.crosshairY = -1; s.isDragging = false;
    setCursorStyle('crosshair');
    scheduleDraw();
  }, []);

  // ─────────────────── TOUCH HANDLERS ────────────────────────
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const s = S.current;
    if (e.touches.length === 1) {
      s.isDragging = true; s.dragStartX = e.touches[0].clientX; s.dragVisibleStart = s.visibleStart;
    } else if (e.touches.length === 2) {
      s.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      s.lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const s = S.current;
    if (e.touches.length === 1 && s.isDragging) {
      const dx = e.touches[0].clientX - s.dragStartX;
      const cpx = (s.visibleEnd - s.visibleStart) / s.width;
      const shift = Math.round(-dx * cpx * 1.5);
      const rng = s.visibleEnd - s.visibleStart;
      const newStart = Math.max(0, Math.min(s.candles.length - rng, s.dragVisibleStart + shift));
      s.visibleStart = newStart; s.visibleEnd = Math.min(s.candles.length, newStart + rng);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) { s.crosshairX = e.touches[0].clientX - rect.left; s.crosshairY = e.touches[0].clientY - rect.top; }
      scheduleDraw();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (s.lastTouchDist > 0 && s.candles.length > 0) {
        const scale = s.lastTouchDist / dist;
        const rng = s.visibleEnd - s.visibleStart;
        const newRange = Math.max(8, Math.min(s.candles.length, Math.round(rng * scale)));
        const center = (s.visibleStart + s.visibleEnd) / 2;
        s.visibleStart = Math.max(0, Math.round(center - newRange / 2));
        s.visibleEnd = Math.min(s.candles.length, s.visibleStart + newRange);
        scheduleDraw();
      }
      s.lastTouchDist = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => { S.current.isDragging = false; S.current.lastTouchDist = 0; }, []);

  return (
    <section className="custom-chart-section">
      {/* Toolbar */}
      <div className="chart-toolbar">
        <div className="chart-toolbar-left">
          <div className="chart-type-toggle">
            <button className={`chart-type-btn ${internalChartType === 'candle' ? 'active' : ''}`} onClick={() => setInternalChartType('candle')} title="Candlestick">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="2" height="12" rx="0.5"/><rect x="3.75" y="0" width="0.5" height="16"/><rect x="11" y="4" width="2" height="8" rx="0.5"/><rect x="11.75" y="1" width="0.5" height="14"/></svg>
            </button>
            <button className={`chart-type-btn ${internalChartType === 'line' ? 'active' : ''}`} onClick={() => setInternalChartType('line')} title="Line chart">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1,12 5,7 9,9 15,3"/></svg>
            </button>
          </div>
          <div className="time-range-buttons" role="group">
            {TIME_RANGES.map(tr => (
              <button key={tr.value} className={`time-btn ${range === tr.value ? 'active' : ''}`} onClick={() => onRangeChange?.(tr.value)}>{tr.label}</button>
            ))}
          </div>
        </div>
        <div className="chart-toolbar-right">
          {onToggleLive && (
            <button className={`live-btn ${isLive ? 'active' : ''}`} onClick={onToggleLive} title={isLive ? 'Stop live feed' : 'Start live feed'}>
              <span className={`live-dot ${isLive ? 'pulsing' : ''}`} /> {isLive ? 'LIVE' : 'GO LIVE'}
            </button>
          )}
          <span className="demo-badge">SIMULATED</span>
        </div>
      </div>

      {/* Stock Name + OHLCV Tooltip */}
      <div className="chart-ohlcv-bar">
        <div className="chart-stock-identity">
          <span className="chart-stock-name">{stockName || symbol?.replace(/\.(NS|BO)$/, '')}</span>
          <span className="chart-stock-symbol">{symbol?.replace(/\.(NS|BO)$/, '')}</span>
          <span className="chart-stock-exchange">{exchange || 'NSE'}</span>
        </div>
        <div className="chart-ohlcv-tooltip" ref={tooltipRef} style={{ display: 'none' }} />
      </div>

      {/* Canvas */}
      <div className="chart-canvas-container" ref={containerRef} style={{ cursor: cursorStyle }}>
        <canvas ref={canvasRef} className="chart-canvas"
          onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        />
        {(!candles || candles.length === 0) && (
          <div className="chart-overlay"><span className="search-spinner" /> Loading chart data...</div>
        )}
      </div>
    </section>
  );
}

// ── Formatting helpers ──────────────────────────────────────────

function fmtPrice(p) {
  if (p == null || isNaN(p)) return '—';
  return p >= 1000
    ? p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : p.toFixed(2);
}

function fmtTimeAxis(dateStr, range) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  switch (range) {
    case '1m':
    case '5m':
    case '1d':
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    case '1w':
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
        ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    case '1mo':
    case '3mo':
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    case '1y':
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    default:
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}

function fmtTimeFull(dateStr, range) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  if (range === '1m' || range === '5m' || range === '1d') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (range === '1w') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CustomChart = memo(CustomChartInner);
export default CustomChart;
