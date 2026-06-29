import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/browser";
import ErrorFallback from "./Errorfallback";

export interface FallbackProps {
  error: Error;
  errorId: string;
  section?: string;
  onReset: () => void;
}

export interface ErrorBoundaryProps {

  section?: string;
  children: ReactNode;

  fallback?: (props: FallbackProps) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}


class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: "" };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate a short human-readable incident ID shown in the fallback UI
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, error, errorId };
  }

 
  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { section } = this.props;
    const { errorId } = this.state;

    
    Sentry.withScope((scope) => {
      scope.setTag("error_boundary", "dashboard");
      if (section) scope.setTag("dashboard_section", section);
      scope.setExtra("errorId", errorId);
      scope.setExtra("componentStack", info.componentStack);
      scope.setLevel("error");
      Sentry.captureException(error);
    });

   
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[ErrorBoundary] Section "${section ?? "unknown"}" crashed (${errorId}):`,
        error,
        info.componentStack
      );
    }
  }

  handleReset(): void {
    this.setState({ hasError: false, error: null, errorId: "" });
  }

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { children, fallback, section } = this.props;

    if (hasError && error) {
      const fallbackProps: FallbackProps = {
        error,
        errorId,
        section,
        onReset: this.handleReset,
      };

      
      if (fallback) return fallback(fallbackProps);
      return <ErrorFallback {...fallbackProps} />;
    }

    return children;
  }
}

export default ErrorBoundary;