/**
 * FeatureFlagSettings
 *
 * A full-page settings UI that lets developers (or any user) inspect and
 * override feature flags per scope (session / user / global).
 *
 * Rendered by src/pages/settings.tsx.
 */

import React, { useState, useCallback } from 'react';
import { useFeatureFlags } from '../featureFlags/FeatureFlagContext';
import { FlagScope, FlagState } from '../featureFlags/feature-flag-service';
import styles from './FeatureFlagSettings.module.css';

type ScopeFilter = 'all' | FlagScope;

export function FeatureFlagSettings(): React.JSX.Element {
  const {
    flags,
    definitions,
    userId: contextUserId,
    isEnabled,
    setSessionFlag,
    clearSessionFlag,
    setUserFlag,
    clearUserFlag,
    setGlobalFlag,
    clearGlobalFlag,
    resetAll,
  } = useFeatureFlags();

  const [localUserId, setLocalUserId] = useState(contextUserId ?? '');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [confirmReset, setConfirmReset] = useState(false);

  // The user ID to apply user-scoped overrides against
  const effectiveUserId = localUserId.trim() || contextUserId;

  const scopeFilters: { label: string; value: ScopeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Session', value: 'session' },
    { label: 'User', value: 'user' },
    { label: 'Global', value: 'global' },
  ];

  const visibleFlags = scopeFilter === 'all'
    ? flags
    : flags.filter((f) => f.scope === scopeFilter);

  const handleToggle = useCallback(
    (key: string, currentEnabled: boolean) => {
      const newValue = !currentEnabled;
      // Default scope: session (safest — clears on tab close)
      setSessionFlag(key, newValue);
    },
    [setSessionFlag]
  );

  const handleClearOverride = useCallback(
    (flag: FlagState) => {
      if (flag.scope === 'session') {
        clearSessionFlag(flag.key);
      } else if (flag.scope === 'user' && effectiveUserId) {
        clearUserFlag(flag.key);
      } else if (flag.scope === 'global') {
        clearGlobalFlag(flag.key);
      }
    },
    [clearSessionFlag, clearUserFlag, clearGlobalFlag, effectiveUserId]
  );

  const handleSetScope = useCallback(
    (key: string, enabled: boolean, scope: FlagScope) => {
      if (scope === 'session') setSessionFlag(key, enabled);
      else if (scope === 'user') {
        if (!effectiveUserId) {
          alert('Enter a User ID above before setting a user-scoped override.');
          return;
        }
        setUserFlag(key, enabled);
      } else {
        setGlobalFlag(key, enabled);
      }
    },
    [setSessionFlag, setUserFlag, setGlobalFlag, effectiveUserId]
  );

  const scopeBadgeClass = (scope: FlagScope) => {
    if (scope === 'session') return styles.badgeSession;
    if (scope === 'user') return styles.badgeUser;
    return styles.badgeGlobal;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Feature Flags</h1>
        <p>
          Toggle feature flags per scope. <strong>Session</strong> overrides clear when the tab
          closes. <strong>User</strong> overrides are tied to a user ID. <strong>Global</strong>{' '}
          overrides affect all users without an explicit override.
        </p>
      </div>

      {/* User ID input */}
      <div className={styles.userBar}>
        <label htmlFor="ff-user-id">User ID</label>
        <input
          id="ff-user-id"
          type="text"
          className={styles.userInput}
          placeholder="Enter a user ID to set per-user overrides…"
          value={localUserId}
          onChange={(e) => setLocalUserId(e.target.value)}
        />
        <span className={styles.userHint}>
          {effectiveUserId ? `Active: ${effectiveUserId}` : 'No user ID — user-scoped changes will not be saved'}
        </span>
      </div>

      {/* Scope filter */}
      <div className={styles.scopeBar} role="group" aria-label="Filter flags by scope">
        {scopeFilters.map(({ label, value }) => (
          <button
            key={value}
            className={`${styles.scopeBtn} ${scopeFilter === value ? styles.scopeBtnActive : ''}`}
            onClick={() => setScopeFilter(value)}
            aria-pressed={scopeFilter === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Flag list */}
      <ul className={styles.flagList} aria-label="Feature flags">
        {visibleFlags.map((flagState) => {
          const def = definitions.find((d) => d.key === flagState.key);
          const currentEnabled = isEnabled(flagState.key);
          const isOverridden = flagState.scope !== 'global' || currentEnabled !== def?.defaultEnabled;

          return (
            <li key={flagState.key} className={styles.flagCard}>
              <div className={styles.flagInfo}>
                <div className={styles.flagName}>{def?.name ?? flagState.key}</div>
                <div className={styles.flagKey}>{flagState.key}</div>
                <div className={styles.flagDescription}>{def?.description}</div>
                <div className={styles.flagBadges}>
                  <span className={`${styles.badge} ${scopeBadgeClass(flagState.scope)}`}>
                    {flagState.scope}
                  </span>
                  {def?.internal && (
                    <span className={`${styles.badge} ${styles.badgeInternal}`}>internal</span>
                  )}
                  {isOverridden && flagState.scope !== 'global' && (
                    <span className={`${styles.badge} ${styles.badgeSession}`}>overridden</span>
                  )}
                </div>
              </div>

              <div className={styles.toggleArea}>
                <label className={styles.toggle} aria-label={`Toggle ${def?.name ?? flagState.key}`}>
                  <input
                    type="checkbox"
                    checked={currentEnabled}
                    onChange={() => handleToggle(flagState.key, currentEnabled)}
                  />
                  <span className={styles.toggleSlider} />
                </label>

                <span className={styles.scopeLabel}>
                  via {flagState.scope}
                </span>

                {/* Scope selectors */}
                <select
                  aria-label={`Set scope for ${flagState.key}`}
                  style={{ fontSize: '0.6875rem', padding: '0.15rem 0.35rem', borderRadius: 4 }}
                  defaultValue=""
                  onChange={(e) => {
                    const [scopeVal, enabledStr] = e.target.value.split(':');
                    if (!scopeVal) return;
                    handleSetScope(flagState.key, enabledStr === 'true', scopeVal as FlagScope);
                    e.target.value = '';
                  }}
                >
                  <option value="">Set scope…</option>
                  <option value="session:true">Session ON</option>
                  <option value="session:false">Session OFF</option>
                  <option value="user:true">User ON</option>
                  <option value="user:false">User OFF</option>
                  <option value="global:true">Global ON</option>
                  <option value="global:false">Global OFF</option>
                </select>

                {(flagState.scope === 'session' || flagState.scope === 'user') && (
                  <button
                    className={styles.clearBtn}
                    onClick={() => handleClearOverride(flagState)}
                    aria-label={`Clear ${flagState.scope} override for ${flagState.key}`}
                  >
                    Clear override
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Reset all */}
      <div className={styles.resetBar}>
        {confirmReset ? (
          <>
            <span style={{ fontSize: '0.875rem', color: '#dc2626', marginRight: '0.75rem' }}>
              This will clear all overrides at every scope. Are you sure?
            </span>
            <button
              className={styles.resetAllBtn}
              onClick={() => { resetAll(); setConfirmReset(false); }}
            >
              Yes, reset all
            </button>
            <button
              className={styles.clearBtn}
              style={{ marginLeft: '0.5rem' }}
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className={styles.resetAllBtn}
            onClick={() => setConfirmReset(true)}
          >
            Reset all overrides
          </button>
        )}
      </div>
    </div>
  );
}
