/**
 * Feature Flag Service
 *
 * Manages feature flags with three layers of precedence (highest → lowest):
 *   1. Session overrides  — stored in sessionStorage, cleared on tab close
 *   2. User overrides     — stored in localStorage keyed by userId
 *   3. Global defaults    — hardcoded flag registry in this file
 *
 * Usage:
 *   const svc = FeatureFlagService.getInstance();
 *   svc.isEnabled('new-api-explorer');
 *   svc.setUserFlag('new-api-explorer', true, 'user-42');
 *   svc.setSessionFlag('new-api-explorer', true);
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type FlagScope = 'global' | 'user' | 'session';

export interface FlagDefinition {
  /** Unique machine-readable key, kebab-case */
  key: string;
  /** Human-readable name shown in the settings UI */
  name: string;
  /** Short description of what the flag enables */
  description: string;
  /** Default enabled state when no override is present */
  defaultEnabled: boolean;
  /** Optional list of user IDs that have early access by default */
  allowlist?: string[];
  /** Whether the flag is still safe to expose in the debug panel */
  internal?: boolean;
}

export interface FlagState {
  key: string;
  enabled: boolean;
  /** Which layer resolved the final value */
  scope: FlagScope;
  /** ISO timestamp of the last change to this flag */
  lastModified: string;
}

export interface FlagOverride {
  enabled: boolean;
  lastModified: string;
}

// ─── Flag Registry ──────────────────────────────────────────────────────────

/**
 * Add new flags here. This is the single source of truth for all flags in the
 * ProxyPay portal. The settings UI and debug panel are driven by this list.
 */
export const FLAG_REGISTRY: FlagDefinition[] = [
  {
    key: 'new-api-explorer',
    name: 'New API Explorer',
    description: 'Enables the redesigned interactive API explorer with live request builder.',
    defaultEnabled: false,
  },
  {
    key: 'advanced-logs-dashboard',
    name: 'Advanced Logs Dashboard',
    description: 'Shows the enhanced logs dashboard with full-text search and export options.',
    defaultEnabled: true,
  },
  {
    key: 'performance-benchmarks',
    name: 'Performance Benchmarks',
    description: 'Exposes the performance benchmarks page in the navigation.',
    defaultEnabled: false,
  },
  {
    key: 'chaos-engineering',
    name: 'Chaos Engineering Panel',
    description: 'Shows the chaos engineering panel for testing API resilience scenarios.',
    defaultEnabled: false,
    internal: true,
  },
  {
    key: 'dependency-graph',
    name: 'Dependency Graph',
    description: 'Renders an interactive service dependency graph on the dependencies page.',
    defaultEnabled: true,
  },
  {
    key: 'migration-guide',
    name: 'Migration Guide',
    description: 'Surfaces the step-by-step API version migration guide.',
    defaultEnabled: true,
  },
  {
    key: 'rate-limit-dashboard',
    name: 'Rate Limit Dashboard',
    description: 'Displays real-time rate limit usage and quota visualisations.',
    defaultEnabled: false,
  },
  {
    key: 'debug-panel',
    name: 'Feature Flag Debug Panel',
    description: 'Shows the floating debug panel that lists all active feature flags.',
    defaultEnabled: false,
    internal: true,
  },
];

// ─── Storage keys ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  /** Global overrides stored in localStorage (no user context) */
  globalOverrides: 'proxypay-feature-flags-global',
  /** User overrides namespace — actual key is `{prefix}:{userId}` */
  userOverridesPrefix: 'proxypay-feature-flags-user',
  /** Session overrides key in sessionStorage */
  sessionOverrides: 'proxypay-feature-flags-session',
} as const;

// ─── Service ────────────────────────────────────────────────────────────────

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private registry: Map<string, FlagDefinition>;

  private constructor() {
    this.registry = new Map(FLAG_REGISTRY.map((f) => [f.key, f]));
  }

  /** Returns the singleton instance */
  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Check whether a flag is enabled for the given user in the current session.
   * Precedence: session > user > global > allowlist > default
   */
  isEnabled(key: string, userId?: string): boolean {
    return this.resolve(key, userId).enabled;
  }

  /**
   * Resolve the full FlagState for a key, including which scope determined
   * the final value.
   */
  resolve(key: string, userId?: string): FlagState {
    const definition = this.registry.get(key);
    if (!definition) {
      // Unknown flag — treat as disabled
      return { key, enabled: false, scope: 'global', lastModified: new Date().toISOString() };
    }

    // 1. Session override
    const session = this.getSessionOverrides();
    if (key in session) {
      return { key, enabled: session[key].enabled, scope: 'session', lastModified: session[key].lastModified };
    }

    // 2. User override
    if (userId) {
      const user = this.getUserOverrides(userId);
      if (key in user) {
        return { key, enabled: user[key].enabled, scope: 'user', lastModified: user[key].lastModified };
      }

      // 3. Allowlist check
      if (definition.allowlist?.includes(userId)) {
        return { key, enabled: true, scope: 'user', lastModified: new Date(0).toISOString() };
      }
    }

    // 4. Global override
    const global = this.getGlobalOverrides();
    if (key in global) {
      return { key, enabled: global[key].enabled, scope: 'global', lastModified: global[key].lastModified };
    }

    // 5. Default
    return {
      key,
      enabled: definition.defaultEnabled,
      scope: 'global',
      lastModified: new Date(0).toISOString(),
    };
  }

  /**
   * Returns the resolved state of every registered flag.
   */
  getAllFlags(userId?: string): FlagState[] {
    return Array.from(this.registry.keys()).map((key) => this.resolve(key, userId));
  }

  /** Full flag definition list (for UI rendering) */
  getRegistry(): FlagDefinition[] {
    return Array.from(this.registry.values());
  }

  // ── Setters ────────────────────────────────────────────────────────────

  /**
   * Write a per-session override (survives only until the tab is closed).
   */
  setSessionFlag(key: string, enabled: boolean): void {
    const overrides = this.getSessionOverrides();
    overrides[key] = { enabled, lastModified: new Date().toISOString() };
    this.saveSessionOverrides(overrides);
  }

  /**
   * Remove a session override for a key (falls back to user / global / default).
   */
  clearSessionFlag(key: string): void {
    const overrides = this.getSessionOverrides();
    delete overrides[key];
    this.saveSessionOverrides(overrides);
  }

  /**
   * Write a per-user persistent override.
   */
  setUserFlag(key: string, enabled: boolean, userId: string): void {
    const overrides = this.getUserOverrides(userId);
    overrides[key] = { enabled, lastModified: new Date().toISOString() };
    this.saveUserOverrides(userId, overrides);
  }

  /**
   * Remove a per-user persistent override.
   */
  clearUserFlag(key: string, userId: string): void {
    const overrides = this.getUserOverrides(userId);
    delete overrides[key];
    this.saveUserOverrides(userId, overrides);
  }

  /**
   * Write a global (all-users) persistent override.
   */
  setGlobalFlag(key: string, enabled: boolean): void {
    const overrides = this.getGlobalOverrides();
    overrides[key] = { enabled, lastModified: new Date().toISOString() };
    this.saveGlobalOverrides(overrides);
  }

  /**
   * Remove a global override.
   */
  clearGlobalFlag(key: string): void {
    const overrides = this.getGlobalOverrides();
    delete overrides[key];
    this.saveGlobalOverrides(overrides);
  }

  /**
   * Reset ALL overrides at every scope for a user (useful in tests / sign-out).
   */
  resetAll(userId?: string): void {
    this.saveGlobalOverrides({});
    this.saveSessionOverrides({});
    if (userId) {
      this.saveUserOverrides(userId, {});
    }
  }

  // ── Raw storage accessors ──────────────────────────────────────────────

  getSessionOverrides(): Record<string, FlagOverride> {
    return this.readStorage('session', STORAGE_KEYS.sessionOverrides);
  }

  getUserOverrides(userId: string): Record<string, FlagOverride> {
    return this.readStorage('local', `${STORAGE_KEYS.userOverridesPrefix}:${userId}`);
  }

  getGlobalOverrides(): Record<string, FlagOverride> {
    return this.readStorage('local', STORAGE_KEYS.globalOverrides);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private saveSessionOverrides(overrides: Record<string, FlagOverride>): void {
    this.writeStorage('session', STORAGE_KEYS.sessionOverrides, overrides);
  }

  private saveUserOverrides(userId: string, overrides: Record<string, FlagOverride>): void {
    this.writeStorage('local', `${STORAGE_KEYS.userOverridesPrefix}:${userId}`, overrides);
  }

  private saveGlobalOverrides(overrides: Record<string, FlagOverride>): void {
    this.writeStorage('local', STORAGE_KEYS.globalOverrides, overrides);
  }

  private readStorage(
    type: 'local' | 'session',
    key: string
  ): Record<string, FlagOverride> {
    try {
      const store = type === 'local' ? localStorage : sessionStorage;
      const raw = store.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, FlagOverride>;
      }
    } catch {
      // Corrupt data — silently ignore and return empty
    }
    return {};
  }

  private writeStorage(
    type: 'local' | 'session',
    key: string,
    value: Record<string, FlagOverride>
  ): void {
    try {
      const store = type === 'local' ? localStorage : sessionStorage;
      store.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[FeatureFlagService] Failed to write ${type}Storage[${key}]:`, error);
    }
  }
}
