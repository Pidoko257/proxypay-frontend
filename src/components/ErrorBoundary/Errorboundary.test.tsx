

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import * as Sentry from "@sentry/browser";
import { ErrorBoundary } from "./index";



jest.mock("@sentry/browser", () => ({
  withScope: jest.fn((cb) =>
    cb({
      setTag: jest.fn(),
      setExtra: jest.fn(),
      setLevel: jest.fn(),
    })
  ),
  captureException: jest.fn(),
}));

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});
afterEach(() => {
  jest.clearAllMocks();
});

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }): JSX.Element => {
  if (shouldThrow) throw new Error("Test explosion");
  return <div>Safe content</div>;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ErrorBoundary", () => {
  it("renders children normally when no error is thrown", () => {
    render(
      <ErrorBoundary section="Overview">
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the fallback UI when a child throws", () => {
    render(
      <ErrorBoundary section="Transactions">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText("Safe content")).not.toBeInTheDocument();
    expect(
      screen.getByText(/something went wrong in "Transactions"/i)
    ).toBeInTheDocument();
  });

  it("fallback shows a friendly message", () => {
    render(
      <ErrorBoundary section="Analytics">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/our team has been notified/i)).toBeInTheDocument();
  });

  it("fallback shows an error code in ERR-XXXXXXXX format", () => {
    render(
      <ErrorBoundary section="Analytics">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error code/i)).toBeInTheDocument();
    expect(screen.getByText(/ERR-/)).toBeInTheDocument();
  });

  it('fallback shows a "Reload section" button', () => {
    render(
      <ErrorBoundary section="Payments">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("button", { name: /reload section/i })
    ).toBeInTheDocument();
  });

  it("fallback container has role=alert for accessibility", () => {
    render(
      <ErrorBoundary section="Overview">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("reports the error to Sentry via withScope + captureException", () => {
    render(
      <ErrorBoundary section="Overview">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(Sentry.withScope).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test explosion" })
    );
  });

  it("tags Sentry scope with the correct dashboard_section", () => {
    const mockSetTag = jest.fn();
    (Sentry.withScope as jest.Mock).mockImplementationOnce((cb) =>
      cb({ setTag: mockSetTag, setExtra: jest.fn(), setLevel: jest.fn() })
    );

    render(
      <ErrorBoundary section="Transactions">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockSetTag).toHaveBeenCalledWith("error_boundary", "dashboard");
    expect(mockSetTag).toHaveBeenCalledWith(
      "dashboard_section",
      "Transactions"
    );
  });

  it("recovers and re-renders children after clicking Reload", () => {
    const { rerender } = render(
      <ErrorBoundary section="Overview">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

  
    expect(
      screen.getByRole("button", { name: /reload section/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reload section/i }));

    
    rerender(
      <ErrorBoundary section="Overview">
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the custom fallback render prop when provided", () => {
    const customFallback = jest.fn(() => <div>Custom error UI</div>);

    render(
      <ErrorBoundary section="Custom" fallback={customFallback}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(customFallback).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
  });

  it("falls back to 'this section' label when no section prop is given", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByText(/something went wrong in this section/i)
    ).toBeInTheDocument();
  });

  it("does not report to Sentry when children render without error", () => {
    render(
      <ErrorBoundary section="Payments">
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});