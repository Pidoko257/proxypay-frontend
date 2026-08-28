export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  delay?: (delayMs: number) => Promise<void>;
}

export async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 1000);
  const delay = options.delay ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delayMs = initialDelayMs * 2 ** (attempt - 1);
      options.onRetry?.(error, attempt, delayMs);
      await delay(delayMs);
    }
  }

  throw new Error('Retry operation did not complete');
}
