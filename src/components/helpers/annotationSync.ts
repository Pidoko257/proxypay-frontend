/**
 * Cross-tab synchronisation helpers for community annotations.
 *
 * Annotations live in `localStorage`. When another browser tab mutates that
 * key (for example by deleting an annotation) the browser fires a `storage`
 * event in every *other* tab. These helpers turn the raw event payload into a
 * reconciled annotation list plus the set of ids that disappeared so the UI can
 * drop them and notify the user.
 */

export interface SyncableAnnotation {
  id: string;
  [key: string]: unknown;
}

export interface AnnotationSyncResult<T extends SyncableAnnotation> {
  /** The list every tab should now render. */
  annotations: T[];
  /** Ids that were present locally but are gone in the incoming snapshot. */
  removedIds: string[];
  /** Ids that appeared in the incoming snapshot but were not present locally. */
  addedIds: string[];
  /** Whether anything actually changed relative to `previous`. */
  changed: boolean;
}

function safeParse<T>(raw: string | null): T[] | null {
  if (raw == null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

/**
 * Reconcile the in-memory annotation list with a fresh snapshot read from
 * `localStorage` (typically triggered by a `storage` event from another tab).
 *
 * If the snapshot cannot be parsed the previous list is kept untouched.
 */
export function reconcileAnnotationsFromStorage<T extends SyncableAnnotation>(
  previous: T[],
  rawNext: string | null,
): AnnotationSyncResult<T> {
  const next = safeParse<T>(rawNext);
  if (next == null) {
    return { annotations: previous, removedIds: [], addedIds: [], changed: false };
  }

  const prevIds = new Set(previous.map((a) => a.id));
  const nextIds = new Set(next.map((a) => a.id));

  const removedIds = previous.filter((a) => !nextIds.has(a.id)).map((a) => a.id);
  const addedIds = next.filter((a) => !prevIds.has(a.id)).map((a) => a.id);

  const changed =
    removedIds.length > 0 ||
    addedIds.length > 0 ||
    JSON.stringify(previous) !== JSON.stringify(next);

  return { annotations: next, removedIds, addedIds, changed };
}

/**
 * Whether a `storage` event is relevant to the annotations store.
 *
 * `event.key` is `null` when the whole store is cleared (`localStorage.clear()`),
 * which should also trigger a resync.
 */
export function isAnnotationStorageEvent(
  eventKey: string | null,
  annotationsKey: string,
): boolean {
  return eventKey === null || eventKey === annotationsKey;
}

/** Human readable toast text for a cross-tab deletion. */
export function describeRemoval(count: number): string {
  if (count <= 0) {
    return '';
  }
  return count === 1
    ? 'An annotation was deleted in another tab'
    : `${count} annotations were deleted in another tab`;
}
