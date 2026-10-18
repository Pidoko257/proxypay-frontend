import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { RateLimitInfo, useRateLimitMonitor } from '../hooks/useRateLimitMonitor';

interface RateLimitContextType {
  rateLimitInfo: RateLimitInfo | null;
  shouldShowWarning: boolean;
  setShouldShowWarning: (show: boolean) => void;
  updateRateLimit: (headers: Record<string, any>) => void;
}

const RateLimitContext = createContext<RateLimitContextType | undefined>(undefined);

/**
 * Provider component for rate limit monitoring
 * Wraps your app to enable rate limit tracking across all API calls
 */
export const RateLimitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { rateLimitInfo, shouldShowWarning, setShouldShowWarning, updateRateLimit } =
    useRateLimitMonitor();

  const value: RateLimitContextType = {
    rateLimitInfo,
    shouldShowWarning,
    setShouldShowWarning,
    updateRateLimit,
  };

  return (
    <RateLimitContext.Provider value={value}>
      {children}
    </RateLimitContext.Provider>
  );
};

/**
 * Hook to access rate limit context
 * Use this in components that need to display or react to rate limit info
 */
export function useRateLimitContext(): RateLimitContextType {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimitContext must be used within RateLimitProvider');
  }
  return context;
}

export default RateLimitContext;
