import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MigrationGuide from '../MigrationGuide';

/**
 * Covers issue #367 — deprecated endpoints highlighted, top banner when
 * deprecations exist, and a "deprecated only" filter.
 *
 * NOTE: written for Jest + @testing-library/react; add a runner to execute.
 */
describe('MigrationGuide', () => {
  it('shows a deprecation banner when deprecated changes exist', () => {
    render(<MigrationGuide />);
    const banner = screen.getByTestId('deprecation-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/deprecated/i);
  });

  it('visually flags deprecated diff cards with a warning marker', () => {
    render(<MigrationGuide />);
    // Expand the v2.0 -> v2.1 migration, which contains the deprecated
    // XML-format change.
    fireEvent.click(screen.getByText(/JSON-Only & Real-Time Streaming/i));
    const flags = screen.getAllByTestId('deprecated-flag');
    expect(flags.length).toBeGreaterThan(0);
    const card = screen.getAllByTestId('diff-card-deprecated')[0];
    expect(card).toHaveAttribute('data-deprecated', 'true');
  });

  it('filters to deprecated-only changes and back', () => {
    render(<MigrationGuide />);
    fireEvent.click(screen.getByRole('button', { name: /show deprecated only/i }));
    // Every rendered diff card must now be a deprecated one.
    expect(screen.queryByTestId('diff-card')).toBeNull();
    expect(screen.getAllByTestId('diff-card-deprecated').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /show all changes/i }));
  });
});
