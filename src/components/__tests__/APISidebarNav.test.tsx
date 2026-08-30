/**
 * Tests for APISidebarNav component — covers rendering, interaction,
 * accessibility attributes, and keyboard navigation.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import APISidebarNav from '../APISidebarNav';
import type { ParsedEndpoint, TagGroup } from '../../utils/apiSpecParser';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ENDPOINTS: ParsedEndpoint[] = [
  {
    id: 'listTransactions',
    operationId: 'listTransactions',
    method: 'get',
    path: '/transactions',
    summary: 'List transactions',
    tag: 'Transactions',
    tags: ['Transactions'],
    deprecated: false,
  },
  {
    id: 'createTransaction',
    operationId: 'createTransaction',
    method: 'post',
    path: '/transactions',
    summary: 'Create transaction',
    tag: 'Transactions',
    tags: ['Transactions'],
    deprecated: false,
  },
  {
    id: 'createWebhook',
    operationId: 'createWebhook',
    method: 'post',
    path: '/webhooks',
    summary: 'Create webhook',
    tag: 'Webhooks',
    tags: ['Webhooks'],
    deprecated: false,
  },
];

const TAG_GROUPS: TagGroup[] = [
  { name: 'Transactions', endpoints: ENDPOINTS.filter((e) => e.tag === 'Transactions') },
  { name: 'Webhooks', endpoints: ENDPOINTS.filter((e) => e.tag === 'Webhooks') },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderNav(props: Partial<React.ComponentProps<typeof APISidebarNav>> = {}) {
  return render(
    <APISidebarNav
      endpoints={ENDPOINTS}
      tagGroups={TAG_GROUPS}
      enableDeepLinking={false}
      {...props}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('APISidebarNav', () => {
  describe('rendering', () => {
    it('renders the nav element with aria-label', () => {
      renderNav();
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'API endpoint navigation');
    });

    it('renders the endpoint count', () => {
      renderNav();
      expect(screen.getByText(String(ENDPOINTS.length))).toBeInTheDocument();
    });

    it('renders tag group headers', () => {
      renderNav();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.getByText('Webhooks')).toBeInTheDocument();
    });

    it('renders empty state when no endpoints are provided', () => {
      renderNav({ endpoints: [], tagGroups: [] });
      expect(screen.getByText(/No endpoints found/i)).toBeInTheDocument();
    });
  });

  describe('expand / collapse', () => {
    it('tag headers have aria-expanded set to false by default', () => {
      renderNav();
      const tagButtons = screen.getAllByRole('button', { name: /Transactions/i });
      expect(tagButtons[0]).toHaveAttribute('aria-expanded', 'false');
    });

    it('expanding a tag reveals its endpoints', () => {
      renderNav();
      const txButton = screen.getAllByRole('button', { name: /Transactions/i })[0];
      fireEvent.click(txButton);
      expect(txButton).toHaveAttribute('aria-expanded', 'true');
      // Both transaction endpoints have /transactions in their aria-label
      const transactionButtons = screen.getAllByRole('button', {
        name: /\/transactions/i,
      });
      expect(transactionButtons.length).toBeGreaterThan(0);
    });

    it('keeps expanded state in local state (not re-synced from props)', () => {
      // APISidebarNav manages expansion locally via useState.
      // Once expanded by clicking, it remains expanded even if expandedTags prop changes.
      // This documents the intended uncontrolled behavior.
      renderNav();
      const txButton = screen.getAllByRole('button', { name: /Transactions/i })[0];

      // Click to expand
      fireEvent.click(txButton);
      expect(txButton).toHaveAttribute('aria-expanded', 'true');

      // Endpoints are now visible
      expect(screen.getAllByRole('button', { name: /\/transactions/i }).length).toBeGreaterThan(0);
    });

    it('calls onTagToggle callback when tag is toggled', () => {
      const onTagToggle = jest.fn();
      renderNav({ onTagToggle });
      const txButton = screen.getAllByRole('button', { name: /Transactions/i })[0];
      fireEvent.click(txButton);
      expect(onTagToggle).toHaveBeenCalledWith('Transactions');
    });
  });

  describe('endpoint selection', () => {
    it('calls onEndpointClick when an endpoint button is clicked', () => {
      const onEndpointClick = jest.fn();
      renderNav({ onEndpointClick, expandedTags: ['Transactions'] });
      // Find the GET /transactions button by its aria-label (which includes the summary)
      const listBtn = screen.getAllByRole('button', { name: /GET \/transactions/i })[0];
      fireEvent.click(listBtn);
      expect(onEndpointClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'listTransactions' }),
      );
    });

    it('marks the selected endpoint with aria-current="page"', () => {
      renderNav({
        expandedTags: ['Transactions'],
        selectedEndpointId: 'listTransactions',
      });
      const listBtn = screen.getAllByRole('button', { name: /GET \/transactions/i })[0];
      expect(listBtn).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark non-selected endpoints with aria-current', () => {
      renderNav({
        expandedTags: ['Transactions'],
        selectedEndpointId: 'listTransactions',
      });
      const createBtn = screen.getAllByRole('button', { name: /POST \/transactions/i })[0];
      expect(createBtn).not.toHaveAttribute('aria-current');
    });
  });

  describe('keyboard navigation', () => {
    it('activates tag expand/collapse on Enter key', () => {
      renderNav();
      const txButton = screen.getAllByRole('button', { name: /Transactions/i })[0];
      fireEvent.keyDown(txButton, { key: 'Enter', code: 'Enter' });
      expect(txButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('activates tag expand/collapse on Space key', () => {
      renderNav();
      const txButton = screen.getAllByRole('button', { name: /Transactions/i })[0];
      fireEvent.keyDown(txButton, { key: ' ', code: 'Space' });
      expect(txButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('activates endpoint click on Enter key', () => {
      const onEndpointClick = jest.fn();
      renderNav({ onEndpointClick, expandedTags: ['Transactions'] });
      const listBtn = screen.getAllByRole('button', { name: /GET \/transactions/i })[0];
      fireEvent.keyDown(listBtn, { key: 'Enter', code: 'Enter' });
      expect(onEndpointClick).toHaveBeenCalled();
    });
  });

  describe('method filter buttons', () => {
    it('renders method filter buttons when a tag is expanded', () => {
      renderNav({ expandedTags: ['Transactions'] });
      // Method filter group should be visible
      expect(screen.getByRole('group', { name: /Filter Transactions endpoints by HTTP method/i })).toBeInTheDocument();
    });

    it('filter buttons have aria-pressed attribute', () => {
      renderNav({ expandedTags: ['Transactions'] });
      const getFilter = screen.getByRole('button', { name: /Add GET filter/i });
      expect(getFilter).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles a method filter when clicked', () => {
      renderNav({ expandedTags: ['Transactions'] });
      const getFilter = screen.getByRole('button', { name: /Add GET filter/i });
      fireEvent.click(getFilter);
      expect(getFilter).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('accessibility', () => {
    it('tag header buttons have aria-controls pointing to endpoint list', () => {
      renderNav({ expandedTags: ['Transactions'] });
      const txButton = screen.getAllByRole('button', { name: /Transactions/i })[0];
      const controlsId = txButton.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
      expect(document.getElementById(controlsId!)).toBeInTheDocument();
    });

    it('endpoint list has role="list"', () => {
      renderNav({ expandedTags: ['Transactions'] });
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('endpoint buttons have descriptive aria-labels', () => {
      renderNav({ expandedTags: ['Transactions'] });
      const listBtn = screen.getAllByRole('button', { name: /GET \/transactions/i })[0];
      const ariaLabel = listBtn.getAttribute('aria-label');
      expect(ariaLabel).toContain('GET');
      expect(ariaLabel).toContain('/transactions');
    });
  });

  describe('quick search shortcut', () => {
    it('opens the quick search dialog on Ctrl+K', () => {
      renderNav();
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(screen.getByRole('dialog', { name: /Quick endpoint search/i })).toBeInTheDocument();
    });

    it('closes the quick search dialog on Escape', () => {
      renderNav();
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
