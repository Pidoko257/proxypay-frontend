/**
 * Upgrade CTA tests for RateLimitDashboard (issue #377).
 *
 * NOTE: this repository does not yet have a test runner wired up. These specs target
 * jest + @testing-library/react and run as-is once that tooling is added. They assume
 * the component is rendered in DEMO_MODE (its default).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RateLimitDashboard from '../RateLimitDashboard';

describe('RateLimitDashboard upgrade CTA (#377)', () => {
  it('always exposes an upgrade link that points at the pricing page', async () => {
    render(<RateLimitDashboard />);
    const link = await screen.findByRole('link', { name: /upgrade options/i });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  it('surfaces a prominent "Upgrade plan" CTA when usage is not healthy', async () => {
    // Force a non-ok status regardless of the random mock generator.
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // ~99% of limit -> critical

    render(<RateLimitDashboard />);

    const cta = await screen.findByRole('region', { name: /upgrade your plan/i });
    const button = screen.getByRole('link', { name: /upgrade plan/i });
    expect(cta).toContainElement(button);
    expect(button).toHaveAttribute('href', '/pricing');

    (Math.random as jest.Mock).mockRestore();
  });

  it('does not show the CTA banner while usage is healthy', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01); // ~1% of limit -> ok

    render(<RateLimitDashboard />);
    await screen.findByText(/Overall Usage/i);
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /upgrade your plan/i })).toBeNull()
    );

    (Math.random as jest.Mock).mockRestore();
  });
});
