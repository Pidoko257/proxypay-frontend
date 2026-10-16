import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApiCacheService, CacheStats, ApiCacheConfig } from '../caching/apiCacheService';

interface ApiCacheContextType {
  stats: CacheStats;
  cachedFetch: <T>(url: string, options?: RequestInit, customTtl?: number) => Promise<T>;
  invalidateCache: (key: string) => boolean;
  invalidateEndpoint: (endpoint: string) => number;
  clearCache: () => void;
  refreshStats: () => void;
}

const ApiCacheContext = createContext<ApiCacheContextType | null>(null);

export function ApiCacheProvider({ children, config }: { children: ReactNode; config?: ApiCacheConfig }): React.JSX.Element {
  const cacheService = ApiCacheService.getInstance(config);
  const [stats, setStats] = useState<CacheStats>(() => cacheService.getStats());

  const refreshStats = useCallback(() => {
    setStats(cacheService.getStats());
  }, [cacheService]);

  const cachedFetch = useCallback(async <T>(
    url: string,
    options?: RequestInit,
    customTtl?: number
  ): Promise<T> => {
    const method = (options?.method || 'GET').toUpperCase();
    const cacheKey = `${method}:${url}${options?.body ? `:${typeof options.body === 'string' ? options.body : JSON.stringify(options.body)}` : ''}`;

    if (method === 'GET') {
      const cached = cacheService.get<T>(cacheKey);
      if (cached !== null) {
        refreshStats();
        return cached;
      }
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (method === 'GET') {
      cacheService.set(cacheKey, url, data, customTtl, method);
    } else {
      cacheService.invalidateOnMutation(url, method);
    }

    refreshStats();
    return data as T;
  }, [cacheService, refreshStats]);

  const invalidateCache = useCallback((key: string): boolean => {
    const result = cacheService.invalidate(key);
    refreshStats();
    return result;
  }, [cacheService, refreshStats]);

  const invalidateEndpoint = useCallback((endpoint: string): number => {
    const count = cacheService.invalidateEndpoint(endpoint);
    refreshStats();
    return count;
  }, [cacheService, refreshStats]);

  const clearCache = useCallback((): void => {
    cacheService.clear();
    refreshStats();
  }, [cacheService, refreshStats]);

  return (
    <ApiCacheContext.Provider
      value={{
        stats,
        cachedFetch,
        invalidateCache,
        invalidateEndpoint,
        clearCache,
        refreshStats,
      }}
    >
      {children}
    </ApiCacheContext.Provider>
  );
}

export function useApiCache(): ApiCacheContextType {
  const context = useContext(ApiCacheContext);
  if (!context) {
    throw new Error('useApiCache must be used within an ApiCacheProvider');
  }
  return context;
}
