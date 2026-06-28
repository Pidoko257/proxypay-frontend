import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import styles from './DashboardLayout.module.css';

const NAV_ITEMS = [
  { label: 'Overview', to: '/dashboard', icon: '🏠' },
  { label: 'API Keys', to: '/keys', icon: '🔑' },
  { label: 'Transactions', to: '/transaction-status', icon: '🔄' },
  { label: 'API Reference', to: '/api', icon: '📖' },
];

const STORAGE_KEY = 'proxypay-sidebar-expanded';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setExpanded(stored === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const focusable = Array.from(
      sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  return (
    <div className={styles.root}>
      <button
        ref={hamburgerRef}
        className={styles.hamburger}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        &#9776;
      </button>

      {mobileOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        ref={sidebarRef}
        className={[
          styles.sidebar,
          expanded ? styles.expanded : styles.collapsed,
          mobileOpen ? styles.mobileOpen : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Dashboard navigation"
      >
        <button
          className={styles.mobileClose}
          onClick={() => {
            setMobileOpen(false);
            hamburgerRef.current?.focus();
          }}
          aria-label="Close navigation"
        >
          &times;
        </button>

        <button
          className={styles.collapseToggle}
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={expanded}
        >
          {expanded ? '◀' : '▶'}
        </button>

        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className={styles.navItem}>
            <span className={styles.navIcon} aria-hidden="true">
              {item.icon}
            </span>
            {expanded && <span className={styles.navLabel}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
