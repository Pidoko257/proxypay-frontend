import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PerformanceBenchmarks from '../PerformanceBenchmarks';

describe('PerformanceBenchmarks accessible filtered data', () => {
  it('updates the summary with filters and removes hidden endpoint chart data', () => {
    render(<PerformanceBenchmarks />);
    expect(screen.getByText(/Showing 10 of 10 endpoints/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('/payments'));
    expect(screen.getByText(/Latest latency values for POST \/payments/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Daily latency percentiles for POST \/payments/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter endpoints by category' }), {
      target: { value: 'Mobile Money' },
    });

    expect(screen.getByText(/Showing 2 of 10 endpoints/)).toBeInTheDocument();
    expect(screen.queryByText(/Latest latency values for POST \/payments/)).not.toBeInTheDocument();
  });
});