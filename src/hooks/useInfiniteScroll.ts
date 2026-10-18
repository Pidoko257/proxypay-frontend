/**
 * useInfiniteScroll — Issue #449
 *
 * Detects when the user scrolls to (or near) the bottom of a container (or
 * the window) and calls `onLoadMore` to fetch the next page of data.
 *
 * Features:
 * - Works with any scrollable container ref OR the window by default
 * - `threshold` controls how many px from the bottom to trigger (default 100)
 * - `isLoading` flag prevents duplicate in-flight requests
 * - `hasMore` flag stops watching once all data is loaded
 * - Returns a sentinel ref you can attach to a DOM node for IntersectionObserver strategy
 */

import { useCallback, useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  /** Called when the user scrolls near the bottom and more data is available. */
  onLoadMore: () => void;
  /** Pass false to stop triggering (all data is loaded). */
  hasMore: boolean;
  /** True while a fetch is in progress — prevents duplicate calls. */
  isLoading: boolean;
  /** Pixels from the bottom at which the callback fires (default: 100). */
  threshold?: number;
  /** Ref to a scrollable container element. Defaults to window scroll. */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export interface UseInfiniteScrollReturn {
  /** Attach this ref to a sentinel element at the bottom of your list. */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
  scrollContainerRef,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep callback ref up to date without restarting the observer
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const handleScroll = useCallback(() => {
    if (!hasMore || isLoading) return;

    const container = scrollContainerRef?.current;

    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        onLoadMoreRef.current();
      }
    } else {
      const { scrollY, innerHeight } = window;
      const { scrollHeight } = document.documentElement;
      if (scrollHeight - scrollY - innerHeight < threshold) {
        onLoadMoreRef.current();
      }
    }
  }, [hasMore, isLoading, threshold, scrollContainerRef]);

  useEffect(() => {
    const target = scrollContainerRef?.current ?? window;

    target.addEventListener('scroll', handleScroll, { passive: true });
    // Check immediately in case the content is shorter than the viewport
    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, scrollContainerRef]);

  // IntersectionObserver-based sentinel (more performant, used alongside scroll)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          onLoadMoreRef.current();
        }
      },
      {
        root: scrollContainerRef?.current ?? null,
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, threshold, scrollContainerRef]);

  return { sentinelRef };
}

export default useInfiniteScroll;
