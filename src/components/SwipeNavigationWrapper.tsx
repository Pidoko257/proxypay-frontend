/**
 * SwipeNavigationWrapper — Issue #626
 *
 * Wraps portal content and provides mobile swipe-to-navigate behaviour.
 * Shows a subtle directional indicator overlay during active swipe gestures.
 */

import React, { ReactNode, useCallback } from 'react';
import styles from './SwipeNavigationWrapper.module.css';
import { useSwipeNavigation } from '@site/src/hooks/useSwipeNavigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SwipeNavigationWrapperProps {
  children: ReactNode;
  /** Ordered list of route paths to navigate between */
  routes?: string[];
  /** Swipe sensitivity in px. Default: 50 */
  sensitivity?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findAdjacentRoutes(
  routes: string[],
  currentPath: string,
): { prev: string | null; next: string | null } {
  const idx = routes.indexOf(currentPath);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? routes[idx - 1] : null,
    next: idx < routes.length - 1 ? routes[idx + 1] : null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SwipeNavigationWrapper({
  children,
  routes = [],
  sensitivity = 50,
}: SwipeNavigationWrapperProps): React.JSX.Element {
  const navigate = useCallback(
    (path: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = path;
      }
    },
    [],
  );

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '/';
  const { prev, next } = findAdjacentRoutes(routes, currentPath);

  const { swipeDirection, swipeProgress, isSwipeActive } = useSwipeNavigation({
    sensitivity,
    onSwipeLeft: () => {
      if (next) navigate(next);
    },
    onSwipeRight: () => {
      if (prev) navigate(prev);
    },
  });

  return (
    <div data-testid="swipe-wrapper" className={styles.wrapper}>
      {children}

      {/* Left indicator — shown when swiping right (going back) */}
      {isSwipeActive && swipeDirection === 'right' && prev && (
        <div
          className={`${styles.indicator} ${styles.indicatorLeft}`}
          style={{ opacity: swipeProgress }}
          aria-hidden="true"
        >
          <span className={styles.arrow}>‹</span>
        </div>
      )}

      {/* Right indicator — shown when swiping left (going forward) */}
      {isSwipeActive && swipeDirection === 'left' && next && (
        <div
          className={`${styles.indicator} ${styles.indicatorRight}`}
          style={{ opacity: swipeProgress }}
          aria-hidden="true"
        >
          <span className={styles.arrow}>›</span>
        </div>
      )}
    </div>
  );
}
