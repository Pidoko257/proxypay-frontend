import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MetricsPanel from '../MetricsPanel';

describe('MetricsPanel accessible filtered data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates its summary and data table when category filters change', () => {
    render(<MetricsPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 12 endpoints');

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter metrics by category' }), {
      target: { value: 'Payments' },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 endpoints');
    fireEvent.click(screen.getByText('View filtered metrics data'));
    const table = screen.getByRole('table', {
      name: 'Endpoint usage and trend for the current metrics filters',
    });
    expect(within(table).getByText('/api/v1/payments')).toBeInTheDocument();
    expect(within(table).getByText('/api/v1/payments/status')).toBeInTheDocument();
    expect(within(table).queryByText('/api/v1/auth/login')).not.toBeInTheDocument();
  });
});