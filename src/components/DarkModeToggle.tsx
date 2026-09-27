import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'proxypay-theme';

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export default function DarkModeToggle(): React.JSX.Element {
  const [isDark, setIsDark] = useState<boolean>(false);

  // On mount, read persisted preference and apply it
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const prefersDark =
        stored !== null
          ? stored === 'dark'
          : window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      applyTheme(prefersDark);
    } catch {
      // localStorage may be unavailable (e.g. SSR, private browsing)
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'none',
        border: '1px solid var(--pp-border, #e2e8f0)',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: '1.125rem',
        lineHeight: 1,
        padding: '0.375rem 0.625rem',
        color: 'var(--pp-text, #1a202c)',
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
