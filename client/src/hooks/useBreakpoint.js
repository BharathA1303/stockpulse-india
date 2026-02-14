import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Responsive breakpoint hook — debounced, SSR-safe.
 *
 * Breakpoints (mobile-first):
 *   xs:  0–479px   (small phones)
 *   sm:  480–767px  (large phones)
 *   md:  768–1023px (tablets)
 *   lg:  1024–1439px (laptops)
 *   xl:  1440px+    (desktops)
 */
const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
};

function getBreakpoint(width) {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

export function useBreakpoint() {
  const [state, setState] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return {
      width: w,
      breakpoint: getBreakpoint(w),
      isMobile: w < BREAKPOINTS.md,
      isTablet: w >= BREAKPOINTS.md && w < BREAKPOINTS.lg,
      isDesktop: w >= BREAKPOINTS.lg,
    };
  });

  const rafRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleResize = useCallback(() => {
    // Debounce + rAF for smooth perf
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const w = window.innerWidth;
        setState(prev => {
          const bp = getBreakpoint(w);
          if (prev.breakpoint === bp && prev.width === w) return prev;
          return {
            width: w,
            breakpoint: bp,
            isMobile: w < BREAKPOINTS.md,
            isTablet: w >= BREAKPOINTS.md && w < BREAKPOINTS.lg,
            isDesktop: w >= BREAKPOINTS.lg,
          };
        });
      });
    }, 100);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    // Initial measure
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize]);

  return state;
}

export { BREAKPOINTS };
