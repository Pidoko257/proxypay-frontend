/**
 * Version-conflict detection for the OpenAPI Spec Manager.
 *
 * When the backend serves a newer spec while the user already has a local
 * (possibly hand-modified) copy active, we need a three-way comparison to know
 * whether the new version can be fast-forwarded in safely or whether the user
 * has to resolve a real conflict.
 */

export interface VersionConflict {
  /** True when local and incoming both diverged from the common base. */
  hasConflict: boolean;
  /** Machine readable outcome. */
  status:
    | 'identical'
    | 'fast-forward'
    | 'local-only'
    | 'diverged'
    | 'no-base';
  /** Human readable explanation for the resolution UI. */
  reason: string;
  localHash: string;
  incomingHash: string;
  baseHash: string | null;
}

/** Stable, dependency-free 32-bit hash of a spec string. */
export function hashSpec(spec: string): string {
  let hash = 0;
  for (let i = 0; i < spec.length; i += 1) {
    hash = (Math.imul(hash, 31) + spec.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Compare the active local spec against an incoming backend spec.
 *
 * @param local    The spec currently active in the app (may contain unsaved edits).
 * @param incoming The spec just fetched from the backend.
 * @param base     The spec both sides were last known to agree on, or `null` when unknown.
 */
export function detectVersionConflict(
  local: string,
  incoming: string,
  base: string | null,
): VersionConflict {
  const localHash = hashSpec(local);
  const incomingHash = hashSpec(incoming);
  const baseHash = base == null ? null : hashSpec(base);

  if (localHash === incomingHash) {
    return {
      hasConflict: false,
      status: 'identical',
      reason: 'The incoming spec is identical to your local copy.',
      localHash,
      incomingHash,
      baseHash,
    };
  }

  if (baseHash == null) {
    return {
      hasConflict: true,
      status: 'no-base',
      reason:
        'The incoming spec differs from your local copy and there is no known common version to merge from. Choose which one to keep.',
      localHash,
      incomingHash,
      baseHash,
    };
  }

  const localChanged = localHash !== baseHash;
  const incomingChanged = incomingHash !== baseHash;

  if (localChanged && incomingChanged) {
    return {
      hasConflict: true,
      status: 'diverged',
      reason:
        'Both your local copy and the backend changed since the last sync. Merge the changes or pick one version.',
      localHash,
      incomingHash,
      baseHash,
    };
  }

  if (incomingChanged) {
    return {
      hasConflict: false,
      status: 'fast-forward',
      reason: 'The backend has a newer version and your local copy is unchanged. Safe to update.',
      localHash,
      incomingHash,
      baseHash,
    };
  }

  return {
    hasConflict: false,
    status: 'local-only',
    reason: 'Your local copy has unsaved changes but the backend version is unchanged. Keeping your copy.',
    localHash,
    incomingHash,
    baseHash,
  };
}

export interface SpecLineDiff {
  type: 'context' | 'added' | 'removed';
  local: string | null;
  incoming: string | null;
}

/**
 * Minimal line-level diff used by the comparison UI. Not a full LCS diff — it
 * walks both sides in parallel which is good enough to highlight where two spec
 * versions drift apart.
 */
export function diffSpecLines(local: string, incoming: string): SpecLineDiff[] {
  const localLines = local.split('\n');
  const incomingLines = incoming.split('\n');
  const max = Math.max(localLines.length, incomingLines.length);
  const rows: SpecLineDiff[] = [];

  for (let i = 0; i < max; i += 1) {
    const l = i < localLines.length ? localLines[i] : null;
    const r = i < incomingLines.length ? incomingLines[i] : null;
    if (l === r) {
      rows.push({ type: 'context', local: l, incoming: r });
    } else if (l == null) {
      rows.push({ type: 'added', local: null, incoming: r });
    } else if (r == null) {
      rows.push({ type: 'removed', local: l, incoming: null });
    } else {
      rows.push({ type: 'removed', local: l, incoming: null });
      rows.push({ type: 'added', local: null, incoming: r });
    }
  }

  return rows;
}
