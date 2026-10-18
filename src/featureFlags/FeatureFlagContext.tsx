/**
 * Feature Flag React Context & Hooks
 *
 * Provides the FeatureFlagProvider that should wrap the app (or the relevant
 * subtree). Components consume flags through the useFeatureFlag hook.
 *
 * Example:
 *   // In a layout or page wrapper:
 *   <FeatureFlagProvider userId={currentUser?.id}>
 *     <App />
 *   </FeatureFlagProvider>
 *
 *   // In any child component:
 *   const { isEnabled, toggle } = useFeatureFlag('new-api-explorer');
 *   if (isEnabled) return <NewApiExplorer />;
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FeatureFlagService, FlagState, FlagDefinition, FlagScope } from './feature-flag-service';
import { FlagAnalyticsTracker } from './flag-analytics';

// ─── Context value type ─────────────────────────────────────────────────────

export interface FeatureFlagContextValue {
  /** Resolved state of every registered flag */
  flags: FlagState[];
  /** Full definition list from the registry */
  definitions: FlagDefinition[];
  /** Current user ID bound to this provider */
  userId: string | undefined;
  /** Check if a specific flag is enabled */
  isEnabled: (key: string) => boolean;
  /** Set a session-scoped override (clears on tab close) */
  setSessionFlag: (key: string, enabled: boolean) => void;
  /** Clear the session override for a flag */
  clearSessionFlag: (key: string) => void;
  /** Set a user-scoped persistent override */
  setUserFlag: (key: string, enabled: boolean) => void;
  /** Clear the user-scoped override for a flag */
  clearUserFlag: (key: string) => void;
  /** Set a global persistent override */
  setGlobalFlag: (key: string, enabled: boolean) => void;
  /** Clear the global override for a flag */
  clearGlobalFlag: (key: string) => void;
  /** Reset all overrides at every scope */
  resetAll: () => void;
  /** Force a re-evaluation of all flags (useful after external changes) */
  refresh: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export interface FeatureFlagProviderProps {
  children: React.ReactNode;
  /** Optional user ID — enables per-user flag overrides */
  userId?: string;
}

export function FeatureFlagProvider({ children, userId }: FeatureFlagProviderProps) {
  const svc = useMemo(() => FeatureFlagService.getInstance(), []);
  const tracker = useMemo(() => FlagAnalyticsTracker.getInstance(), []);

  // tick is incremented to trigger re-evaluation when flags change
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Resolved flag states — recomputed whenever tick or userId changes
  const flags = useMemo(() => svc.getAllFlags(userId), [svc, userId, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const definitions = useMemo(() => svc.getRegistry(), [svc]);

  const isEnabled = useCallback(
    (key: string) => {
      const state = svc.resolve(key, userId);
      // Record exposure lazily (will deduplicate within session)
      tracker.recordExposure(key, state.enabled, state.scope, userId);
      return state.enabled;
    },
    [svc, tracker, userId, tick] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setSessionFlag = useCallback(
    (key: string, enabled: boolean) => {
      svc.setSessionFlag(key, enabled);
      tracker.recordToggle(key, enabled, 'session', userId);
      refresh();
    },
    [svc, tracker, userId, refresh]
  );

  const clearSessionFlag = useCallback(
    (key: string) => {
      svc.clearSessionFlag(key);
      refresh();
    },
    [svc, refresh]
  );

  const setUserFlag = useCallback(
    (key: string, enabled: boolean) => {
      if (!userId) {
        console.warn('[FeatureFlags] setUserFlag called without a userId');
        return;
      }
      svc.setUserFlag(key, enabled, userId);
      tracker.recordToggle(key, enabled, 'user', userId);
      refresh();
    },
    [svc, tracker, userId, refresh]
  );

  const clearUserFlag = useCallback(
    (key: string) => {
      if (!userId) return;
      svc.clearUserFlag(key, userId);
      refresh();
    },
    [svc, userId, refresh]
  );

  const setGlobalFlag = useCallback(
    (key: string, enabled: boolean) => {
      svc.setGlobalFlag(key, enabled);
      tracker.recordToggle(key, enabled, 'global', userId);
      refresh();
    },
    [svc, tracker, userId, refresh]
  );

  const clearGlobalFlag = useCallback(
    (key: string) => {
      svc.clearGlobalFlag(key);
      refresh();
    },
    [svc, refresh]
  );

  const resetAll = useCallback(() => {
    svc.resetAll(userId);
    tracker.recordReset(userId);
    refresh();
  }, [svc, tracker, userId, refresh]);

  const value: FeatureFlagContextValue = useMemo(
    () => ({
      flags,
      definitions,
      userId,
      isEnabled,
      setSessionFlag,
      clearSessionFlag,
      setUserFlag,
      clearUserFlag,
      setGlobalFlag,
      clearGlobalFlag,
      resetAll,
      refresh,
    }),
    [
      flags,
      definitions,
      userId,
      isEnabled,
      setSessionFlag,
      clearSessionFlag,
      setUserFlag,
      clearUserFlag,
      setGlobalFlag,
      clearGlobalFlag,
      resetAll,
      refresh,
    ]
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Returns the full feature flag context.
 * Must be used inside a <FeatureFlagProvider>.
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used inside a <FeatureFlagProvider>');
  }
  return ctx;
}

/**
 * Convenience hook for a single flag.
 *
 * @returns `{ isEnabled, state, setSession, setUser, setGlobal, clear }`
 *
 * Example:
 *   const { isEnabled } = useFeatureFlag('new-api-explorer');
 */
export function useFeatureFlag(key: string) {
  const ctx = useFeatureFlags();

  const state = useMemo(
    () => ctx.flags.find((f) => f.key === key) ?? null,
    [ctx.flags, key]
  );

  const isEnabled = ctx.isEnabled(key);

  const setSession = useCallback(
    (enabled: boolean) => ctx.setSessionFlag(key, enabled),
    [ctx, key]
  );

  const setUser = useCallback(
    (enabled: boolean) => ctx.setUserFlag(key, enabled),
    [ctx, key]
  );

  const setGlobal = useCallback(
    (enabled: boolean) => ctx.setGlobalFlag(key, enabled),
    [ctx, key]
  );

  const clearSession = useCallback(() => ctx.clearSessionFlag(key), [ctx, key]);
  const clearUser = useCallback(() => ctx.clearUserFlag(key), [ctx, key]);
  const clearGlobal = useCallback(() => ctx.clearGlobalFlag(key), [ctx, key]);

  return { isEnabled, state, setSession, setUser, setGlobal, clearSession, clearUser, clearGlobal };
}
