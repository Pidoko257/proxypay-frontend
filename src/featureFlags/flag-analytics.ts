/**
 * Feature Flag Analytics
 *
 * Tracks feature flag exposure and toggle events. Persists events in
 * localStorage so they survive page reloads and can be reviewed in the debug
 * panel or sent to a backend analytics endpoint.
 *
 * Event types:
 *   - exposure  : flag was evaluated (isEnabled called) — recorded once per
 *                 session per flag to avoid flood
 *   - toggle    : a user or developer explicitly changed a flag
 *   - reset     : all overrides were cleared
 */

import type { FlagScope } from './feature-flag-service';

// ─── Types ─────────────────────────────────────────────────────────────────

export type FlagEventType = 'exposure' | 'toggle' | 'reset';

export interface FlagEvent {
  id: string;
  type: FlagEventType;
  flagKey: string;
  /** Value after the event (undefined for reset events) */
  value?: boolean;
  scope: FlagScope;
  userId?: string;
  /** ISO timestamp */
  timestamp: string;
  /** Page path at the time of the event */
  page?: string;
}

export interface FlagAnalyticsSummary {
  totalEvents: number;
  exposures: number;
  toggles: number;
  resets: number;
  /** Flags sorted by exposure count descending */
  topFlags: { flagKey: string; exposureCount: number; toggleCount: number }[];
  /** Most recent 20 events */
  recentEvents: FlagEvent[];
}

// ─── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'proxypay-feature-flag-analytics';
const EXPOSURE_DEDUPE_KEY = 'proxypay-feature-flag-exposures-session';
const MAX_EVENTS = 500;

// ─── Analytics tracker ──────────────────────────────────────────────────────

export class FlagAnalyticsTracker {
  private static instance: FlagAnalyticsTracker;

  private constructor() {}

  static getInstance(): FlagAnalyticsTracker {
    if (!FlagAnalyticsTracker.instance) {
      FlagAnalyticsTracker.instance = new FlagAnalyticsTracker();
    }
    return FlagAnalyticsTracker.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Record an exposure event (flag was evaluated).
   * Deduplicates within a single browser session — only the first evaluation
   * of each flag is recorded to prevent noise.
   */
  recordExposure(flagKey: string, value: boolean, scope: FlagScope, userId?: string): void {
    const dedupe = this.getSessionExposures();
    if (dedupe.has(flagKey)) return;

    dedupe.add(flagKey);
    this.saveSessionExposures(dedupe);

    this.appendEvent({
      type: 'exposure',
      flagKey,
      value,
      scope,
      userId,
    });
  }

  /**
   * Record that a flag was explicitly toggled.
   */
  recordToggle(
    flagKey: string,
    value: boolean,
    scope: FlagScope,
    userId?: string
  ): void {
    this.appendEvent({ type: 'toggle', flagKey, value, scope, userId });
  }

  /**
   * Record a full reset of all flag overrides.
   */
  recordReset(userId?: string): void {
    this.appendEvent({
      type: 'reset',
      flagKey: '*',
      scope: 'global',
      userId,
    });
  }

  /**
   * Returns all stored events.
   */
  getEvents(): FlagEvent[] {
    return this.loadEvents();
  }

  /**
   * Returns an aggregated summary of analytics data.
   */
  getSummary(): FlagAnalyticsSummary {
    const events = this.loadEvents();
    const exposures = events.filter((e) => e.type === 'exposure');
    const toggles = events.filter((e) => e.type === 'toggle');
    const resets = events.filter((e) => e.type === 'reset');

    // Aggregate per-flag counts
    const flagMap = new Map<string, { exposureCount: number; toggleCount: number }>();
    for (const e of events) {
      if (e.flagKey === '*') continue;
      if (!flagMap.has(e.flagKey)) {
        flagMap.set(e.flagKey, { exposureCount: 0, toggleCount: 0 });
      }
      const entry = flagMap.get(e.flagKey)!;
      if (e.type === 'exposure') entry.exposureCount++;
      if (e.type === 'toggle') entry.toggleCount++;
    }

    const topFlags = Array.from(flagMap.entries())
      .map(([flagKey, counts]) => ({ flagKey, ...counts }))
      .sort((a, b) => b.exposureCount - a.exposureCount);

    return {
      totalEvents: events.length,
      exposures: exposures.length,
      toggles: toggles.length,
      resets: resets.length,
      topFlags,
      recentEvents: events.slice(-20).reverse(),
    };
  }

  /**
   * Clear all stored analytics events (useful in tests).
   */
  clearEvents(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private appendEvent(
    partial: Omit<FlagEvent, 'id' | 'timestamp' | 'page'>
  ): void {
    const event: FlagEvent = {
      ...partial,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    };

    const events = this.loadEvents();
    events.push(event);

    // Trim to max size (keep newest)
    const trimmed = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[FlagAnalytics] Failed to persist event:', error);
    }
  }

  private loadEvents(): FlagEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private getSessionExposures(): Set<string> {
    try {
      const raw = sessionStorage.getItem(EXPOSURE_DEDUPE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  private saveSessionExposures(set: Set<string>): void {
    try {
      sessionStorage.setItem(EXPOSURE_DEDUPE_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
  }
}
