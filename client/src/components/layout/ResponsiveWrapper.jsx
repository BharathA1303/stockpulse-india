import { memo, lazy, Suspense } from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const LayoutDesktop = lazy(() => import('./LayoutDesktop'));
const LayoutTablet = lazy(() => import('./LayoutTablet'));
const LayoutMobile = lazy(() => import('./LayoutMobile'));

/**
 * ResponsiveWrapper — Dynamically switches layout based on viewport width.
 * Uses React.lazy for code splitting per layout.
 */
function ResponsiveWrapper(props) {
  const { isMobile, isTablet } = useBreakpoint();

  const fallback = (
    <div className="layout-loading">
      <div className="layout-loading-spinner" />
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      {isMobile ? (
        <LayoutMobile {...props} />
      ) : isTablet ? (
        <LayoutTablet {...props} />
      ) : (
        <LayoutDesktop {...props} />
      )}
    </Suspense>
  );
}

export default memo(ResponsiveWrapper);
