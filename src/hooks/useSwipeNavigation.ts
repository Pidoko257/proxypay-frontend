/**
 * useSwipeNavigation — Issue #626
 *
 * Detects left/right touch swipes on the document and fires callbacks.
 * Respects `data-no-swipe` attributes and scrollable elements.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SwipeDirection = 'left' | 'right' | null;

export interface SwipeNavigationOptions {
  /** Minimum horizontal distance (px) to trigger a swipe. Default: 50 */
  sensitivity?: number;
  /** Called when a left swipe is completed */
  onSwipeLeft?: () => void;
  /** Called when a right swipe is completed */
  onSwipeRight?: () => void;
}

export interface SwipeNavigationResult {
  /** Direction of the current or most recent swipe */
  swipeDirection: SwipeDirection;
  /**
   * Progress of the ongoing swipe as a 0–1 value relative to the sensitivity
   * threshold. Useful for animating the indicator.
   */
  swipeProgress: number;
  /** Whether a swipe gesture is currently in progress */
  isSwipeActive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the element or any ancestor has `data-no-swipe`. */
function hasNoSwipeAttribute(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.dataset?.noSwipe !== undefined) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Returns true when the element is scrollable horizontally and the swipe
 * direction would scroll it (so we don't hijack native scroll).
 */
function isHorizontallyScrollable(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflow = style.overflowX;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSwipeNavigation(options: SwipeNavigationOptions = {}): SwipeNavigationResult {
  const { sensitivity = 50, onSwipeLeft, onSwipeRight } = options;

  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [swipeProgress, setSwipeProgress] = useState<number>(0);
  const [isSwipeActive, setIsSwipeActive] = useState<boolean>(false);

  // Use refs to avoid stale closures in event listeners
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startTargetRef = useRef<EventTarget | null>(null);
  const blockedRef = useRef<boolean>(false);

  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.changedTouches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTargetRef.current = event.target;
    blockedRef.current =
      hasNoSwipeAttribute(event.target) || isHorizontallyScrollable(event.target);
    setSwipeDirection(null);
    setSwipeProgress(0);
    setIsSwipeActive(false);
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (blockedRef.current || startXRef.current === null || startYRef.current === null) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // If vertical movement dominates, treat as scroll — cancel swipe tracking
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        blockedRef.current = true;
        setIsSwipeActive(false);
        setSwipeProgress(0);
        setSwipeDirection(null);
        return;
      }

      setIsSwipeActive(true);
      const progress = Math.min(1, Math.abs(deltaX) / sensitivity);
      setSwipeProgress(progress);
      setSwipeDirection(deltaX < 0 ? 'left' : 'right');
    },
    [sensitivity],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (blockedRef.current || startXRef.current === null) {
        startXRef.current = null;
        startYRef.current = null;
        setIsSwipeActive(false);
        setSwipeProgress(0);
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;

      if (Math.abs(deltaX) >= sensitivity) {
        if (deltaX < 0) {
          setSwipeDirection('left');
          onSwipeLeftRef.current?.();
        } else {
          setSwipeDirection('right');
          onSwipeRightRef.current?.();
        }
      } else {
        setSwipeDirection(null);
      }

      startXRef.current = null;
      startYRef.current = null;
      setIsSwipeActive(false);
      setSwipeProgress(0);
    },
    [sensitivity],
  );

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { swipeDirection, swipeProgress, isSwipeActive };
}
