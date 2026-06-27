import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useEnvironment } from './useEnvironment';

export interface RateLimitState {
  limit: number | null;
  remaining: number | null;
  resetAt: Date | null;
}

interface RateLimitContextValue extends RateLimitState {
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

function parseHeaders(headers: Headers): Partial<RateLimitState> {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');
  return {
    limit: limit !== null ? Number(limit) : undefined,
    remaining: remaining !== null ? Number(remaining) : undefined,
    // X-RateLimit-Reset is a Unix timestamp (seconds)
    resetAt: reset !== null ? new Date(Number(reset) * 1000) : undefined,
  };
}

export function RateLimitProvider({ children }: { children: React.ReactNode }) {
  const { apiBaseUrl } = useEnvironment();
  const [state, setState] = useState<RateLimitState>({ limit: null, remaining: null, resetAt: null });

  // Reset when environment changes
  useEffect(() => {
    setState({ limit: null, remaining: null, resetAt: null });
  }, [apiBaseUrl]);

  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await fetch(input, init);
      const parsed = parseHeaders(response.headers);
      setState((prev) => ({ ...prev, ...parsed }));
      return response;
    },
    [],
  );

  return (
    <RateLimitContext.Provider value={{ ...state, apiFetch }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit(): RateLimitContextValue {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error('useRateLimit must be used within RateLimitProvider');
  return ctx;
}
