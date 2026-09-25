/**
 * Tests for the Feature Flag System
 *
 * Tests the FeatureFlagService and FlagAnalyticsTracker logic inline,
 * following the same self-contained pattern used throughout this codebase
 * (no module imports — logic is replicated from source files so the tests
 * run with ts-node in a plain Node environment).
 *
 * Runs with:   npx ts-node --transpile-only src/featureFlags/__tests__/feature-flags.test.ts
 */

// ─── Mock storage ──────────────────────────────────────────────────────────

class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// ─── Assertion helpers ─────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
  }
}

function assertNotNull<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(`Assertion failed: ${message} — got ${value}`);
  return value;
}

function assertArrayLength(arr: any[], len: number, message: string): void {
  if (!Array.isArray(arr) || arr.length !== len) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected length: ${len}\n  Actual: ${arr?.length}`
    );
  }
}

// ─── Inline types (mirrored from feature-flag-service.ts) ─────────────────

type FlagScope = 'global' | 'user' | 'session';

interface FlagDefinition {
  key: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  allowlist?: string[];
  internal?: boolean;
}

interface FlagOverride {
  enabled: boolean;
  lastModified: string;
}

interface FlagState {
  key: string;
  enabled: boolean;
  scope: FlagScope;
  lastModified: string;
}

// ─── Inline storage constants ───────────────────────────────────────────────

const STORAGE_KEYS_FF = {
  globalOverrides: 'proxypay-feature-flags-global',
  userOverridesPrefix: 'proxypay-feature-flags-user',
  sessionOverrides: 'proxypay-feature-flags-session',
};

const ANALYTICS_STORAGE_KEY = 'proxypay-feature-flag-analytics';
const EXPOSURE_DEDUPE_KEY = 'proxypay-feature-flag-exposures-session';
const MAX_ANALYTICS_EVENTS = 500;

// ─── Inline flag registry (subset for tests) ──────────────────────────────

const TEST_REGISTRY: FlagDefinition[] = [
  { key: 'new-api-explorer', name: 'New API Explorer', description: 'New explorer.', defaultEnabled: false },
  { key: 'advanced-logs-dashboard', name: 'Advanced Logs', description: 'Enhanced logs.', defaultEnabled: true },
  { key: 'performance-benchmarks', name: 'Perf Benchmarks', description: 'Benchmarks.', defaultEnabled: false },
  { key: 'rate-limit-dashboard', name: 'Rate Limits', description: 'Rate limits.', defaultEnabled: false },
  { key: 'dependency-graph', name: 'Dependency Graph', description: 'Dep graph.', defaultEnabled: true },
  { key: 'migration-guide', name: 'Migration Guide', description: 'Migration.', defaultEnabled: true },
  { key: 'chaos-engineering', name: 'Chaos Engineering', description: 'Chaos.', defaultEnabled: false, internal: true },
  { key: 'debug-panel', name: 'Debug Panel', description: 'Debug panel.', defaultEnabled: false, internal: true },
];

// ─── Minimal FeatureFlagService implementation for tests ──────────────────

class TestFeatureFlagService {
  private registry: Map<string, FlagDefinition>;
  private local: MockStorage;
  private session: MockStorage;

  constructor(local: MockStorage, session: MockStorage) {
    this.registry = new Map(TEST_REGISTRY.map((f) => [f.key, f]));
    this.local = local;
    this.session = session;
  }

  resolve(key: string, userId?: string): FlagState {
    const definition = this.registry.get(key);
    if (!definition) {
      return { key, enabled: false, scope: 'global', lastModified: new Date().toISOString() };
    }

    // 1. Session
    const session = this.readStorage(this.session, STORAGE_KEYS_FF.sessionOverrides);
    if (key in session) {
      return { key, enabled: session[key].enabled, scope: 'session', lastModified: session[key].lastModified };
    }

    // 2. User override
    if (userId) {
      const user = this.readStorage(this.local, `${STORAGE_KEYS_FF.userOverridesPrefix}:${userId}`);
      if (key in user) {
        return { key, enabled: user[key].enabled, scope: 'user', lastModified: user[key].lastModified };
      }
      // 3. Allowlist
      if (definition.allowlist?.includes(userId)) {
        return { key, enabled: true, scope: 'user', lastModified: new Date(0).toISOString() };
      }
    }

    // 4. Global override
    const global = this.readStorage(this.local, STORAGE_KEYS_FF.globalOverrides);
    if (key in global) {
      return { key, enabled: global[key].enabled, scope: 'global', lastModified: global[key].lastModified };
    }

    // 5. Default
    return { key, enabled: definition.defaultEnabled, scope: 'global', lastModified: new Date(0).toISOString() };
  }

  isEnabled(key: string, userId?: string): boolean {
    return this.resolve(key, userId).enabled;
  }

  getAllFlags(userId?: string): FlagState[] {
    return Array.from(this.registry.keys()).map((k) => this.resolve(k, userId));
  }

  setSessionFlag(key: string, enabled: boolean): void {
    const overrides = this.readStorage(this.session, STORAGE_KEYS_FF.sessionOverrides);
    overrides[key] = { enabled, lastModified: new Date().toISOString() };
    this.writeStorage(this.session, STORAGE_KEYS_FF.sessionOverrides, overrides);
  }

  clearSessionFlag(key: string): void {
    const overrides = this.readStorage(this.session, STORAGE_KEYS_FF.sessionOverrides);
    delete overrides[key];
    this.writeStorage(this.session, STORAGE_KEYS_FF.sessionOverrides, overrides);
  }

  setUserFlag(key: string, enabled: boolean, userId: string): void {
    const storageKey = `${STORAGE_KEYS_FF.userOverridesPrefix}:${userId}`;
    const overrides = this.readStorage(this.local, storageKey);
    overrides[key] = { enabled, lastModified: new Date().toISOString() };
    this.writeStorage(this.local, storageKey, overrides);
  }

  clearUserFlag(key: string, userId: string): void {
    const storageKey = `${STORAGE_KEYS_FF.userOverridesPrefix}:${userId}`;
    const overrides = this.readStorage(this.local, storageKey);
    delete overrides[key];
    this.writeStorage(this.local, storageKey, overrides);
  }

  setGlobalFlag(key: string, enabled: boolean): void {
    const overrides = this.readStorage(this.local, STORAGE_KEYS_FF.globalOverrides);
    overrides[key] = { enabled, lastModified: new Date().toISOString() };
    this.writeStorage(this.local, STORAGE_KEYS_FF.globalOverrides, overrides);
  }

  clearGlobalFlag(key: string): void {
    const overrides = this.readStorage(this.local, STORAGE_KEYS_FF.globalOverrides);
    delete overrides[key];
    this.writeStorage(this.local, STORAGE_KEYS_FF.globalOverrides, overrides);
  }

  resetAll(userId?: string): void {
    this.writeStorage(this.local, STORAGE_KEYS_FF.globalOverrides, {});
    this.writeStorage(this.session, STORAGE_KEYS_FF.sessionOverrides, {});
    if (userId) {
      this.writeStorage(this.local, `${STORAGE_KEYS_FF.userOverridesPrefix}:${userId}`, {});
    }
  }

  getRegistry(): FlagDefinition[] {
    return Array.from(this.registry.values());
  }

  addToAllowlist(key: string, userId: string): void {
    const def = this.registry.get(key);
    if (def) {
      def.allowlist = [...(def.allowlist ?? []), userId];
    }
  }

  removeFromAllowlist(key: string, userId: string): void {
    const def = this.registry.get(key);
    if (def) {
      def.allowlist = (def.allowlist ?? []).filter((u) => u !== userId);
    }
  }

  private readStorage(storage: MockStorage, key: string): Record<string, FlagOverride> {
    try {
      const raw = storage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
    return {};
  }

  private writeStorage(storage: MockStorage, key: string, value: Record<string, FlagOverride>): void {
    storage.setItem(key, JSON.stringify(value));
  }
}

// ─── Minimal FlagAnalyticsTracker for tests ───────────────────────────────

type FlagEventType = 'exposure' | 'toggle' | 'reset';

interface FlagEvent {
  id: string;
  type: FlagEventType;
  flagKey: string;
  value?: boolean;
  scope: FlagScope;
  userId?: string;
  timestamp: string;
}

class TestFlagAnalyticsTracker {
  private local: MockStorage;
  private session: MockStorage;

  constructor(local: MockStorage, session: MockStorage) {
    this.local = local;
    this.session = session;
  }

  recordExposure(flagKey: string, value: boolean, scope: FlagScope, userId?: string): void {
    const dedupe = this.getSessionExposures();
    if (dedupe.has(flagKey)) return;
    dedupe.add(flagKey);
    this.saveSessionExposures(dedupe);
    this.appendEvent({ type: 'exposure', flagKey, value, scope, userId });
  }

  recordToggle(flagKey: string, value: boolean, scope: FlagScope, userId?: string): void {
    this.appendEvent({ type: 'toggle', flagKey, value, scope, userId });
  }

  recordReset(userId?: string): void {
    this.appendEvent({ type: 'reset', flagKey: '*', scope: 'global', userId });
  }

  getEvents(): FlagEvent[] {
    try {
      const raw = this.local.getItem(ANALYTICS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  clearEvents(): void {
    this.local.removeItem(ANALYTICS_STORAGE_KEY);
  }

  getSummary() {
    const events = this.getEvents();
    const exposures = events.filter((e) => e.type === 'exposure');
    const toggles = events.filter((e) => e.type === 'toggle');
    const resets = events.filter((e) => e.type === 'reset');

    const flagMap = new Map<string, { exposureCount: number; toggleCount: number }>();
    for (const e of events) {
      if (e.flagKey === '*') continue;
      if (!flagMap.has(e.flagKey)) flagMap.set(e.flagKey, { exposureCount: 0, toggleCount: 0 });
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

  private appendEvent(partial: Omit<FlagEvent, 'id' | 'timestamp'>): void {
    const event: FlagEvent = {
      ...partial,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    const events = this.getEvents();
    events.push(event);
    const trimmed = events.length > MAX_ANALYTICS_EVENTS ? events.slice(events.length - MAX_ANALYTICS_EVENTS) : events;
    this.local.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed));
  }

  private getSessionExposures(): Set<string> {
    try {
      const raw = this.session.getItem(EXPOSURE_DEDUPE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch { return new Set(); }
  }

  private saveSessionExposures(set: Set<string>): void {
    this.session.setItem(EXPOSURE_DEDUPE_KEY, JSON.stringify(Array.from(set)));
  }
}

// ─── Test factory ──────────────────────────────────────────────────────────

function makeFixture() {
  const local = new MockStorage();
  const session = new MockStorage();
  const svc = new TestFeatureFlagService(local, session);
  const tracker = new TestFlagAnalyticsTracker(local, session);
  return { local, session, svc, tracker };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

const tests: Record<string, () => void> = {};

// ── FeatureFlagService ─────────────────────────────────────────────────────

tests['service: returns default value for a known default-true flag'] = () => {
  const { svc } = makeFixture();
  const state = svc.resolve('advanced-logs-dashboard');
  assertEqual(state.enabled, true, 'advanced-logs-dashboard should default to true');
  assertEqual(state.scope, 'global', 'scope should be global when no override exists');
};

tests['service: returns disabled for a flag with defaultEnabled: false'] = () => {
  const { svc } = makeFixture();
  const state = svc.resolve('new-api-explorer');
  assertEqual(state.enabled, false, 'new-api-explorer should default to false');
};

tests['service: returns disabled and global scope for unknown flag key'] = () => {
  const { svc } = makeFixture();
  const state = svc.resolve('non-existent-flag-xyz');
  assertEqual(state.enabled, false, 'unknown flag should be disabled');
  assertEqual(state.scope, 'global', 'unknown flag scope should be global');
};

tests['service: session override enables a default-disabled flag'] = () => {
  const { svc } = makeFixture();
  svc.setSessionFlag('new-api-explorer', true);
  const state = svc.resolve('new-api-explorer');
  assertEqual(state.enabled, true, 'session override should enable the flag');
  assertEqual(state.scope, 'session', 'scope should be session');
};

tests['service: session override can disable a default-enabled flag'] = () => {
  const { svc } = makeFixture();
  svc.setSessionFlag('advanced-logs-dashboard', false);
  const state = svc.resolve('advanced-logs-dashboard');
  assertEqual(state.enabled, false, 'session override should disable the flag');
  assertEqual(state.scope, 'session', 'scope should be session');
};

tests['service: user override supersedes default'] = () => {
  const { svc } = makeFixture();
  svc.setUserFlag('new-api-explorer', true, 'user-99');
  const state = svc.resolve('new-api-explorer', 'user-99');
  assertEqual(state.enabled, true, 'user override should enable the flag');
  assertEqual(state.scope, 'user', 'scope should be user');
};

tests['service: session override takes precedence over user override'] = () => {
  const { svc } = makeFixture();
  svc.setUserFlag('new-api-explorer', true, 'user-42');   // user: ON
  svc.setSessionFlag('new-api-explorer', false);            // session: OFF

  const state = svc.resolve('new-api-explorer', 'user-42');
  assertEqual(state.enabled, false, 'session override should win over user override');
  assertEqual(state.scope, 'session', 'scope should be session');
};

tests['service: global override supersedes default when no session/user override exists'] = () => {
  const { svc } = makeFixture();
  svc.setGlobalFlag('new-api-explorer', true);
  const state = svc.resolve('new-api-explorer');
  assertEqual(state.enabled, true, 'global override should enable the flag');
  assertEqual(state.scope, 'global', 'scope should be global');
};

tests['service: user override supersedes global override'] = () => {
  const { svc } = makeFixture();
  svc.setGlobalFlag('new-api-explorer', true);         // global: ON
  svc.setUserFlag('new-api-explorer', false, 'user-55'); // user: OFF

  const state = svc.resolve('new-api-explorer', 'user-55');
  assertEqual(state.enabled, false, 'user override should win over global override');
  assertEqual(state.scope, 'user', 'scope should be user');
};

tests['service: clearing session override reverts to default'] = () => {
  const { svc } = makeFixture();
  svc.setSessionFlag('new-api-explorer', true);
  svc.clearSessionFlag('new-api-explorer');

  const state = svc.resolve('new-api-explorer');
  assertEqual(state.enabled, false, 'after clearing session, should revert to default (false)');
  assertEqual(state.scope, 'global', 'scope should be global after clear');
};

tests['service: clearing user override reverts to global / default'] = () => {
  const { svc } = makeFixture();
  svc.setUserFlag('new-api-explorer', true, 'user-77');
  svc.clearUserFlag('new-api-explorer', 'user-77');

  const state = svc.resolve('new-api-explorer', 'user-77');
  assertEqual(state.enabled, false, 'after clearing user override, should revert to default');
};

tests['service: resetAll clears session, user, and global overrides'] = () => {
  const { svc } = makeFixture();
  svc.setSessionFlag('new-api-explorer', true);
  svc.setUserFlag('performance-benchmarks', true, 'user-11');
  svc.setGlobalFlag('rate-limit-dashboard', true);

  svc.resetAll('user-11');

  assertEqual(svc.resolve('new-api-explorer').enabled, false, 'session flag should be cleared');
  assertEqual(svc.resolve('performance-benchmarks', 'user-11').enabled, false, 'user flag should be cleared');
  assertEqual(svc.resolve('rate-limit-dashboard').enabled, false, 'global flag should be cleared');
};

tests['service: allowlist enables flag for listed users without explicit override'] = () => {
  const { svc } = makeFixture();
  svc.addToAllowlist('new-api-explorer', 'beta-user-1');

  const state = svc.resolve('new-api-explorer', 'beta-user-1');
  assertEqual(state.enabled, true, 'allowlisted user should have the flag enabled');
  assertEqual(state.scope, 'user', 'scope should be user for allowlist resolution');

  const other = svc.resolve('new-api-explorer', 'regular-user');
  assertEqual(other.enabled, false, 'non-allowlisted user should get the default');
};

tests['service: session override takes precedence over allowlist'] = () => {
  const { svc } = makeFixture();
  svc.addToAllowlist('new-api-explorer', 'beta-user-2');
  svc.setSessionFlag('new-api-explorer', false); // session explicitly OFF

  const state = svc.resolve('new-api-explorer', 'beta-user-2');
  assertEqual(state.enabled, false, 'session OFF should override allowlist');
  assertEqual(state.scope, 'session', 'scope should be session');
};

tests['service: getAllFlags returns one state per registered flag'] = () => {
  const { svc } = makeFixture();
  const all = svc.getAllFlags();
  assertArrayLength(all, TEST_REGISTRY.length, 'getAllFlags should return all registered flags');
};

tests['service: getAllFlags reflects overrides in the returned states'] = () => {
  const { svc } = makeFixture();
  svc.setSessionFlag('new-api-explorer', true);

  const all = svc.getAllFlags();
  const flag = all.find((f) => f.key === 'new-api-explorer');
  assertNotNull(flag, 'flag should exist in getAllFlags result');
  assertEqual(flag!.enabled, true, 'getAllFlags should reflect session override');
  assertEqual(flag!.scope, 'session', 'scope should be session');
};

tests['service: overrides persist across service re-creation (storage survives)'] = () => {
  const local = new MockStorage();
  const session = new MockStorage();

  const svc1 = new TestFeatureFlagService(local, session);
  svc1.setGlobalFlag('new-api-explorer', true);

  // Simulate page reload: create a new service instance using the same storage
  const svc2 = new TestFeatureFlagService(local, session);
  const state = svc2.resolve('new-api-explorer');
  assertEqual(state.enabled, true, 'global override should survive re-instantiation');
};

tests['service: user overrides for different users are independent'] = () => {
  const { svc } = makeFixture();
  svc.setUserFlag('new-api-explorer', true, 'user-A');
  svc.setUserFlag('new-api-explorer', false, 'user-B');

  assertEqual(svc.isEnabled('new-api-explorer', 'user-A'), true, 'user-A should have flag ON');
  assertEqual(svc.isEnabled('new-api-explorer', 'user-B'), false, 'user-B should have flag OFF');
};

tests['service: session storage does not bleed between independent mock sessions'] = () => {
  const { svc: svc1 } = makeFixture(); // independent storage
  const { svc: svc2 } = makeFixture();

  svc1.setSessionFlag('new-api-explorer', true);

  assertEqual(svc2.isEnabled('new-api-explorer'), false, 'separate session should not see other session overrides');
};

// ── FlagAnalyticsTracker ────────────────────────────────────────────────────

tests['analytics: records exposure event'] = () => {
  const { tracker } = makeFixture();

  tracker.recordExposure('new-api-explorer', false, 'global');
  const events = tracker.getEvents();

  assertArrayLength(events, 1, 'should have 1 event');
  assertEqual(events[0].type, 'exposure', 'event type should be exposure');
  assertEqual(events[0].flagKey, 'new-api-explorer', 'flagKey should match');
  assertEqual(events[0].value, false, 'value should be false');
};

tests['analytics: deduplicates exposures within a session'] = () => {
  const { tracker } = makeFixture();

  tracker.recordExposure('new-api-explorer', false, 'global');
  tracker.recordExposure('new-api-explorer', false, 'global'); // duplicate

  const events = tracker.getEvents();
  assertArrayLength(events, 1, 'should only record 1 exposure per flag per session');
};

tests['analytics: exposures for different flags are not deduplicated against each other'] = () => {
  const { tracker } = makeFixture();

  tracker.recordExposure('flag-a', true, 'global');
  tracker.recordExposure('flag-b', false, 'global');

  const events = tracker.getEvents();
  assertArrayLength(events, 2, 'different flags should each record an exposure');
};

tests['analytics: records toggle event with all fields'] = () => {
  const { tracker } = makeFixture();

  tracker.recordToggle('new-api-explorer', true, 'session', 'user-1');
  const events = tracker.getEvents();

  assertArrayLength(events, 1, 'should have 1 event');
  assertEqual(events[0].type, 'toggle', 'event type should be toggle');
  assertEqual(events[0].value, true, 'value should be true');
  assertEqual(events[0].scope, 'session', 'scope should be session');
  assertEqual(events[0].userId, 'user-1', 'userId should be recorded');
};

tests['analytics: records reset event with wildcard flagKey'] = () => {
  const { tracker } = makeFixture();

  tracker.recordReset('user-7');
  const events = tracker.getEvents();

  assertArrayLength(events, 1, 'should have 1 event');
  assertEqual(events[0].type, 'reset', 'event type should be reset');
  assertEqual(events[0].flagKey, '*', 'flagKey should be * for reset');
  assertEqual(events[0].userId, 'user-7', 'userId should be recorded on reset');
};

tests['analytics: getSummary aggregates counts correctly'] = () => {
  const { tracker } = makeFixture();

  tracker.recordExposure('flag-a', true, 'global');
  tracker.recordToggle('flag-a', false, 'session');
  tracker.recordToggle('flag-b', true, 'user', 'user-1');
  tracker.recordReset();

  const summary = tracker.getSummary();

  assertEqual(summary.totalEvents, 4, 'should count all 4 events');
  assertEqual(summary.exposures, 1, 'should count 1 exposure');
  assertEqual(summary.toggles, 2, 'should count 2 toggles');
  assertEqual(summary.resets, 1, 'should count 1 reset');
};

tests['analytics: clearEvents empties the log'] = () => {
  const { tracker } = makeFixture();

  tracker.recordToggle('flag-a', true, 'global');
  tracker.clearEvents();

  const events = tracker.getEvents();
  assertArrayLength(events, 0, 'events should be empty after clearEvents');
};

tests['analytics: toggle events are NOT deduplicated'] = () => {
  const { tracker } = makeFixture();

  tracker.recordToggle('new-api-explorer', true, 'session');
  tracker.recordToggle('new-api-explorer', false, 'session');
  tracker.recordToggle('new-api-explorer', true, 'session');

  const events = tracker.getEvents();
  assertArrayLength(events, 3, 'each toggle should be recorded separately');
};

tests['analytics: events have unique IDs'] = () => {
  const { tracker } = makeFixture();

  tracker.recordToggle('flag-x', true, 'global');
  tracker.recordToggle('flag-x', false, 'global');

  const events = tracker.getEvents();
  assert(events[0].id !== events[1].id, 'events should have unique IDs');
};

tests['analytics: topFlags ranks by exposure count'] = () => {
  const { tracker } = makeFixture();

  tracker.recordExposure('flag-b', true, 'global');
  // flag-a exposed in second session fixture wouldn't deduplicate here since fresh fixture
  // Simulate 3 unique exposures for flag-c by clearing dedupe and re-recording
  // Instead, use toggles for flag-a (not deduped)
  tracker.recordToggle('flag-a', true, 'global');
  tracker.recordToggle('flag-a', false, 'global');
  tracker.recordExposure('flag-b', true, 'global'); // deduped — should stay at 1

  const summary = tracker.getSummary();
  const flagB = summary.topFlags.find((f) => f.flagKey === 'flag-b');
  assertNotNull(flagB, 'flag-b should appear in topFlags');
  assertEqual(flagB!.exposureCount, 1, 'flag-b should have 1 exposure (deduplicated)');
};

tests['analytics: getSummary recentEvents returns last events in reverse order'] = () => {
  const { tracker } = makeFixture();

  tracker.recordToggle('flag-1', true, 'global');
  tracker.recordToggle('flag-2', true, 'global');
  tracker.recordToggle('flag-3', true, 'global');

  const summary = tracker.getSummary();
  // recentEvents is reversed (newest first)
  assertEqual(summary.recentEvents[0].flagKey, 'flag-3', 'most recent event should be first');
};

// ─── Runner ────────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  const testNames = Object.keys(tests);
  let passed = 0;
  let failed = 0;
  const failures: { name: string; error: Error }[] = [];

  console.log(`\n🚩 Running ${testNames.length} feature flag tests...\n`);

  for (const testName of testNames) {
    try {
      tests[testName]();
      console.log(`  ✓ ${testName}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${testName}`);
      if (error instanceof Error) {
        failures.push({ name: testName, error });
      }
      failed++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${testNames.length} tests`);
  console.log(`${'='.repeat(70)}\n`);

  if (failures.length > 0) {
    console.log('Failed tests:\n');
    for (const { name, error } of failures) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${error.message}\n`);
    }
    process.exit(1);
  } else {
    console.log('✅ All feature flag tests passed!');
    process.exit(0);
  }
}

runTests();
