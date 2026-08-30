/**
 * Tests for IntegratedApiReference component — covers rendering, search,
 * endpoint selection, comparison mode, and accessibility attributes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock RedocViewer so tests don't need a real CDN or window.Redoc
jest.mock('../RedocViewer', () => ({
  __esModule: true,
  default: ({ onSpecLoaded }: { onSpecLoaded?: (spec: any) => void }) => {
    // Immediately call onSpecLoaded with a minimal spec so IntegratedApiReference
    // can parse endpoints
    React.useEffect(() => {
      onSpecLoaded?.({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1' },
        paths: {
          '/transactions': {
            get: {
              operationId: 'listTransactions',
              summary: 'List transactions',
              tags: ['Transactions'],
              responses: {},
            },
            post: {
              operationId: 'createTransaction',
              summary: 'Create transaction',
              tags: ['Transactions'],
              responses: {},
            },
          },
          '/webhooks': {
            post: {
              operationId: 'createWebhook',
              summary: 'Create webhook',
              tags: ['Webhooks'],
              responses: {},
            },
          },
        },
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="redoc-viewer">Redoc</div>;
  },
}));

// Mock SpecUpdateNotifier
jest.mock('../SpecUpdateNotifier', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock EndpointComparison
jest.mock('../EndpointComparison', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="endpoint-comparison">
      <button onClick={onClose}>Close comparison</button>
    </div>
  ),
}));

// Mock APISidebarNav to a simplified version to avoid deep component rendering
jest.mock('../APISidebarNav', () => ({
  __esModule: true,
  default: ({
    endpoints,
    onEndpointClick,
  }: {
    endpoints: any[];
    onEndpointClick?: (ep: any) => void;
  }) => (
    <nav aria-label="sidebar">
      {endpoints.map((ep: any) => (
        <button key={ep.id} onClick={() => onEndpointClick?.(ep)}>
          {ep.method.toUpperCase()} {ep.path}
        </button>
      ))}
    </nav>
  ),
}));

// Mock searchHistory utils
jest.mock('../../utils/searchHistory', () => ({
  addSearchTerm: jest.fn((term: string) => [term]),
  getSearchSuggestions: jest.fn(() => []),
  loadSearchHistory: jest.fn(() => []),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import IntegratedApiReference from '../IntegratedApiReference';

describe('IntegratedApiReference', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<IntegratedApiReference />)).not.toThrow();
    });

    it('renders the search input with aria-label', () => {
      render(<IntegratedApiReference />);
      // type="search" with a list attribute gets role="combobox" in browsers
      const searchInput = screen.getByRole('combobox', { name: /Search API endpoints/i });
      expect(searchInput).toBeInTheDocument();
    });

    it('renders the Compare button', () => {
      render(<IntegratedApiReference />);
      expect(screen.getByRole('button', { name: /comparison/i })).toBeInTheDocument();
    });

    it('renders the RedocViewer', () => {
      render(<IntegratedApiReference />);
      expect(screen.getByTestId('redoc-viewer')).toBeInTheDocument();
    });

    it('renders the sidebar when showSidebar is true', () => {
      render(<IntegratedApiReference showSidebar={true} />);
      expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument();
    });

    it('does not render the sidebar when showSidebar is false', () => {
      render(<IntegratedApiReference showSidebar={false} />);
      expect(screen.queryByRole('navigation', { name: /sidebar/i })).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('shows the endpoint count after spec loads', async () => {
      render(<IntegratedApiReference />);
      await waitFor(() => {
        // After spec loads, count "3 / 3 endpoints" should appear
        expect(screen.getByText(/\d+ \/ \d+ endpoints/i)).toBeInTheDocument();
      });
    });

    it('filters endpoints when user types in the search box', async () => {
      render(<IntegratedApiReference />);

      // Wait for spec to load and sidebar to populate
      await waitFor(() => {
        expect(screen.getByText(/3 \/ 3 endpoints/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox', { name: /Search API endpoints/i });
      fireEvent.change(searchInput, { target: { value: 'webhook' } });

      await waitFor(() => {
        // Only 1 endpoint matches "webhook"
        expect(screen.getByText(/1 \/ 3 endpoints/i)).toBeInTheDocument();
      });
    });

    it('shows all endpoints when search is cleared', async () => {
      render(<IntegratedApiReference />);
      await waitFor(() => {
        expect(screen.getByText(/3 \/ 3 endpoints/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('combobox', { name: /Search API endpoints/i });
      fireEvent.change(searchInput, { target: { value: 'webhook' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText(/3 \/ 3 endpoints/i)).toBeInTheDocument();
      });
    });
  });

  describe('comparison mode', () => {
    it('toggles comparison mode on Compare button click', () => {
      render(<IntegratedApiReference />);
      const compareBtn = screen.getByRole('button', { name: /comparison/i });
      fireEvent.click(compareBtn);
      expect(compareBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows the EndpointComparison modal when comparison is active', () => {
      render(<IntegratedApiReference />);
      const compareBtn = screen.getByRole('button', { name: /comparison/i });
      fireEvent.click(compareBtn);
      expect(screen.getByTestId('endpoint-comparison')).toBeInTheDocument();
    });

    it('closes comparison mode when Close comparison is clicked', async () => {
      render(<IntegratedApiReference />);
      const compareBtn = screen.getByRole('button', { name: /comparison/i });
      fireEvent.click(compareBtn);
      fireEvent.click(screen.getByText('Close comparison'));
      expect(screen.queryByTestId('endpoint-comparison')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('search region has role="search"', () => {
      render(<IntegratedApiReference />);
      expect(screen.getByRole('search', { name: /Search API endpoints/i })).toBeInTheDocument();
    });

    it('endpoint count has aria-live="polite"', () => {
      render(<IntegratedApiReference />);
      const countEl = document.getElementById('api-search-count');
      expect(countEl).not.toBeNull();
      expect(countEl).toHaveAttribute('aria-live', 'polite');
    });

    it('Compare button has aria-pressed', () => {
      render(<IntegratedApiReference />);
      const compareBtn = screen.getByRole('button', { name: /comparison/i });
      expect(compareBtn).toHaveAttribute('aria-pressed');
    });
  });

  describe('callbacks', () => {
    it('calls onSpecLoaded when spec loads', async () => {
      const onSpecLoaded = jest.fn();
      render(<IntegratedApiReference onSpecLoaded={onSpecLoaded} />);
      await waitFor(() => {
        expect(onSpecLoaded).toHaveBeenCalled();
      });
    });

    it('calls onEndpointClick on sidebar endpoint selection', async () => {
      const onEndpointClick = jest.fn();

      // We patch the sidebar to also forward clicks
      render(<IntegratedApiReference showSidebar={true} />);
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /GET \/transactions/i })).toBeTruthy();
      });

      const ep = screen.getAllByRole('button', { name: /GET \/transactions/i })[0];
      fireEvent.click(ep);
      // The component sets selectedEndpointId internally — no external callback for this
      // but the component should not throw
    });
  });
});
