import React from 'react';
import { Link, useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Docs', to: '/docs' },
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/about' },
];

function normalizePath(path) {
  if (!path) {
    return '/';
  }
  // Strip query string and hash, collapse trailing slashes.
  const clean = path.split('#')[0].split('?')[0];
  const trimmed = clean.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function isActive(currentPath, itemPath) {
  const current = normalizePath(currentPath);
  const target = normalizePath(itemPath);

  if (target === '/') {
    return current === '/';
  }

  // Match the section itself and any nested route beneath it.
  return current === target || current.startsWith(`${target}/`);
}

export default function Navbar() {
  const location = useLocation();
  const baseUrl = useBaseUrl('/');

  // Remove the GitHub Pages base path (e.g. /repo-name/) before matching.
  const normalizedBase = normalizePath(baseUrl);
  let currentPath = normalizePath(location.pathname);
  if (normalizedBase !== '/' && currentPath.startsWith(normalizedBase)) {
    currentPath = normalizePath(currentPath.slice(normalizedBase.length));
  }

  return (
    <nav className={styles.navbar} aria-label="Primary">
      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(currentPath, item.to);
          return (
            <li key={item.to} className={styles.navItem}>
              <Link
                to={item.to}
                className={
                  active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                }
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
