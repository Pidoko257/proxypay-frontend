/**
 * Singleton loader for the Redoc standalone CDN bundle.
 *
 * Fix #355: `RedocViewer` used to append its own `<script>` tag and call
 * `Redoc.init()` from the `onload` handler.  When the CDN was slow — or two
 * viewers mounted at the same time — the bundle could be fetched more than once
 * and, worse, initialisation could race the bundle finishing parsing.
 *
 * `loadRedoc()` tracks the load process-wide:
 *   - if `window.Redoc` already exists it resolves immediately;
 *   - the first caller injects the script, every later caller re-uses the very
 *     same in-flight promise (deduplication);
 *   - the promise only resolves once `window.Redoc` is actually defined.
 */

export const REDOC_CDN_URL =
  'https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js';

/** Stable id so a pending script from a previous mount can be re-used. */
export const REDOC_SCRIPT_ID = 'redoc-standalone-cdn';

export interface RedocGlobal {
  init: (...args: unknown[]) => unknown;
}

let loadPromise: Promise<RedocGlobal> | null = null;

function getRedocGlobal(): RedocGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Redoc?: RedocGlobal }).Redoc;
}

/**
 * Load the Redoc bundle exactly once and resolve with the global `Redoc`
 * object.  Concurrent calls share a single promise.
 */
export function loadRedoc(cdnUrl: string = REDOC_CDN_URL): Promise<RedocGlobal> {
  const existing = getRedocGlobal();
  if (existing) return Promise.resolve(existing);

  // A load is already in flight — hand back the same promise.
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<RedocGlobal>((resolve, reject) => {
    if (typeof document === 'undefined') {
      loadPromise = null;
      reject(new Error('Redoc can only be loaded in a browser environment'));
      return;
    }

    const settle = () => {
      const redoc = getRedocGlobal();
      if (redoc) {
        resolve(redoc);
      } else {
        loadPromise = null;
        reject(new Error('Redoc bundle loaded but window.Redoc is undefined'));
      }
    };

    const fail = (script?: HTMLScriptElement) => {
      loadPromise = null;
      if (script && script.parentNode) script.parentNode.removeChild(script);
      reject(new Error('Failed to load Redoc library from CDN'));
    };

    // Re-use a script tag left pending by an earlier mount.
    const pending = document.getElementById(
      REDOC_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (pending) {
      if (pending.dataset.loaded === 'true') {
        settle();
      } else {
        pending.addEventListener('load', settle, { once: true });
        pending.addEventListener('error', () => fail(), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = REDOC_SCRIPT_ID;
    script.src = cdnUrl;
    script.async = true;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        settle();
      },
      { once: true },
    );
    script.addEventListener('error', () => fail(script), { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Whether a Redoc load has already been started or completed. */
export function isRedocLoadStarted(): boolean {
  return loadPromise !== null || getRedocGlobal() !== undefined;
}

/** Test-only: reset the module-level singleton between test cases. */
export function __resetRedocLoaderForTests(): void {
  loadPromise = null;
}
