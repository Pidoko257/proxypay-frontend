import { retryWithExponentialBackoff } from '../retryWithExponentialBackoff';

describe('retryWithExponentialBackoff', () => {
  it('retries with exponential delays and resolves after recovery', async () => {
    let attempts = 0;
    const delays: number[] = [];

    await expect(retryWithExponentialBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary');
        return 'ok';
      },
      { initialDelayMs: 1, delay: async (delayMs) => { delays.push(delayMs); } }
    )).resolves.toBe('ok');

    expect(attempts).toBe(3);
    expect(delays).toEqual([1, 2]);
  });

  it('throws the final error after the attempt limit', async () => {
    await expect(retryWithExponentialBackoff(
      async () => { throw new Error('permanent'); },
      { maxAttempts: 2, delay: async () => undefined }
    )).rejects.toThrow('permanent');
  });
});
