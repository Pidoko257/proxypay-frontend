require('@testing-library/jest-dom');

// ── window.matchMedia mock ─────────────────────────────────────────────────────
// jsdom does not implement matchMedia; provide a minimal stub.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),    // deprecated but still used in some libs
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ── CSS.escape mock ────────────────────────────────────────────────────────────
// jsdom >= 16 ships CSS.escape, but older environments or some test configs may
// not. Provide a safe fallback.
if (!window.CSS) {
  window.CSS = { escape: (s) => s.replace(/[^a-zA-Z0-9-_]/g, (c) => `\\${c}`) };
}
