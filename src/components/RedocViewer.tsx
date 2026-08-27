/**
 * Redoc Viewer Component
 * Renders OpenAPI specification using Redoc with deep-linking support and copy link functionality
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
import { useToast } from './Toast';
import Toast from './Toast';
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

  /**
   * Load OpenAPI spec from URL or use provided spec
   */
  useEffect(() => {
    if (spec) {
      setLoadedSpec(spec);
      setLoading(false);
      if (onSpecLoaded) {
        onSpecLoaded(spec);
      }
      return;
    }

    const loadSpec = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(specUrl);
        if (!response.ok) {
          throw new Error(`Failed to load OpenAPI spec: ${response.statusText}`);
        }

        let specData: OpenAPISpec;

        // Handle both JSON and YAML
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('yaml')) {
          const yamlText = await response.text();
          specData = jsYaml.load(yamlText) as OpenAPISpec;
        } else {
          specData = await response.json();
        }

        setLoadedSpec(specData);
        if (onSpecLoaded) {
          onSpecLoaded(specData);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        if (onError) {
          onError(error);
        }
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
            if (onDeepLinkNavigate) onDeepLinkNavigate(elementId);
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
        if (onDeepLinkNavigate) onDeepLinkNavigate(elementId);
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
   * Render Redoc when spec is loaded
   */
  useEffect(() => {
    if (!loadedSpec || !containerRef.current) return;

    // Check if Redoc is available
    if (typeof (window as any).Redoc === 'undefined') {
      // Load Redoc from CDN if not already loaded
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js';
      script.onload = () => {
        renderRedoc();
      };
      script.onerror = () => {
        setError('Failed to load Redoc library from CDN');
      };
      document.head.appendChild(script);
      return;
    }

    renderRedoc();
  }, [loadedSpec]);

  /**
   * Render Redoc instance
   */
  const renderRedoc = () => {
    if (!containerRef.current || !loadedSpec) return;

    const RedocStandalone = (window as any).Redoc;

    try {
      // Fix #218: Redoc's theme engine does not resolve CSS custom
      // properties — it consumes the raw string.  Read the computed value
      // from the document at init-time so actual hex colours are passed.
      const rootStyle = window.getComputedStyle(document.documentElement);
      const primaryColor =
        rootStyle.getPropertyValue('--ifm-color-primary').trim() || '#2e8555';
      const bgColor =
        rootStyle.getPropertyValue('--ifm-background-color').trim() || '#ffffff';
      const surfaceColor =
        rootStyle.getPropertyValue('--ifm-background-surface-color').trim() || '#f5f6f7';
      const textColor =
        rootStyle.getPropertyValue('--ifm-font-color-base').trim() || '#1c1e21';

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
          // Mobile optimizations
          responsiveBreadcrumbs: true,
          pathInMiddlePanel: true,
          // Custom theme with responsive adjustments
          theme: {
            rightPanel: {
              backgroundColor: surfaceColor || '#f5f6f7',
            },
            breakpoints: {
              small: '600px',
              medium: '900px',
              large: '1200px',
            },
            colors: {
              primary: {
                main: primaryColor,
              },
              error: {
                main: '#f93e3e',
              },
              text: {
                primary: textColor,
              },
              background: bgColor,
            },
            sidebar: {
              activeTextColor: primaryColor,
            },
            typography: {
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: '1.5',
              headings: {
                fontFamily: 'inherit',
                fontWeight: 600,
              },
            },
            spacing: {
              unit: 4,
              sectionHorizontal: 40,
              sectionVertical: 40,
            },
          },
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
  };

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
