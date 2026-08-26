import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement `window.matchMedia`, but the API reference layout
 * uses it to detect the mobile viewport (<= 1024px). Provide a controllable
 * stub backed by a mutable flag so tests can simulate mobile and desktop
 * viewports.
 */
let isMobileViewport = false;

export function setMobileViewport(mobile: boolean): void {
  isMobileViewport = mobile;
}

interface MatchMediaListener {
  (this: MediaQueryList, ev: MediaQueryListEvent): void;
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  (window as unknown as { matchMedia: (query: string) => MediaQueryList }).matchMedia =
    (query: string): MediaQueryList =>
      ({
        get matches() {
          return isMobileViewport;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, _listener: MatchMediaListener) => {
          // No-op: viewport changes are simulated per-test via setMobileViewport.
        },
        removeEventListener: () => {
          // No-op.
        },
        addListener: () => {
          // Deprecated API — no-op.
        },
        removeListener: () => {
          // Deprecated API — no-op.
        },
        dispatchEvent: () => false,
      }) as MediaQueryList;
}
