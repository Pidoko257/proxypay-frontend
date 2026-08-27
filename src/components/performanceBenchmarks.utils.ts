/**
 * Pure helpers for PerformanceBenchmarks custom SLA targets.
 * Kept JSX-free so they can be unit-tested in isolation.
 */

export type SlaStatus = 'ok' | 'warn' | 'breach';

export const SLA_STORAGE_KEY = 'proxypay:perf:custom-sla-targets';

/** Derive an SLA status by comparing the observed p95 latency against a target. */
export function computeSlaStatus(p95: number, slaTarget: number): SlaStatus {
  if (!Number.isFinite(slaTarget) || slaTarget <= 0) return 'ok';
  if (p95 <= slaTarget) return 'ok';
  if (p95 <= slaTarget * 1.5) return 'warn';
  return 'breach';
}

/** Validate a user-supplied SLA target (milliseconds). */
export function isValidSlaTarget(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 600000;
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function resolveStore(store?: Store): Store | null {
  if (store) return store;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/** Read the map of endpoint -> custom SLA target from persistent storage. */
export function loadCustomSlaTargets(store?: Store): Record<string, number> {
  const s = resolveStore(store);
  if (!s) return {};
  try {
    const raw = s.getItem(SLA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    Object.keys(parsed).forEach((key) => {
      const v = parsed[key];
      if (isValidSlaTarget(v)) out[key] = v;
    });
    return out;
  } catch {
    return {};
  }
}

/** Persist (or clear, when target is null) a custom SLA target for one endpoint. */
export function saveCustomSlaTarget(
  endpoint: string,
  target: number | null,
  store?: Store,
): Record<string, number> {
  const s = resolveStore(store);
  const current = loadCustomSlaTargets(store);
  if (target === null) {
    delete current[endpoint];
  } else if (isValidSlaTarget(target)) {
    current[endpoint] = target;
  } else {
    return current;
  }
  if (s) {
    try {
      s.setItem(SLA_STORAGE_KEY, JSON.stringify(current));
    } catch {
      /* storage unavailable — return in-memory result anyway */
    }
  }
  return current;
}

/** Merge default benchmark rows with any stored custom SLA targets. */
export function applyCustomSlaTargets<
  T extends { endpoint: string; p95: number; slaTarget: number; slaStatus: SlaStatus },
>(rows: T[], custom: Record<string, number>): T[] {
  return rows.map((row) => {
    const override = custom[row.endpoint];
    if (!isValidSlaTarget(override)) return row;
    return { ...row, slaTarget: override, slaStatus: computeSlaStatus(row.p95, override) };
  });
}
