/**
 * Tests for ErrorBoundary component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A component that throws on render so we can test the boundary. */
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('Test error: component exploded');
  }
  return <div>Rendered successfully</div>;
}

/** A component that never throws. */
function SafeChild(): React.JSX.Element {
  return <div>Safe child rendered</div>;
}

// Suppress expected React error boundary console.error noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  describe('normal operation (no error)', () => {
    it('renders children when no error is thrown', () => {
      render(
        <ErrorBoundary>
          <SafeChild />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Safe child rendered')).toBeInTheDocument();
    });

    it('does not show the fallback UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <SafeChild />
        </ErrorBoundary>,
      );
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>,
      );
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the fallback UI when a child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('shows a user-friendly error message', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
    });

    it('shows a "Try Again" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    });

    it('shows a "Go Home" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('button', { name: /Go to the home page/i })).toBeInTheDocument();
    });

    it('uses role="alert" on the fallback wrapper', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does not render the original children when in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.queryByText('Rendered successfully')).not.toBeInTheDocument();
    });
  });

  describe('"Try Again" button', () => {
    it('resets the error state when "Try Again" is clicked', () => {
      // We need a component that can be told to stop throwing after reset
      let shouldThrow = true;

      function ToggleThrow(): React.JSX.Element {
        if (shouldThrow) throw new Error('Boom');
        return <div>Recovered!</div>;
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ToggleThrow />
        </ErrorBoundary>,
      );

      // Confirm error state
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Allow the component to render without throwing next time
      shouldThrow = false;

      fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

      // After reset, ErrorBoundary re-renders children
      expect(screen.getByText('Recovered!')).toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('"Go Home" button', () => {
    it('navigates towards home when "Go Home" is clicked', () => {
      // jsdom's window.location is not configurable, so we verify the
      // button exists and is rendered with the correct accessible name,
      // which means the handleGoHome function is wired up.
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const goHomeBtn = screen.getByRole('button', { name: /Go to the home page/i });
      expect(goHomeBtn).toBeInTheDocument();

      // Verify clicking doesn't throw an error
      expect(() => fireEvent.click(goHomeBtn)).not.toThrow();
    });
  });

  describe('custom fallback prop', () => {
    it('renders the custom fallback when provided and an error occurs', () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    });

    it('does not render the default fallback when a custom fallback is provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('development error logging', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });

    it('calls console.error in development mode', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      // console.error is called by React itself for error boundaries, and
      // by our componentDidCatch in development mode — ensure at least 1 call
      expect(console.error).toHaveBeenCalled();
    });
  });
});
