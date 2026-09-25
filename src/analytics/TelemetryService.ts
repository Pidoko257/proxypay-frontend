/**
 * TelemetryService — Issue #452
 *
 * GDPR-compliant analytics / telemetry service for the ProxyPay portal.
 *
 * Features:
 *  - Opt-in consent model: nothing is sent until the user explicitly opts in
 *  - Page-view tracking
 *  - User-interaction event tracking (clicks, feature use, etc.)
 *  - Consent persisted to localStorage so the choice survives reloads
 *  - Pluggable backend: set a custom endpoint or override `send()`
 *  - Singleton pattern so the same instance is shared across the app
 *  - React hook `useTelemetry()` for convenient component-level use
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface PageViewEvent {
  type: 'page_view';
  path: string;
  title?: string;
  referrer?: string;
  timestamp: number;
}

export interface InteractionEvent {
  type: 'interaction';
  category: string;   // e.g. "feature", "navigation", "endpoint"
  action: string;     // e.g. "click", "view", "search"
  label?: string;     // e.g. "comparison-view", "/api/payments"
  value?: number;     // optional numeric value (e.g. response time)
  timestamp: number;
}

export type TelemetryEvent = PageViewEvent | InteractionEvent;

export interface TelemetryConfig {
  /**
   * URL to POST batched events to.
   * Defaults to a no-op (events are logged to console in dev mode only).
   */
  endpoint?: string;
  /**
   * Maximum events to queue before flushing.
   * @default 20
   */
  batchSize?: number;
  /**
   * Interval in ms for auto-flush.
   * @default 30_000 (30 seconds)
   */
  flushInterval?: number;
  /**
   * Whether to print events to the console in development.
   * @default true in development
   */
  debug?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSENT_STORAGE_KEY = 'proxypay_telemetry_consent';
const DEFAULT_BATCH_SIZE  = 20;
const DEFAULT_FLUSH_MS    = 30_000;

// ---------------------------------------------------------------------------
// TelemetryService class
// ---------------------------------------------------------------------------

export class TelemetryService {
  private static _instance: TelemetryService | null = null;

  private consent: ConsentStatus = 'pending';
  private queue: TelemetryEvent[] = [];
  private config: Required<TelemetryConfig>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(status: ConsentStatus) => void> = [];

  private constructor(config: TelemetryConfig = {}) {
    this.config = {
      endpoint:      config.endpoint      ?? '',
      batchSize:     config.batchSize     ?? DEFAULT_BATCH_SIZE,
      flushInterval: config.flushInterval ?? DEFAULT_FLUSH_MS,
      debug:         config.debug         ?? (process.env.NODE_ENV === 'development'),
    };

    this.restoreConsent();
    this.startFlushTimer();
  }

  // ── Singleton ──────────────────────────────────────────────────────────────

  /** Get (or lazily create) the shared TelemetryService instance. */
  static getInstance(config?: TelemetryConfig): TelemetryService {
    if (!TelemetryService._instance) {
      TelemetryService._instance = new TelemetryService(config);
    }
    return TelemetryService._instance;
  }

  /** Reset the singleton — useful for testing. */
  static reset(): void {
    if (TelemetryService._instance) {
      TelemetryService._instance.destroy();
      TelemetryService._instance = null;
    }
  }

  // ── Consent ────────────────────────────────────────────────────────────────

  /** Restore persisted consent from localStorage. */
  private restoreConsent(): void {
    try {
      const stored = typeof window !== 'undefined'
        ? window.localStorage.getItem(CONSENT_STORAGE_KEY)
        : null;

      if (stored === 'granted' || stored === 'denied') {
        this.consent = stored;
      }
    } catch {
      // localStorage unavailable (SSR, private browsing restrictions)
    }
  }

  /** Persist consent to localStorage. */
  private persistConsent(status: ConsentStatus): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
      }
    } catch {
      // ignore
    }
  }

  /** The user explicitly opts in to telemetry. */
  grantConsent(): void {
    this.consent = 'granted';
    this.persistConsent('granted');
    this.notifyListeners();
    this.debugLog('Telemetry consent granted');
  }

  /** The user explicitly opts out of telemetry. */
  denyConsent(): void {
    this.consent = 'denied';
    this.persistConsent('denied');
    this.queue = []; // discard any queued events
    this.notifyListeners();
    this.debugLog('Telemetry consent denied — queue cleared');
  }

  /** Current consent status. */
  getConsent(): ConsentStatus {
    return this.consent;
  }

  /** True iff the user has granted consent. */
  isOptedIn(): boolean {
    return this.consent === 'granted';
  }

  // ── Tracking ───────────────────────────────────────────────────────────────

  /**
   * Track a page view.
   * Silently ignored if consent is not 'granted'.
   */
  trackPageView(path: string, title?: string, referrer?: string): void {
    if (!this.isOptedIn()) return;

    const event: PageViewEvent = {
      type:      'page_view',
      path,
      title:     title     ?? (typeof document !== 'undefined' ? document.title : undefined),
      referrer:  referrer  ?? (typeof document !== 'undefined' ? document.referrer : undefined),
      timestamp: Date.now(),
    };

    this.enqueue(event);
  }

  /**
   * Track a user interaction.
   * Silently ignored if consent is not 'granted'.
   */
  trackInteraction(
    category: string,
    action: string,
    label?: string,
    value?: number,
  ): void {
    if (!this.isOptedIn()) return;

    const event: InteractionEvent = {
      type:      'interaction',
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
    };

    this.enqueue(event);
  }

  // ── Queue management ───────────────────────────────────────────────────────

  private enqueue(event: TelemetryEvent): void {
    this.queue.push(event);
    this.debugLog('Event queued', event);

    if (this.queue.length >= this.config.batchSize) {
      void this.flush();
    }
  }

  /**
   * Flush all queued events to the configured endpoint.
   * Returns silently if there is nothing to send or no endpoint is set.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    if (!this.isOptedIn()) {
      this.queue = [];
      return;
    }

    const batch = [...this.queue];
    this.queue = [];

    this.debugLog(`Flushing ${batch.length} event(s)`);

    if (!this.config.endpoint) {
      // No backend configured — in dev, events are already logged above
      return;
    }

    try {
      await fetch(this.config.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ events: batch }),
        // keepalive allows the request to outlive the page unload
        keepalive: true,
      });
    } catch (err) {
      // Network errors must not crash the app — re-queue with a limit
      if (this.queue.length < this.config.batchSize * 2) {
        this.queue = [...batch, ...this.queue];
      }
      this.debugLog('Flush failed, events re-queued', err);
    }
  }

  /** Number of events currently queued. */
  queueSize(): number {
    return this.queue.length;
  }

  // ── Timer ──────────────────────────────────────────────────────────────────

  private startFlushTimer(): void {
    if (typeof setInterval === 'undefined') return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  // ── Consent listeners ──────────────────────────────────────────────────────

  onConsentChange(cb: (status: ConsentStatus) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      try { cb(this.consent); } catch { /* ignore */ }
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.listeners = [];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private debugLog(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.debug('[TelemetryService]', message, ...args);
    }
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export interface UseTelemetryReturn {
  consent: ConsentStatus;
  isOptedIn: boolean;
  grantConsent: () => void;
  denyConsent: () => void;
  trackPageView: (path: string, title?: string) => void;
  trackInteraction: (category: string, action: string, label?: string, value?: number) => void;
}

/**
 * React hook that provides access to the shared TelemetryService and
 * re-renders when consent status changes.
 *
 * @example
 *   const { isOptedIn, grantConsent, trackInteraction } = useTelemetry();
 */
export function useTelemetry(config?: TelemetryConfig): UseTelemetryReturn {
  const service = TelemetryService.getInstance(config);
  const [consent, setConsent] = useState<ConsentStatus>(service.getConsent());

  useEffect(() => {
    // Sync state if consent was changed outside of this hook instance
    setConsent(service.getConsent());
    const unsubscribe = service.onConsentChange(setConsent);
    return unsubscribe;
  }, [service]);

  const grantConsent = useCallback(() => service.grantConsent(), [service]);
  const denyConsent  = useCallback(() => service.denyConsent(),  [service]);

  const trackPageView = useCallback(
    (path: string, title?: string) => service.trackPageView(path, title),
    [service],
  );

  const trackInteraction = useCallback(
    (category: string, action: string, label?: string, value?: number) =>
      service.trackInteraction(category, action, label, value),
    [service],
  );

  return {
    consent,
    isOptedIn: consent === 'granted',
    grantConsent,
    denyConsent,
    trackPageView,
    trackInteraction,
  };
}

export default TelemetryService;
