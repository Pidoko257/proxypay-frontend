import React, { useEffect } from 'react';
import {
  KEYBOARD_SHORTCUT_CATEGORIES,
  KEYBOARD_SHORTCUTS,
} from '../../constants/keyboardShortcuts';
import styles from './KeyboardShortcutsModal.module.css';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function formatKey(key: string): string {
  if (key === 'Mod') {
    return isMacPlatform() ? '⌘' : 'Ctrl';
  }

  if (key === 'Esc') {
    return 'Esc';
  }

  return key;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="keyboard-shortcuts-title" className={styles.title}>
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          {KEYBOARD_SHORTCUT_CATEGORIES.map((category) => (
            <section key={category} className={styles.category}>
              <h3 className={styles.categoryTitle}>{category}</h3>
              <div className={styles.shortcutList}>
                {KEYBOARD_SHORTCUTS[category].map((shortcut) => (
                  <div
                    key={`${category}-${shortcut.description}`}
                    className={styles.shortcutRow}
                  >
                    <span className={styles.description}>{shortcut.description}</span>
                    <span className={styles.keys}>
                      {shortcut.keys.map((key, index) => (
                        <React.Fragment key={`${shortcut.description}-${key}-${index}`}>
                          {index > 0 ? (
                            <span className={styles.keySeparator}>+</span>
                          ) : null}
                          <kbd className={styles.key}>{formatKey(key)}</kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className={styles.footer}>
          Press <kbd className={styles.key}>Esc</kbd> or click outside to close
        </div>
      </div>
    </div>
  );
}
