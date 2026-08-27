import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ChangelogViewer from '../ChangelogViewer';

/**
 * Covers:
 *  - issue #410 — filter the changelog by impact level and surface an impact badge.
 *  - issue #401 — guided, step-by-step migration wizard for deprecation notices.
 *
 * NOTE: written for Jest + @testing-library/react; add a runner to execute.
 */
describe('ChangelogViewer — impact filtering (#410)', () => {
  it('shows an impact badge on every entry', () => {
    render(<ChangelogViewer />);
    const badges = screen.getAllByTestId('impact-badge');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => {
      expect(['low', 'medium', 'high', 'critical']).toContain(
        b.getAttribute('data-impact'),
      );
    });
  });

  it('filters entries to a single impact level via the dropdown', () => {
    render(<ChangelogViewer />);
    fireEvent.change(screen.getByTestId('impact-filter'), {
      target: { value: 'critical' },
    });
    const badges = screen.getAllByTestId('impact-badge');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.getAttribute('data-impact')).toBe('critical'));
  });

  it('"High & Critical only" quick toggle hides low/medium changes', () => {
    render(<ChangelogViewer />);
    fireEvent.click(screen.getByTestId('high-impact-toggle'));
    const badges = screen.getAllByTestId('impact-badge');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) =>
      expect(['high', 'critical']).toContain(b.getAttribute('data-impact')),
    );
  });
});

describe('ChangelogViewer — migration wizard (#401)', () => {
  it('opens a step-by-step wizard with code examples for a deprecation', () => {
    render(<ChangelogViewer />);
    fireEvent.change(screen.getByTestId('impact-filter'), {
      target: { value: 'high' },
    });
    fireEvent.click(screen.getAllByTestId('open-migration-wizard')[0]);

    const wizard = screen.getByTestId('migration-wizard');
    expect(within(wizard).getByTestId('migration-wizard-step')).toHaveTextContent(
      /step 1 of/i,
    );
    expect(within(wizard).getByTestId('migration-code-after')).toBeInTheDocument();
  });

  it('steps forward and back through the wizard and finishes', () => {
    render(<ChangelogViewer />);
    fireEvent.change(screen.getByTestId('impact-filter'), {
      target: { value: 'high' },
    });
    fireEvent.click(screen.getAllByTestId('open-migration-wizard')[0]);

    const step = () => screen.getByTestId('migration-wizard-step').textContent;
    expect(step()).toMatch(/step 1 of/i);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(step()).toMatch(/step 2 of/i);

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(step()).toMatch(/step 1 of/i);

    // Walk to the last step and close via "Done".
    let guard = 0;
    while (screen.queryByRole('button', { name: /next/i }) && guard++ < 20) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    fireEvent.click(screen.getByTestId('migration-wizard-done'));
    expect(screen.queryByTestId('migration-wizard')).toBeNull();
  });
});
