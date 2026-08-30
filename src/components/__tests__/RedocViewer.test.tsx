/**
 * Tests for RedocViewer component
 *
 * RedocViewer loads a CDN script (Redoc) and calls window.Redoc.init().
 * We mock the network fetch, the CDN loader, and window.Redoc to keep
 * tests fast and deterministic.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock the CDN loader so Redoc never actually loads
jest.mock('../../utils/redocLoader', () => ({
  loadRedoc: jest.fn().mockResolvedValue(undefined),
}));

// Mock specVersionManager to avoid unrelated side-effects
jest.mock('../../utils/specVersionManager', () => ({
  getSpecUrlWithCacheBusting: (url: string) => url,
  checkSpecVersion: jest.fn().mockResolvedValue({ hasUpdate: false }),
  updateVersionTracking: jest.fn(),
}));

// Stub redocTheme helpers
jest.mock('../../utils/redocTheme', () => ({
  buildRedocTheme: jest.fn(() => ({})),
  readRedocThemeColors: jest.fn(() => ({ primary: '#2e8555', background: '#fff', text: '#000' })),
  redocThemeColorsEqual: jest.fn(() => true),
}));

// Stub Toast so we don't need to care about its internals
jest.mock('../Toast', () => ({
  __esModule: true,
  default: () => null,
  useToast: () => ({ messages: [], success: jest.fn(), error: jest.fn() }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MINIMAL_SPEC = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
};

function setWindowRedoc() {
  (window as any).Redoc = { init: jest.fn() };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import RedocViewer from '../RedocViewer';

beforeEach(() => {
  setWindowRedoc();
  jest.clearAllMocks();
});

describe('RedocViewer', () => {
  describe('when spec prop is provided', () => {
    it('does not show the loading spinner', async () => {
      render(<RedocViewer spec={MINIMAL_SPEC} />);
      // Loading spinner should not appear because spec is already provided
      expect(screen.queryByText(/Loading API specification/i)).not.toBeInTheDocument();
    });

    it('renders the Redoc container div', async () => {
      const { container } = render(<RedocViewer spec={MINIMAL_SPEC} />);
      // The component renders a div wrapper when there's no error and no loading state
      // (spec is provided so there's no loading). Verify the container has content.
      expect(container.firstChild).not.toBeNull();
      expect(container.innerHTML).not.toBe('');
    });

    it('calls window.Redoc.init after the CDN loader resolves', async () => {
      render(<RedocViewer spec={MINIMAL_SPEC} />);
      await waitFor(() => {
        expect((window as any).Redoc.init).toHaveBeenCalled();
      });
    });

    it('calls onSpecLoaded callback with the provided spec', async () => {
      const onSpecLoaded = jest.fn();
      render(<RedocViewer spec={MINIMAL_SPEC} onSpecLoaded={onSpecLoaded} />);
      expect(onSpecLoaded).toHaveBeenCalledWith(MINIMAL_SPEC);
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when fetching spec from URL', async () => {
      // Mock fetch to never resolve during this test
      global.fetch = jest.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise(() => {})) as unknown as typeof fetch;

      render(<RedocViewer specUrl="/openapi.yaml" />);
      expect(screen.getByText(/Loading API specification/i)).toBeInTheDocument();

      // Restore
      (global.fetch as jest.Mock).mockRestore?.();
    });
  });

  describe('error state', () => {
    it('shows error message when spec fetch fails with non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        headers: { get: () => 'application/json' },
      }) as unknown as typeof fetch;

      await act(async () => {
        render(<RedocViewer specUrl="/missing.yaml" />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to Load API Reference/i)).toBeInTheDocument();
      });
    });

    it('calls onError callback when spec fails to load', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
        headers: { get: () => 'application/json' },
      }) as unknown as typeof fetch;

      const onError = jest.fn();
      await act(async () => {
        render(<RedocViewer specUrl="/bad.yaml" onError={onError} />);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('shows the specUrl in the error hint', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Gone',
        headers: { get: () => 'text/plain' },
      }) as unknown as typeof fetch;

      await act(async () => {
        render(<RedocViewer specUrl="/custom/path.yaml" />);
      });

      await waitFor(() => {
        expect(screen.getByText(/\/custom\/path\.yaml/i)).toBeInTheDocument();
      });
    });
  });

  describe('props', () => {
    it('renders without crashing with all props provided', async () => {
      const onSpecLoaded = jest.fn();
      const onError = jest.fn();
      expect(() =>
        render(
          <RedocViewer
            spec={MINIMAL_SPEC}
            title="Custom Title"
            disableSidebar={false}
            expandTagsByDefault={true}
            enableDeepLinking={true}
            hideHostname={false}
            enableAnchorCopy={false}
            onSpecLoaded={onSpecLoaded}
            onError={onError}
          />,
        ),
      ).not.toThrow();
    });

    it('renders without crashing with minimal required props', () => {
      expect(() => render(<RedocViewer spec={MINIMAL_SPEC} />)).not.toThrow();
    });
  });
});
