import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DependencyGraphViewer from './DependencyGraph';

describe('DependencyGraph Path Highlighting (#414)', () => {
  function findTraceCheckbox(): HTMLInputElement {
    const checkboxes = screen.getAllByRole('checkbox');
    return checkboxes[checkboxes.length - 1] as HTMLInputElement;
  }

  function clickNode(id: string): boolean {
    const node = document.querySelector(`[data-node="${id}"]`);
    if (node) {
      fireEvent.click(node);
      return true;
    }
    return false;
  }

  function getTracedPathItems(): HTMLElement[] {
    const list = document.querySelector('ol.traced-path');
    if (!list) return [];
    return Array.from(list.querySelectorAll('li'));
  }

  it('should render Trace Flow Mode toggle', () => {
    render(<DependencyGraphViewer />);
    expect(findTraceCheckbox()).toBeInTheDocument();
  });

  it('should show node selection works in normal (non-trace) mode', () => {
    render(<DependencyGraphViewer />);

    expect(clickNode('lookup-wallet')).toBe(true);

    const labelElements = screen.getAllByText('GET /wallets/{id}');
    expect(labelElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Relationships \(/)).toBeInTheDocument();
  });

  it('should enable trace mode and show traced flow path', () => {
    render(<DependencyGraphViewer />);

    fireEvent.click(findTraceCheckbox());
    expect(clickNode('create-payment')).toBe(true);

    expect(screen.getByText(/Traced Flow Path/)).toBeInTheDocument();
  });

  it('should trace all nodes reachable from the clicked node', () => {
    render(<DependencyGraphViewer />);

    fireEvent.click(findTraceCheckbox());
    expect(clickNode('create-payment')).toBe(true);

    const pathHeader = screen.getByText(/Traced Flow Path/);
    const hopCountText = pathHeader.textContent!;
    const match = hopCountText.match(/\((\d+) hops\)/);
    expect(match).not.toBeNull();

    const hops = parseInt(match![1], 10);
    expect(hops).toBeGreaterThan(1);

    const tracedItems = getTracedPathItems();
    expect(tracedItems.length).toBe(hops);
  });

  it('should show flow path starting from the selected node', () => {
    render(<DependencyGraphViewer />);

    fireEvent.click(findTraceCheckbox());
    expect(clickNode('create-payment')).toBe(true);

    const tracedItems = getTracedPathItems();
    const firstItem = tracedItems[0].textContent!;
    expect(firstItem).toContain('📍');
    expect(firstItem).toContain('/payments');
  });

  it('should reset selected node when trace mode is disabled', () => {
    render(<DependencyGraphViewer />);

    fireEvent.click(findTraceCheckbox());
    expect(clickNode('create-payment')).toBe(true);
    expect(screen.getByText(/Traced Flow Path/)).toBeInTheDocument();

    fireEvent.click(findTraceCheckbox());
    expect(screen.queryByText(/Traced Flow Path/)).not.toBeInTheDocument();
  });

  it('should include traced flow path in legend', () => {
    render(<DependencyGraphViewer />);
    expect(screen.getByText('Traced flow path')).toBeInTheDocument();
  });

  it('should trace path through multiple layers of the graph', () => {
    render(<DependencyGraphViewer />);

    fireEvent.click(findTraceCheckbox());
    expect(clickNode('create-payment')).toBe(true);

    const pathHeader = screen.getByText(/Traced Flow Path/);
    const match = pathHeader.textContent!.match(/\((\d+) hops\)/);
    const hops = parseInt(match![1], 10);

    expect(hops).toBeGreaterThanOrEqual(3);
  });

  it('should show all nodes in the flow path in the details panel', () => {
    render(<DependencyGraphViewer />);

    fireEvent.click(findTraceCheckbox());
    expect(clickNode('validate-phone')).toBe(true);

    const tracedItems = getTracedPathItems();
    expect(tracedItems.length).toBeGreaterThan(1);

    const listText = tracedItems.map((li) => li.textContent).join(' ');
    expect(listText).toContain('/momo/validate');
  });
});
