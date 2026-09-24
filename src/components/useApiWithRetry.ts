import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000]; // 1s, 2s, 4s

export interface UseApiWithRetryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  retry: () => void;
}

function useApiWithRetry<T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList = []
): UseApiWithRetryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // A counter that, when incremented, re-triggers the effect (used by retry())
  const [runId, setRunId] = useState<number>(0);

  // Track whether the effect is still mounted to avoid state updates after unmount
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isMountedRef.current) return;

      setLoading(true);
      setError(null);
      setData(null);
      setRetryCount(0);

      let attempt = 0;

      while (attempt <= MAX_RETRIES) {
        try {
          const result = await fetchFn();
          if (!cancelled && isMountedRef.current) {
            setData(result);
            setLoading(false);
          }
          return;
        } catch (err) {
          if (cancelled) return;

          const isLastAttempt = attempt === MAX_RETRIES;

          if (isLastAttempt) {
            if (isMountedRef.current) {
              setError(err instanceof Error ? err : new Error(String(err)));
              setLoading(false);
            }
            return;
          }

          // Wait exponential backoff before next attempt
          const delay = BACKOFF_DELAYS_MS[attempt] ?? 4000;
          if (isMountedRef.current) {
            setRetryCount(attempt + 1);
          }
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
          attempt++;
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, ...deps]);

  const retry = useCallback(() => {
    setRunId((prev) => prev + 1);
  }, []);

  return { data, loading, error, retryCount, retry };
}

export { useApiWithRetry };
export default useApiWithRetry;
