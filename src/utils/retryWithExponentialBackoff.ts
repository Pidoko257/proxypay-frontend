/**
 * retryWithExponentialBackoff — Issue #600
 *
 * Generic exponential-backoff retry helper.
 *
 * Features
 * ─────────
 * • Configurable max attempts (default 3).
 * • Configurable initial delay (default 1 s), doubles on each attempt.
 * • onRetry callback for logging / UI feedback on each failed attempt.
 * • Cancellation via AbortSignal.
 * • Custom delay function (useful in tests).
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  /** Called after each failed attempt (before the next retry is scheduled). */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Inject a custom delay function (for testing). */
  delay?: (delayMs: number) => Promise<void>;
  /** Optional AbortSignal — aborts the retry loop when signalled. */
  signal?: AbortSignal;
}

export async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 1000);
  const delay =
    options.delay ??
    ((delayMs: number) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Retry cancelled', 'AbortError'));
          });
        }
      }));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw new DOMException('Retry cancelled', 'AbortError');
    }

    try {
      return await operation();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      if (attempt === maxAttempts) throw error;

      const delayMs = initialDelayMs * 2 ** (attempt - 1);
      options.onRetry?.(error, attempt, delayMs);
      await delay(delayMs);
    }
  }

  throw new Error('Retry operation did not complete');
}
