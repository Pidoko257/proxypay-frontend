import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';

/**
 * Tests for issue #443 – useUndoRedo hook.
 *
 * Covers:
 * - Initial state
 * - setState recording undo history
 * - undo / redo cycling
 * - Max 10 undo steps enforced
 * - Redo stack cleared on new change
 * - Keyboard shortcuts Ctrl+Z and Ctrl+Y
 * - Cleanup (no lingering keydown listeners after unmount)
 */
describe('useUndoRedo', () => {
  describe('initial state', () => {
    it('returns the initial value as state', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      expect(result.current.state).toBe(0);
    });

    it('starts with canUndo=false and canRedo=false', () => {
      const { result } = renderHook(() => useUndoRedo('initial'));
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('starts with undoCount=0 and redoCount=0', () => {
      const { result } = renderHook(() => useUndoRedo([]));
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });
  });

  describe('setState', () => {
    it('updates the current state', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(42));
      expect(result.current.state).toBe(42);
    });

    it('accepts an updater function', () => {
      const { result } = renderHook(() => useUndoRedo(5));
      act(() => result.current.setState((n) => n + 1));
      expect(result.current.state).toBe(6);
    });

    it('enables undo after a state change', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      expect(result.current.canUndo).toBe(true);
      expect(result.current.undoCount).toBe(1);
    });

    it('clears the redo stack when a new change is made', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.undo());
      expect(result.current.canRedo).toBe(true);
      // Make a new change – redo stack should be cleared
      act(() => result.current.setState(99));
      expect(result.current.canRedo).toBe(false);
      expect(result.current.redoCount).toBe(0);
    });
  });

  describe('undo', () => {
    it('reverts to the previous state', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.undo());
      expect(result.current.state).toBe(0);
    });

    it('is a no-op when there is nothing to undo', () => {
      const { result } = renderHook(() => useUndoRedo('hello'));
      act(() => result.current.undo());
      expect(result.current.state).toBe('hello');
      expect(result.current.canUndo).toBe(false);
    });

    it('decrements undoCount', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.setState(2));
      act(() => result.current.undo());
      expect(result.current.undoCount).toBe(1);
    });

    it('enables redo after undoing', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.undo());
      expect(result.current.canRedo).toBe(true);
      expect(result.current.redoCount).toBe(1);
    });

    it('cycles correctly through multiple undo steps', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.setState(2));
      act(() => result.current.setState(3));

      act(() => result.current.undo());
      expect(result.current.state).toBe(2);
      act(() => result.current.undo());
      expect(result.current.state).toBe(1);
      act(() => result.current.undo());
      expect(result.current.state).toBe(0);
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('redo', () => {
    it('re-applies an undone state', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.undo());
      act(() => result.current.redo());
      expect(result.current.state).toBe(1);
    });

    it('is a no-op when there is nothing to redo', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.redo()); // nothing in redo stack
      expect(result.current.state).toBe(1);
      expect(result.current.canRedo).toBe(false);
    });

    it('cycles correctly through multiple redo steps', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => result.current.setState(2));
      act(() => result.current.undo());
      act(() => result.current.undo());

      act(() => result.current.redo());
      expect(result.current.state).toBe(1);
      act(() => result.current.redo());
      expect(result.current.state).toBe(2);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('max 10 undo steps', () => {
    it('retains at most 10 undo steps', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      for (let i = 1; i <= 15; i++) {
        act(() => result.current.setState(i));
      }
      // undoCount must not exceed 10
      expect(result.current.undoCount).toBe(10);
    });

    it('after 15 changes, undoing 10 times reaches the 5th state (not the 0th)', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      for (let i = 1; i <= 15; i++) {
        act(() => result.current.setState(i));
      }
      // Undo all 10 available steps
      for (let i = 0; i < 10; i++) {
        act(() => result.current.undo());
      }
      // After 10 undos from state 15, we should be at state 5
      expect(result.current.state).toBe(5);
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('keyboard shortcuts', () => {
    it('triggers undo on Ctrl+Z', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => {
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      });
      expect(result.current.state).toBe(0);
    });

    it('triggers redo on Ctrl+Y', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => {
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      });
      act(() => {
        fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      });
      expect(result.current.state).toBe(1);
    });

    it('triggers redo on Ctrl+Shift+Z', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => {
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      });
      act(() => {
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      });
      expect(result.current.state).toBe(1);
    });

    it('does not respond to shortcuts without Ctrl modifier', () => {
      const { result } = renderHook(() => useUndoRedo(0));
      act(() => result.current.setState(1));
      act(() => {
        fireEvent.keyDown(window, { key: 'z' }); // no ctrlKey
      });
      expect(result.current.state).toBe(1); // unchanged
    });
  });

  describe('cleanup (memory leak prevention, issue #445)', () => {
    it('removes keydown listener on unmount', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useUndoRedo(0));

      const addedKeydown = addSpy.mock.calls.some((c) => c[0] === 'keydown');
      expect(addedKeydown).toBe(true);

      unmount();

      const removedKeydown = removeSpy.mock.calls.some((c) => c[0] === 'keydown');
      expect(removedKeydown).toBe(true);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
