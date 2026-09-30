/**
 * FeatureFlagDebugPanel
 *
 * A floating overlay panel (bottom-right corner) that shows the resolved
 * state of every feature flag plus a lightweight analytics summary.
 *
 * The panel is only mounted when the `debug-panel` flag is itself enabled.
 * Use the settings page or the `?ff=debug-panel` query-param workaround to
 * bootstrap it.
 *
 * The trigger button is always visible once this component is rendered.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useFeatureFlags } from '../featureFlags/FeatureFlagContext';
import { FlagAnalyticsTracker, FlagAnalyticsSummary, FlagEvent } from '../featureFlags/flag-analytics';
import { FlagState } from '../featureFlags/feature-flag-service';
import styles from './FeatureFlagDebugPanel.module.css';

type Tab = 'flags' | 'analytics';

function scopeClass(scope: FlagState['scope']): string {
  if (scope === 'session') return styles.scopeSession;
  if (scope === 'user') return styles.scopeUser;
  return styles.scopeGlobal;
}

function eventClass(type: FlagEvent['type']): string {
  if (type === 'toggle') return styles.eventToggle;
  if (type === 'exposure') return styles.eventExposure;
  return styles.eventReset;
}

export function FeatureFlagDebugPanel(): React.JSX.Element {
  const { flags, refresh, resetAll } = useFeatureFlags();
  const tracker = FlagAnalyticsTracker.getInstance();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('flags');
  const [summary, setSummary] = useState<FlagAnalyticsSummary | null>(null);

  // Refresh analytics summary whenever panel opens or tab switches
  useEffect(() => {
    if (open && tab === 'analytics') {
      setSummary(tracker.getSummary());
    }
  }, [open, tab, tracker]);

  const handleClearAnalytics = useCallback(() => {
    tracker.clearEvents();
    setSummary(tracker.getSummary());
  }, [tracker]);

  const enabledFlags = flags.filter((f) => f.enabled);
  const overriddenFlags = flags.filter(
    (f) => f.scope === 'session' || f.scope === 'user'
  );

  return (
    <>
      {/* Floating trigger */}
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle feature flag debug panel"
        aria-expanded={open}
        title="Feature Flags Debug Panel"
      >
        🚩
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Feature flag debug panel">
          {/* Header */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              🚩 Feature Flags
              <span style={{ fontWeight: 400, opacity: 0.8 }}>
                &nbsp;({enabledFlags.length}/{flags.length} on)
              </span>
            </span>
            <div className={styles.panelActions}>
              <button
                className={styles.iconBtn}
                onClick={() => { refresh(); if (tab === 'analytics') setSummary(tracker.getSummary()); }}
                title="Refresh"
                aria-label="Refresh flag states"
              >
                ↺
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close debug panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'flags' ? styles.tabActive : ''}`}
              onClick={() => setTab('flags')}
              aria-selected={tab === 'flags'}
            >
              Flags
              {overriddenFlags.length > 0 && (
                <span style={{ marginLeft: 4, color: '#f59e0b' }}>({overriddenFlags.length} ↑)</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${tab === 'analytics' ? styles.tabActive : ''}`}
              onClick={() => setTab('analytics')}
              aria-selected={tab === 'analytics'}
            >
              Analytics
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {tab === 'flags' && (
              flags.length === 0 ? (
                <div className={styles.empty}>No flags registered.</div>
              ) : (
                flags.map((f) => (
                  <div
                    key={f.key}
                    className={`${styles.flagRow} ${f.enabled ? styles.flagRowEnabled : ''}`}
                  >
                    <span className={styles.flagKey} title={f.key}>{f.key}</span>
                    <span className={styles.flagStatus}>
                      <span className={`${styles.dot} ${f.enabled ? styles.dotOn : styles.dotOff}`} />
                      <span>{f.enabled ? 'ON' : 'OFF'}</span>
                      <span className={`${styles.scopePill} ${scopeClass(f.scope)}`}>
                        {f.scope}
                      </span>
                    </span>
                  </div>
                ))
              )
            )}

            {tab === 'analytics' && (
              summary ? (
                <div className={styles.analyticsSection}>
                  {/* Summary stats */}
                  <div className={styles.sectionHeading}>Summary</div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Total events</span>
                    <span className={styles.statValue}>{summary.totalEvents}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Exposures</span>
                    <span className={styles.statValue}>{summary.exposures}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Toggles</span>
                    <span className={styles.statValue}>{summary.toggles}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Resets</span>
                    <span className={styles.statValue}>{summary.resets}</span>
                  </div>

                  {/* Top flags */}
                  {summary.topFlags.length > 0 && (
                    <>
                      <div className={styles.sectionHeading}>Top Flags</div>
                      {summary.topFlags.slice(0, 5).map((f) => (
                        <div key={f.flagKey} className={styles.statRow}>
                          <span
                            className={styles.statLabel}
                            style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                          >
                            {f.flagKey}
                          </span>
                          <span className={styles.statValue}>
                            {f.exposureCount}× / {f.toggleCount}↑
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Recent events */}
                  {summary.recentEvents.length > 0 && (
                    <>
                      <div className={styles.sectionHeading}>Recent Events</div>
                      {summary.recentEvents.slice(0, 10).map((e) => (
                        <div key={e.id} className={styles.eventItem}>
                          <span className={`${styles.eventType} ${eventClass(e.type)}`}>
                            {e.type}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {e.flagKey}
                          </span>
                          {e.value !== undefined && (
                            <span style={{ marginLeft: 4 }}>
                              → {e.value ? 'ON' : 'OFF'}
                            </span>
                          )}
                          <div className={styles.eventMeta}>
                            {new Date(e.timestamp).toLocaleTimeString()} · {e.scope}
                            {e.userId ? ` · ${e.userId}` : ''}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {summary.totalEvents === 0 && (
                    <div className={styles.empty}>No analytics events yet.</div>
                  )}

                  {/* Clear analytics */}
                  <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={handleClearAnalytics}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #fca5a5',
                        borderRadius: 4,
                        background: 'transparent',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      Clear analytics
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.empty}>Loading analytics…</div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
