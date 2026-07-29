export type ShortcutCategory = 'Navigation' | 'Transactions' | 'Settings' | 'General';

export interface KeyboardShortcut {
  keys: string[];
  description: string;
}

export const KEYBOARD_SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  'Navigation',
  'Transactions',
  'Settings',
  'General',
];

export const KEYBOARD_SHORTCUTS: Record<ShortcutCategory, KeyboardShortcut[]> = {
  Navigation: [
    { keys: ['Mod', 'K'], description: 'Open search' },
    { keys: ['G', 'H'], description: 'Go to dashboard home' },
    { keys: ['G', 'T'], description: 'Go to transactions' },
    { keys: ['G', 'S'], description: 'Go to settings' },
  ],
  Transactions: [
    { keys: ['N'], description: 'New transaction' },
    { keys: ['E'], description: 'Export transactions' },
  ],
  Settings: [
    { keys: ['Mod', ','], description: 'Open settings' },
  ],
  General: [
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modal' },
  ],
};
