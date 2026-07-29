/**
 * Redoc Viewer Component
 * Renders OpenAPI specification using Redoc with deep-linking support
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
}: RedocViewerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(!spec);
  const [error, setError] = useState<string | null>(null);
  const [loadedSpec, setLoadedSpec] = useState<OpenAPISpec | null>(spec || null);
  const hashChangeUnsubscribeRef = useRef<(() => void) | null>(null);

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
   * Handle deep-linking to specific sections
   */
  const handleDeepLink = useCallback(
    (elementId: string | null) => {
      if (!enableDeepLinking || !elementId || !containerRef.current) return;

      // Try to find element in Redoc container
      const element = containerRef.current.querySelector(`[id="${CSS.escape(elementId)}"]`);
      if (element) {
        scrollIntoView(element as HTMLElement);
        if (onDeepLinkNavigate) {
          onDeepLinkNavigate(elementId);
        }
      }
    },
    [enableDeepLinking, onDeepLinkNavigate],
  );

  /**
   * Set up hash change listener for deep-linking
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
      RedocStandalone.init(
        loadedSpec,
        {
          scrollYOffset: 0,
          hideHostname,
          disableSidebar,
          expandTagsByDefault,
          nativeScrollbars: true,
          theme: {
            rightPanel: {
              backgroundColor: 'var(--ifm-background-surface-secondary)',
            },
            colors: {
              primary: 'var(--ifm-color-primary)',
              error: 'var(--ifm-color-danger)',
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
      <div ref={containerRef} className={styles.redoc} />
    </div>
  );
}
