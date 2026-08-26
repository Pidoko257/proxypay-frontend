import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Note: keep css: false. jsdom ignores @media conditions when computing
    // styles, so injecting real CSS would hide the toggle button (base rule
    // `display: none`) in every test. The responsive rules themselves are
    // verified against the raw stylesheet via `?raw` imports.
    css: false,
  },
});
