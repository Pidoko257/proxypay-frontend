import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Configuration for the virtual scroll hook.
 *
 * @template T - The type of each item in the list.
 */
export interface UseVirtualScrollOptions {
  /**
   * Total number of items in the full list.
   * The hook only renders a small visible window from this list.
   */
  itemCount: number;
  /**
   * Fixed height of each row in pixels.
   * Variable-height rows are not currently supported.
   * @default 48
   */
  itemHeight?: number;
  /**
   * Number of extra rows to render above and below the visible viewport.
   * Higher values reduce blank-row flicker during fast scrolling at the cost
   * of slightly more DOM nodes.
   * @default 3
   */
  overscan?: number;
}

/**
 * Values returned by {@link useVirtualScroll}.
 */
export interface UseVirtualScrollReturn {
  /** Index of the first item currently rendered (including overscan). */
  startIndex: number;
  /** Index one past the last item currently rendered (including overscan). */
  endIndex: number;
  /**
   * Total pixel height of the scrollable list container.
   * Set this on the outer wrapper element so the scrollbar reflects the full
   * list length even though only a subset of rows is in the DOM.
   *
   * @example
   * ```tsx
   * <div style={{ height: containerHeight, overflowY: 'auto' }} ref={scrollRef}>
   *   <div style={{ height: totalHeight, position: 'relative' }}>
   *     {virtualItems.map(({ index, offsetTop }) => (
   *       <div key={index} style={{ position: 'absolute', top: offsetTop, height: itemHeight }}>
   *         {items[index]}
   *       </div>
   *     ))}
   *   </div>
   * </div>
   * ```
   */
  totalHeight: number;
  /**
   * The slice of items to render.
   * Each entry contains the original list `index` and the `offsetTop` (px)
   * to position the row absolutely within the inner container.
   */
  virtualItems: Array<{ index: number; offsetTop: number }>;
  /**
   * Ref to attach to the scrollable container `<div>`.
   * The hook reads `scrollTop` from this element via a **passive** scroll
   * listener, preventing scroll jank on mobile (issue #446).
   */
  scrollRef: React.RefObject<HTMLDivElement>;
  /** Current `scrollTop` value of the scroll container in pixels. */
  scrollTop: number;
}

/**
 * useVirtualScroll
 *
 * Renders only the rows visible in the viewport plus a small overscan buffer,
 * reducing DOM node count for long lists and eliminating scroll jank on mobile
 * (issue #446).
 *
 * Key performance techniques applied:
 * - **Passive scroll listener** – `{ passive: true }` so the browser can
 *   optimise scroll compositing without waiting for JS.
 * - **`will-change: transform`** – apply to the inner container in CSS to hint
 *   the browser to promote it to its own compositor layer.
 * - **Cleanup on unmount** – the scroll listener is removed in the `useEffect`
 *   return callback, preventing memory leaks (issue #445).
 *
 * @param options - Virtual scroll configuration.
 * @returns Virtualisation state and the scroll container ref.
 *
 * @example
 * ```tsx
 * const ITEM_HEIGHT = 48;
 * const items = Array.from({ length: 10_000 }, (_, i) => `Item ${i}`);
 *
 * function LargeList() {
 *   const { scrollRef, totalHeight, virtualItems } = useVirtualScroll({
 *     itemCount: items.length,
 *     itemHeight: ITEM_HEIGHT,
 *   });
 *
 *   return (
 *     <div ref={scrollRef} style={{ height: 400, overflowY: 'auto' }}>
 *       <div style={{ height: totalHeight, position: 'relative', willChange: 'transform' }}>
 *         {virtualItems.map(({ index, offsetTop }) => (
 *           <div
 *             key={index}
 *             style={{ position: 'absolute', top: offsetTop, height: ITEM_HEIGHT, width: '100%' }}
 *           >
 *             {items[index]}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVirtualScroll({
  itemCount,
  itemHeight = 48,
  overscan = 3,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const scrollRef = useRef<HTMLDivElement>(null!);
  const [scrollTop, setScrollTop] = useState(0);

  // Attach a passive scroll listener so the browser can optimise compositing.
  // Cleaned up on unmount to prevent memory leaks (issue #445).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    // { passive: true } is the key fix for scroll jank on mobile (issue #446).
    // A passive listener cannot call preventDefault(), so the browser can
    // begin scrolling immediately without waiting for the JS event handler.
    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      // Cleanup – prevents memory leak (issue #445)
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const totalHeight = itemCount * itemHeight;

  // Derive the visible window from scrollTop
  const containerHeight = scrollRef.current?.clientHeight ?? 400;
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  const rawStart = Math.floor(scrollTop / itemHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(itemCount, rawStart + visibleCount + overscan);

  const virtualItems = [];
  for (let i = startIndex; i < endIndex; i++) {
    virtualItems.push({ index: i, offsetTop: i * itemHeight });
  }

  return {
    startIndex,
    endIndex,
    totalHeight,
    virtualItems,
    scrollRef,
    scrollTop,
  };
}
