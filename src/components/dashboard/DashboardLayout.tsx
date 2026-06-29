import React, { useCallback, useState } from 'react';
import Link from '@docusaurus/Link';
import { useKeyboardShortcutsHelp } from '../../hooks/useKeyboardShortcutsHelp';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  activePath: '/dashboard' | '/dashboard/transactions' | '/dashboard/settings';
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  path: DashboardLayoutProps['activePath'];
  label: string;
}> = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/dashboard/transactions', label: 'Transactions' },
  { path: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardLayout({
  title,
  subtitle,
  activePath,
  children,
}: DashboardLayoutProps): React.JSX.Element {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const openShortcuts = useCallback(() => setIsShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setIsShortcutsOpen(false), []);

  useKeyboardShortcutsHelp({
    isOpen: isShortcutsOpen,
    onOpen: openShortcuts,
    onClose: closeShortcuts,
  });

  return (
    <>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          <p className={styles.hint}>
            Press <kbd>?</kbd> to view keyboard shortcuts.
          </p>
        </header>

        <nav className={styles.nav} aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navLink} ${
                activePath === item.path ? styles.navLinkActive : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.content}>{children}</div>
      </div>

      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}
