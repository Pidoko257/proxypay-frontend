import { useEffect } from 'react';
import { isTypingTarget } from '../utils/isTypingTarget';

interface UseKeyboardShortcutsHelpOptions {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcutsHelp({
  isOpen,
  onOpen,
  onClose,
  enabled = true,
}: UseKeyboardShortcutsHelpOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
        return;
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, isOpen, onClose, onOpen]);
}
