import React, { useState } from 'react';
import { useApiCache } from '../context/ApiCacheContext';
import styles from './ApiCacheDebugPanel.module.css';

type Tab = 'entries' | 'stats' | 'actions';

export function ApiCacheDebugPanel(): React.JSX.Element {
  const { stats, invalidateCache, invalidateEndpoint, clearCache, refreshStats } = useApiCache();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('entries');
  const [endpointInput, setEndpointInput] = useState('');

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTtlRemaining = (timestamp: number, ttl: number): string => {
    const remaining = ttl - (Date.now() - timestamp);
    if (remaining <= 0) return 'Expired';
    const seconds = Math.floor(remaining / 1000);
    if (seconds < 60) return `${seconds}s left`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s left`;
  };

  const handleInvalidateEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpointInput.trim()) return;
    invalidateEndpoint(endpointInput.trim());
    setEndpointInput('');
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle API cache debug panel"
        aria-expanded={open}
        title="API Cache Debug Panel"
      >
        ⚡
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel} role="dialog" aria-label="API cache debug panel">
          {/* Header */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              ⚡ API Cache
              <span style={{ fontWeight: 400, opacity: 0.8 }}>
                &nbsp;({stats.totalEntries} entries, {stats.hitRate}% hit)
              </span>
            </span>
            <div className={styles.panelActions}>
              <button
                className={styles.iconBtn}
                onClick={refreshStats}
                title="Refresh"
                aria-label="Refresh cache stats"
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
              className={`${styles.tab} ${tab === 'entries' ? styles.tabActive : ''}`}
              onClick={() => setTab('entries')}
              aria-selected={tab === 'entries'}
            >
              Entries ({stats.totalEntries})
            </button>
            <button
              className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`}
              onClick={() => setTab('stats')}
              aria-selected={tab === 'stats'}
            >
              Stats
            </button>
            <button
              className={`${styles.tab} ${tab === 'actions' ? styles.tabActive : ''}`}
              onClick={() => setTab('actions')}
              aria-selected={tab === 'actions'}
            >
              Actions
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {tab === 'entries' && (
              stats.entries.length === 0 ? (
                <div className={styles.empty}>No cached API responses.</div>
              ) : (
                stats.entries.map((entry) => (
                  <div key={entry.key} className={styles.entryRow}>
                    <div className={styles.entryMeta}>
                      <span className={styles.methodBadge}>{entry.method || 'GET'}</span>
                      <span className={styles.entryEndpoint} title={entry.endpoint}>{entry.endpoint}</span>
                    </div>
                    <div className={styles.entryDetails}>
                      <span>Hits: {entry.hitCount}</span>
                      <span>{formatTtlRemaining(entry.timestamp, entry.ttl)}</span>
                      <button
                        className={styles.invalidateBtn}
                        onClick={() => invalidateCache(entry.key)}
                        title="Invalidate entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {tab === 'stats' && (
              <div className={styles.analyticsSection}>
                <div className={styles.sectionHeading}>Performance</div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Total entries</span>
                  <span className={styles.statValue}>{stats.totalEntries}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Cache hits</span>
                  <span className={styles.statValue}>{stats.hits}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Cache misses</span>
                  <span className={styles.statValue}>{stats.misses}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Hit rate</span>
                  <span className={styles.statValue}>{stats.hitRate}%</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Storage size</span>
                  <span className={styles.statValue}>{formatBytes(stats.storageSizeBytes)}</span>
                </div>
              </div>
            )}

            {tab === 'actions' && (
              <div className={styles.analyticsSection}>
                <div className={styles.sectionHeading}>Cache Actions</div>
                <div style={{ marginBottom: '1rem' }}>
                  <form onSubmit={handleInvalidateEndpoint} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Endpoint pattern (e.g. /transactions)"
                      value={endpointInput}
                      onChange={(e) => setEndpointInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        border: '1px solid var(--ifm-color-emphasis-300, #d1d5db)',
                        borderRadius: 4,
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.35rem 0.6rem',
                        background: 'var(--ifm-color-primary, #2e8555)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Invalidate
                    </button>
                  </form>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={clearCache}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      border: '1px solid #fca5a5',
                      borderRadius: 4,
                      background: 'transparent',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    Clear all cache
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
export default ApiCacheDebugPanel;
