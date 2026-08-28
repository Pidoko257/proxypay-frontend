/**
 * Redoc Viewer Component
 * Renders OpenAPI specification using Redoc with deep-linking support and copy link functionality
 * Includes cache-busting support via version query parameters
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import jsYaml from 'js-yaml';
import {
  parseDeepLink,
  updateHistory,
  generateRedocSelectorId,
  scrollIntoView,
  onHashChange,
} from '../utils/redocDeepLink';
import { getSpecUrlWithCacheBusting, checkSpecVersion, updateVersionTracking } from '../utils/specVersionManager';
import { useToast } from './Toast';
import Toast from './Toast';
import { loadRedoc } from '../utils/redocLoader';
import {
  buildRedocTheme,
  readRedocThemeColors,
  redocThemeColorsEqual,
  type RedocThemeColors,
} from '../utils/redocTheme';
import styles from './RedocViewer.module.css';

/**
 * OpenAPI specification object
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths?: Record<string, Record<string, any>>;
  components?: Record<string, any>;
  tags?: Array<{ name: string; description?: string }>;
  servers?: Array<{ url: string; description?: string }>;
  [key: string]: any;
}

export interface RedocViewerProps {
  specUrl?: string;
  spec?: OpenAPISpec;
  title?: string;
  hideHostname?: boolean;
  disableSidebar?: boolean;
  expandTagsByDefault?: boolean;
  enableDeepLinking?: boolean;
  onSpecLoaded?: (spec: OpenAPISpec) => void;
  onError?: (error: Error) => void;
  onDeepLinkNavigate?: (elementId: string) => void;
  enableAnchorCopy?: boolean;
}

/**
 * RedocViewer Component
 * Renders Redoc with OpenAPI specification
 */
export default function RedocViewer({
  specUrl = '/openapi.yaml',
  spec,
  title = 'API Reference',
  hideHostname = false,
  disableSidebar = false,
  expandTagsByDefault = true,
  enableDeepLinking = true,
  onSpecLoaded,
  onError,
  onDeepLinkNavigate,
  enableAnchorCopy = true,
}: RedocViewerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(!spec);
  const [error, setError] = useState<string | null>(null);
  const [loadedSpec, setLoadedSpec] = useState<OpenAPISpec | null>(spec || null);
  const hashChangeUnsubscribeRef = useRef<(() => void) | null>(null);
  const { messages, success, error: showError } = useToast();
  const copyButtonRef = useRef<HTMLDivElement>(null);
  // Fix #356: remember the colours Redoc was last initialised with so a theme
  // change can be detected and the viewer re-initialised.
  const lastThemeColorsRef = useRef<RedocThemeColors | null>(null);

  /**
   * Load OpenAPI spec from URL or use provided spec
   * Includes cache-busting query parameter based on spec version
   */
  useEffect(() => {
    if (spec) {
      setLoadedSpec(spec);
      setLoading(false);
      onSpecLoaded?.(spec);
      return;
    }

    const loadSpec = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add cache-busting query parameter to spec URL
        const cacheBustedUrl = getSpecUrlWithCacheBusting(specUrl);

        const response = await fetch(cacheBustedUrl);
        if (!response.ok) {
          throw new Error(`Failed to load OpenAPI spec: ${response.statusText}`);
        }

        let specData: OpenAPISpec;
        let specContent: string;

        // Handle both JSON and YAML
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('yaml')) {
          specContent = await response.text();
          specData = jsYaml.load(specContent) as OpenAPISpec;
        } else {
          specContent = await response.text();
          specData = JSON.parse(specContent);
        }

        // Update version tracking after successful load
        try {
          updateVersionTracking(specContent);
        } catch (err) {
          console.warn('Failed to update version tracking:', err);
          // Don't fail the spec load if version tracking fails
        }

        setLoadedSpec(specData);
        onSpecLoaded?.(specData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        onError?.(error);
        console.error('Failed to load OpenAPI spec:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpec();
  }, [specUrl, spec, onSpecLoaded, onError]);

  /**
   * Handle deep-linking to specific sections.
   *
   * Fix #228: Redoc renders section anchors with multiple possible
   * ID/attribute patterns depending on version and spec shape.  Try
   * several selectors in order so that both tag-level and
   * operation-level links scroll reliably.
   */
  const handleDeepLink = useCallback(
    (elementId: string | null) => {
      if (!enableDeepLinking || !elementId || !containerRef.current) return;

      const container = containerRef.current;

      // Helper: attempt to find an element by a selector and scroll to it.
      const tryScroll = (selector: string): boolean => {
        try {
          const el = container.querySelector(selector) as HTMLElement | null;
          if (el) {
            scrollIntoView(el);
            onDeepLinkNavigate?.(elementId);
            return true;
          }
        } catch {
          // CSS.escape or selector may throw — silently continue.
        }
        return false;
      };

      // Candidates in priority order:
      // 1. Standard id attribute (Redoc >= 2.x uses "tag/<Tag>" or "operation/<operationId>")
      if (tryScroll(`[id="${CSS.escape(elementId)}"]`)) return;

      // 2. Redoc uses "data-section-id" on <div> wrappers in some builds
      if (tryScroll(`[data-section-id="${CSS.escape(elementId)}"]`)) return;

      // 3. Named anchor fallback  (older Redoc / some spec shapes)
      if (tryScroll(`a[name="${CSS.escape(elementId)}"]`)) return;

      // 4. Try slug-ified version (spaces → hyphens, lowercase)
      const slugId = elementId.toLowerCase().replace(/\s+/g, '-');
      if (slugId !== elementId) {
        if (tryScroll(`[id="${CSS.escape(slugId)}"]`)) return;
        if (tryScroll(`[data-section-id="${CSS.escape(slugId)}"]`)) return;
      }

      // 5. Fall back to native browser hash scroll (works for simple anchors)
      const anchor = document.getElementById(elementId) || document.getElementById(slugId);
      if (anchor) {
        scrollIntoView(anchor);
        onDeepLinkNavigate?.(elementId);
      }
    },
    [enableDeepLinking, onDeepLinkNavigate],
  );

  /**
   * Copy current anchor link to clipboard
   */
  const copyAnchorLink = useCallback(async () => {
    if (!enableAnchorCopy) return;

    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      success('Link copied to clipboard!', 2000);
    } catch (err) {
      showError('Failed to copy link', 2000);
      console.error('Failed to copy anchor link:', err);
    }
  }, [enableAnchorCopy, success, showError]);

  /**
   * Set up hash change listener for deep-linking and copy button
   */
  useEffect(() => {
    if (!enableDeepLinking || !loadedSpec) return;

    const unsubscribe = onHashChange((deepLink) => {
      if (!deepLink) return;

      if (deepLink.type === 'endpoint' && deepLink.target) {
        // Try to find and scroll to endpoint
        handleDeepLink(deepLink.target);
      } else if (deepLink.type === 'tag' && deepLink.target) {
        // Try to find and scroll to tag
        const tagId = deepLink.target.toLowerCase().replace(/\s+/g, '-');
        handleDeepLink(tagId);
      }
    });

    hashChangeUnsubscribeRef.current = unsubscribe;

    return () => {
      if (hashChangeUnsubscribeRef.current) {
        hashChangeUnsubscribeRef.current();
      }
    };
  }, [enableDeepLinking, loadedSpec, handleDeepLink]);

  /**
   * Render Redoc instance.
   *
   * Fix #218: Redoc's theme engine does not resolve CSS custom properties — it
   * consumes the raw string.  The computed `--ifm-*` values are read at
   * init-time so actual hex colours are passed.
   * Fix #356: the container is cleared first so this can also run as a
   * re-initialisation when the site theme changes.
   */
  const renderRedoc = useCallback(() => {
    if (!containerRef.current || !loadedSpec) return;

    const RedocStandalone = (window as any).Redoc;
    if (!RedocStandalone) return;

    try {
      const themeColors = readRedocThemeColors(window);
      lastThemeColorsRef.current = themeColors;

      // Remove any previously rendered instance before (re)initialising.
      containerRef.current.innerHTML = '';

      RedocStandalone.init(
        loadedSpec,
        {
          scrollYOffset: 0,
          hideHostname,
          disableSidebar,
          expandTagsByDefault,
          nativeScrollbars: true,
          untrustedSpec: false,
          suppressWarnings: true,
          theme: buildRedocTheme(themeColors),
        },
        containerRef.current,
      );

      // Handle current hash if deep-linking is enabled
      if (enableDeepLinking && window.location.hash) {
        const deepLink = parseDeepLink(window.location.hash);
        if (deepLink && deepLink.type === 'endpoint') {
          handleDeepLink(deepLink.target);
        }
      }
    } catch (err) {
      console.error('Failed to initialize Redoc:', err);
      setError('Failed to initialize API reference viewer');
    }
  }, [
    loadedSpec,
    hideHostname,
    disableSidebar,
    expandTagsByDefault,
    enableDeepLinking,
    handleDeepLink,
  ]);

  /**
   * Load the Redoc bundle (deduplicated, singleton) and render once the spec
   * is available.  Fix #355: waiting on the shared loader promise guarantees
   * `window.Redoc` is fully parsed before `init()` runs, even if several
   * viewers mount at once or the CDN is slow.
   */
  useEffect(() => {
    if (!loadedSpec || !containerRef.current) return;

    let cancelled = false;
    loadRedoc()
      .then(() => {
        if (!cancelled) renderRedoc();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load Redoc library from CDN',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [loadedSpec, renderRedoc]);

  /**
   * Fix #356: re-initialise Redoc when the site theme changes so its colours
   * follow the active theme instead of being frozen at first render.  Watches
   * both the Docusaurus `data-theme` / `class` attributes on <html> and the OS
   * `prefers-color-scheme` setting.
   */
  useEffect(() => {
    if (!loadedSpec || typeof window === 'undefined') return;

    const maybeReinit = () => {
      if (!(window as any).Redoc) return;
      const next = readRedocThemeColors(window);
      if (
        lastThemeColorsRef.current &&
        redocThemeColorsEqual(next, lastThemeColorsRef.current)
      ) {
        return;
      }
      renderRedoc();
    };

    const observer = new MutationObserver(maybeReinit);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener?.('change', maybeReinit);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener?.('change', maybeReinit);
    };
  }, [loadedSpec, renderRedoc]);

  /**
   * Handle loading state
   */
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading API specification...</p>
        </div>
      </div>
    );
  }

  /**
   * Handle error state
   */
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Failed to Load API Reference</h3>
          <p>{error}</p>
          <p className={styles.errorHint}>
            Make sure the OpenAPI specification file is available at <code>{specUrl}</code>
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render Redoc container
   */
  return (
    <div className={styles.redocContainer}>
      <Toast messages={messages} />
      {enableAnchorCopy && window.location.hash && (
        <div className={styles.copyButtonContainer} ref={copyButtonRef}>
          <button
            className={styles.copyButton}
            onClick={copyAnchorLink}
            title="Copy anchor link to clipboard"
            aria-label="Copy anchor link"
          >
            <span className={styles.copyIcon}>🔗</span>
            <span className={styles.copyText}>Copy Link</span>
          </button>
        </div>
      )}
      <div ref={containerRef} className={styles.redoc} />
    </div>
  );
}
