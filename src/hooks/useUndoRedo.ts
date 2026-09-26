import { useState, useCallback, useEffect, useRef } from 'react';

/** Maximum number of undo steps retained in the history stack. */
const MAX_HISTORY_STEPS = 10;

/**
 * Return value of the `useUndoRedo` hook.
 *
 * @template T - The type of state being tracked.
 */
export interface UseUndoRedoReturn<T> {
  /** The current state value. */
  state: T;
  /**
   * Update the state and record the previous value in the undo history.
   * Use this in place of a plain `setState` call for any destructive action
   * you want users to be able to undo (e.g. deleting an annotation).
   *
   * @param newState - The new state or an updater function.
   * @example
   * ```tsx
   * const { state, setState } = useUndoRedo(initialAnnotations);
   * // Delete an annotation and allow undoing it:
   * setState(prev => prev.filter(a => a.id !== id));
   * ```
   */
  setState: (newState: T | ((prev: T) => T)) => void;
  /** Revert to the previous state. No-op when there is nothing to undo. */
  undo: () => void;
  /** Re-apply the most recently undone state. No-op when there is nothing to redo. */
  redo: () => void;
  /** `true` when there is at least one step that can be undone. */
  canUndo: boolean;
  /** `true` when there is at least one step that can be re-applied. */
  canRedo: boolean;
  /** Number of undo steps currently available (0 – {@link MAX_HISTORY_STEPS}). */
  undoCount: number;
  /** Number of redo steps currently available. */
  redoCount: number;
}

/**
 * A generic undo/redo hook.
 *
 * Wraps a stateful value and exposes `undo`, `redo`, and an enhanced `setState`
 * that pushes each change onto an internal history stack capped at
 * {@link MAX_HISTORY_STEPS} (10) entries.
 *
 * Keyboard shortcuts `Ctrl+Z` (undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (redo) are
 * attached to `window` while the hook is mounted and removed automatically on
 * unmount, preventing memory leaks.
 *
 * @template T - The type of state being tracked.
 * @param initialState - The starting value.
 * @returns An object with the current state and undo/redo controls.
 *
 * @example
 * ```tsx
 * const { state: annotations, setState, undo, redo, canUndo, canRedo } =
 *   useUndoRedo<Annotation[]>([]);
 *
 * // Record a change (e.g. deleting an annotation):
 * setState(prev => prev.filter(a => a.id !== id));
 *
 * // Undo / redo buttons:
 * <button onClick={undo} disabled={!canUndo}>Undo</button>
 * <button onClick={redo} disabled={!canRedo}>Redo</button>
 * ```
 */
export function useUndoRedo<T>(initialState: T): UseUndoRedoReturn<T> {
  // past[past.length - 1] is the most recent previous state
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  // Keep a ref to present so keyboard handlers always see the latest value
  // without being recreated on every render.
  const presentRef = useRef<T>(present);
  presentRef.current = present;

  /**
   * Push a new state onto the history stack.
   * Any redo history (future) is cleared when a new change is made.
   */
  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setPresent((currentPresent) => {
      const resolved =
        typeof newState === 'function'
          ? (newState as (prev: T) => T)(currentPresent)
          : newState;

      setPast((currentPast) => {
        // Trim history to MAX_HISTORY_STEPS
        const trimmed =
          currentPast.length >= MAX_HISTORY_STEPS
            ? currentPast.slice(currentPast.length - MAX_HISTORY_STEPS + 1)
            : currentPast;
        return [...trimmed, currentPresent];
      });

      // Clear redo stack whenever a new action is committed
      setFuture([]);

      return resolved;
    });
  }, []);

  /** Step back one entry in the undo history. */
  const undo = useCallback(() => {
    setPast((currentPast) => {
      if (currentPast.length === 0) return currentPast;

      const previous = currentPast[currentPast.length - 1];
      const newPast = currentPast.slice(0, -1);

      setPresent((currentPresent) => {
        setFuture((currentFuture) => [currentPresent, ...currentFuture]);
        return previous;
      });

      return newPast;
    });
  }, []);

  /** Step forward one entry in the redo history. */
  const redo = useCallback(() => {
    setFuture((currentFuture) => {
      if (currentFuture.length === 0) return currentFuture;

      const next = currentFuture[0];
      const newFuture = currentFuture.slice(1);

      setPresent((currentPresent) => {
        setPast((currentPast) => [...currentPast, currentPresent]);
        return next;
      });

      return newFuture;
    });
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  // Attached once on mount; removed on unmount to prevent memory leaks (#445).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Cleanup on unmount — fixes memory leak (issue #445)
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return {
    state: present,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoCount: past.length,
    redoCount: future.length,
  };
}
