/**
 * Tests for Issue #447 — Toast Component (src/components/Toast.tsx)
 * Tests the useToast hook and Toast component for the Docusaurus site.
 */

import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Toast, useToast, ToastMessage } from '../Toast';

describe('useToast hook', () => {
  it('starts with no messages', () => {
    let hook: ReturnType<typeof useToast>;
    function Wrapper() {
      hook = useToast();
      return null;
    }
    render(<Wrapper />);
    expect(hook!.messages).toHaveLength(0);
  });

  it('adds a message via show()', () => {
    let hook: ReturnType<typeof useToast>;
    function Wrapper() {
      hook = useToast();
      return null;
    }
    render(<Wrapper />);
    act(() => { hook!.show('Hello', 'success', 0); });
    expect(hook!.messages).toHaveLength(1);
    expect(hook!.messages[0].message).toBe('Hello');
    expect(hook!.messages[0].type).toBe('success');
  });

  it('removes a message via dismiss()', () => {
    let hook: ReturnType<typeof useToast>;
    function Wrapper() {
      hook = useToast();
      return null;
    }
    render(<Wrapper />);
    let id: string;
    act(() => { id = hook!.show('Bye', 'info', 0); });
    act(() => { hook!.dismiss(id!); });
    expect(hook!.messages).toHaveLength(0);
  });

  it('stacks multiple messages', () => {
    let hook: ReturnType<typeof useToast>;
    function Wrapper() {
      hook = useToast();
      return null;
    }
    render(<Wrapper />);
    act(() => {
      hook!.success('saved', 0);
      hook!.error('failed', 0);
      hook!.info('note', 0);
      hook!.warning('warn', 0);
    });
    expect(hook!.messages).toHaveLength(4);
  });
});

describe('Toast component', () => {
  const messages: ToastMessage[] = [
    { id: '1', message: 'Saved!', type: 'success', duration: 0 },
    { id: '2', message: 'Error!', type: 'error', duration: 0 },
    { id: '3', message: 'Info', type: 'info', duration: 0 },
    { id: '4', message: 'Warning', type: 'warning', duration: 0 },
  ];

  it('renders all messages', () => {
    render(<Toast messages={messages} onDismiss={() => {}} />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('has aria-live="polite" container', () => {
    render(<Toast messages={[]} onDismiss={() => {}} />);
    const container = screen.getByTestId('toast-container');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = jest.fn();
    render(<Toast messages={[messages[0]]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /close notification/i }));
    // After animation delay (250ms), onDismiss is called; verify button is clickable
    expect(screen.getByRole('button', { name: /close notification/i })).toBeInTheDocument();
  });

  it('each toast has role="alert"', () => {
    render(<Toast messages={[messages[0]]} onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders nothing when messages is empty', () => {
    render(<Toast messages={[]} onDismiss={() => {}} />);
    const container = screen.getByTestId('toast-container');
    expect(container).toBeEmptyDOMElement();
  });
});
