import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest configuration for the ProxyPay docs portal.
//
// React components live under src/ (Docusaurus components, React 19). jsdom
// provides the DOM, `globals` exposes describe/it/expect without per-file
// imports, and `setupFiles` wires @testing-library/jest-dom matchers
// (e.g. toBeInTheDocument) into every test via src/test/setup.ts.
//
// The standalone dashboard/ app is a separate package (its own React 18 tree
// and package.json) and is excluded here so the root runner does not pick up
// its files with the wrong environment.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.docusaurus', 'dashboard/**'],
  },
})
