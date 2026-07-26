import React, { useEffect, useState } from 'react';

export function ThemeInitializer(): null {
  useEffect(() => {
    // Initialize theme from localStorage on client side
    const root = document.documentElement;
    const isDark = localStorage.getItem('theme') === 'dark';

    // Get system preference if theme not stored
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }, []);

  return null;
}

export default ThemeInitializer;
