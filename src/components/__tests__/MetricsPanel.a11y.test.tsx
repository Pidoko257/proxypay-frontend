/**
 * Accessibility regression tests for the MetricsPanel favourites control (issue #375).
 *
 * NOTE: this repository does not yet have a test runner wired up. These specs are
 * written for the jest + @testing-library/react stack and will run as-is once that
 * tooling is added (`npm i -D jest @testing-library/react @testing-library/jest-dom`).
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricsPanel from '../MetricsPanel';

describe('MetricsPanel favourites accessibility (#375)', () => {
  beforeEach(() => window.localStorage.clear());

  it('exposes each favourite toggle with a descriptive aria-label', () => {
    render(<MetricsPanel />);
    const toggles = screen.getAllByRole('button', { name: /add .+ to favorites/i });
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('announces the favourite state via aria-pressed and updates the label on toggle', async () => {
    const user = userEvent.setup();
    render(<MetricsPanel />);

    const toggle = screen.getAllByRole('button', { name: /add .+ to favorites/i })[0];
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    const active = screen.getAllByRole('button', { name: /remove .+ from favorites/i })[0];
    expect(active).toHaveAttribute('aria-pressed', 'true');
  });

  it('routes toast feedback through an aria-live status region', async () => {
    const user = userEvent.setup();
    render(<MetricsPanel />);
    await user.click(screen.getAllByRole('button', { name: /add .+ to favorites/i })[0]);

    const status = screen.getByRole('status');
    expect(within(status).getByText(/added to favorites/i)).toBeInTheDocument();
  });

  it('hides the decorative star glyph from assistive tech', () => {
    render(<MetricsPanel />);
    const toggle = screen.getAllByRole('button', { name: /add .+ to favorites/i })[0];
    expect(toggle.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
