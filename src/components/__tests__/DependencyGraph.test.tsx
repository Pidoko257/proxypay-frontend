import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DependencyGraphViewer from '../DependencyGraph';

/**
 * Covers issues #366 (zoom / pan / fit-to-screen controls) and
 * #364 (legend explaining colours, grouping and critical vs non-critical edges).
 *
 * NOTE: the repo does not yet ship a test runner. These specs are written for
 * Jest + @testing-library/react so they run as soon as one is configured.
 */
describe('DependencyGraphViewer', () => {
  it('renders zoom in / out / fit-to-screen controls', () => {
    render(<DependencyGraphViewer />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit graph to screen')).toBeInTheDocument();
  });

  it('zooming keeps the SVG transform within the clamped range', () => {
    const { container } = render(<DependencyGraphViewer />);
    const group = () => container.querySelector('svg g[transform]') as SVGGElement;
    const scaleOf = () =>
      Number(/scale\(([\d.]+)\)/.exec(group().getAttribute('transform') || '')?.[1]);

    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(scaleOf()).toBeLessThanOrEqual(3);

    for (let i = 0; i < 40; i++) fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(scaleOf()).toBeGreaterThanOrEqual(0.3);
  });

  it('fit-to-screen recentres the view', () => {
    const { container } = render(<DependencyGraphViewer />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(screen.getByLabelText('Fit graph to screen'));
    expect(container.querySelector('svg g[transform]')).toBeTruthy();
  });

  it('supports pan by dragging the canvas', () => {
    const { container } = render(<DependencyGraphViewer />);
    const wrapper = container.querySelector('[style*="cursor"]') as HTMLElement;
    const group = () => container.querySelector('svg g[transform]') as SVGGElement;
    const before = group().getAttribute('transform');
    fireEvent.mouseDown(wrapper, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(wrapper, { clientX: 220, clientY: 180 });
    fireEvent.mouseUp(wrapper);
    expect(group().getAttribute('transform')).not.toEqual(before);
  });

  it('renders a legend explaining node colours, grouping and edge criticality', () => {
    render(<DependencyGraphViewer />);
    const legend = screen.getByTestId('graph-legend');
    expect(legend).toBeInTheDocument();
    expect(legend).toHaveTextContent(/node colour/i);
    expect(legend).toHaveTextContent(/critical edge/i);
    expect(legend).toHaveTextContent(/non-critical edge/i);
    expect(legend).toHaveTextContent('Payments');
    expect(legend).toHaveTextContent(/critical endpoint/i);
  });
});
