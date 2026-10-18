import { useEffect, useCallback, useState, useRef } from 'react';

/**
 * Rate limit information from API response headers
 */
export interface RateLimitInfo {
  limit: number; // Total requests allowed per window
  remaining: number; // Requests remaining in current window
  reset: number; // Unix timestamp when the limit resets
  used: number; // Requests used in current window
  percentageUsed: number; // Calculated percentage (0-100)
  isApproaching: boolean; // True if >= 80% of limit used
  isCritical: boolean; // True if >= 90% of limit used
  timeToReset: number; // Milliseconds until reset
  formattedReset: string; // Human-readable reset time
}

/**
 * Extract rate limit headers from API response
 * Supports multiple header naming conventions
 */
export function parseRateLimitHeaders(headers: Record<string, any>): RateLimitInfo | null {
  try {
    // Try common header names (case-insensitive)
    const getHeader = (names: string[]) => {
      for (const name of names) {
        for (const [key, value] of Object.entries(headers || {})) {
          if (key.toLowerCase() === name.toLowerCase()) {
            return value;
          }
        }
      }
      return undefined;
    };

    const limit = parseInt(getHeader(['x-ratelimit-limit', 'ratelimit-limit']) || '0', 10);
    const remaining = parseInt(getHeader(['x-ratelimit-remaining', 'ratelimit-remaining']) || '0', 10);
    const reset = parseInt(getHeader(['x-ratelimit-reset', 'ratelimit-reset']) || '0', 10);

    if (!limit || !remaining === undefined || !reset) {
      return null;
    }

    const now = Date.now();
    const resetMs = reset * 1000; // Convert to milliseconds
    const timeToReset = Math.max(0, resetMs - now);
    const used = limit - remaining;
    const percentageUsed = Math.round((used / limit) * 100);

    return {
      limit,
      remaining,
      reset,
      used,
      percentageUsed,
      isApproaching: percentageUsed >= 80,
      isCritical: percentageUsed >= 90,
      timeToReset,
      formattedReset: formatReset(timeToReset),
    };
  } catch (error) {
    console.warn('Failed to parse rate limit headers:', error);
    return null;
  }
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatReset(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Hook to monitor rate limit status
 * Tracks rate limit info from intercepted API responses
 */
export function useRateLimitMonitor() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [shouldShowWarning, setShouldShowWarning] = useState(false);
  const lastNotificationTime = useRef<number>(0);
  const notificationCooldown = 5000; // Don't show warning more than once per 5s

  // Update rate limit info from API response
  const updateRateLimit = useCallback((headers: Record<string, any>) => {
    const info = parseRateLimitHeaders(headers);
    if (info) {
      setRateLimitInfo(info);

      // Show warning toast if approaching limit
      if (info.isApproaching && !info.isCritical && Date.now() - lastNotificationTime.current > notificationCooldown) {
        setShouldShowWarning(true);
        lastNotificationTime.current = Date.now();
      }

      // Show critical warning if critical
      if (info.isCritical && Date.now() - lastNotificationTime.current > notificationCooldown) {
        setShouldShowWarning(true);
        lastNotificationTime.current = Date.now();
      }
    }
  }, []);

  // Auto-hide warning after 5 seconds
  useEffect(() => {
    if (shouldShowWarning) {
      const timer = setTimeout(() => setShouldShowWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowWarning]);

  return {
    rateLimitInfo,
    shouldShowWarning,
    setShouldShowWarning,
    updateRateLimit,
  };
}

/**
 * Format rate limit info for display
 */
export function formatRateLimitDisplay(info: RateLimitInfo): string {
  return `${info.remaining}/${info.limit} requests remaining (${info.percentageUsed}% used, resets in ${info.formattedReset})`;
}

/**
 * Get status level for visual indicators
 */
export function getRateLimitStatus(info: RateLimitInfo | null): 'ok' | 'warning' | 'critical' {
  if (!info) return 'ok';
  if (info.isCritical) return 'critical';
  if (info.isApproaching) return 'warning';
  return 'ok';
}
