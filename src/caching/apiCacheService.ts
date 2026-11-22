export interface CacheEntry<T = any> {
  key: string;
  endpoint: string;
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  method?: string;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  storageSizeBytes: number;
  entries: CacheEntry[];
}

export interface ApiCacheConfig {
  defaultTtl?: number; // ms, default 5 mins (300000)
  endpointTtls?: Record<string, number>; // endpoint path -> TTL in ms
  storageKey?: string;
}

const DEFAULT_CACHE_KEY = 'proxypay-api-cache';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export class ApiCacheService {
  private static instance: ApiCacheService;
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private endpointTtls: Record<string, number> = {
    '/health': 10000, // 10s
    '/transactions': 60000, // 1m
    '/notifications': 30000, // 30s
    '/metrics': 30000, // 30s
  };
  private defaultTtl: number = DEFAULT_TTL;
  private storageKey: string = DEFAULT_CACHE_KEY;

  constructor(config?: ApiCacheConfig) {
    if (config?.defaultTtl) this.defaultTtl = config.defaultTtl;
    if (config?.endpointTtls) this.endpointTtls = { ...this.endpointTtls, ...config.endpointTtls };
    if (config?.storageKey) this.storageKey = config.storageKey;
    this.loadFromStorage();
  }

  public static getInstance(config?: ApiCacheConfig): ApiCacheService {
    if (!ApiCacheService.instance) {
      ApiCacheService.instance = new ApiCacheService(config);
    }
    return ApiCacheService.instance;
  }

  public static resetInstance(config?: ApiCacheConfig): ApiCacheService {
    ApiCacheService.instance = new ApiCacheService(config);
    return ApiCacheService.instance;
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          parsed.forEach((entry: CacheEntry) => {
            if (entry && entry.timestamp && entry.ttl && (now - entry.timestamp < entry.ttl)) {
              this.cache.set(entry.key, entry);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load API cache from localStorage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const entries = Array.from(this.cache.values());
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save API cache to localStorage:', error);
    }
  }

  public getTtlForEndpoint(endpoint: string): number {
    if (this.endpointTtls[endpoint] !== undefined) {
      return this.endpointTtls[endpoint];
    }
    for (const [pattern, ttl] of Object.entries(this.endpointTtls)) {
      if (endpoint.startsWith(pattern) || endpoint.includes(pattern)) {
        return ttl;
      }
    }
    return this.defaultTtl;
  }

  public setEndpointTtl(endpoint: string, ttl: number): void {
    this.endpointTtls[endpoint] = ttl;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp >= entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      this.saveToStorage();
      return null;
    }

    entry.hitCount++;
    this.hits++;
    return entry.data as T;
  }

  public set<T>(key: string, endpoint: string, data: T, customTtl?: number, method: string = 'GET'): void {
    const ttl = customTtl ?? this.getTtlForEndpoint(endpoint);
    const entry: CacheEntry<T> = {
      key,
      endpoint,
      data,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
      method: method.toUpperCase(),
    };
    this.cache.set(key, entry);
    this.saveToStorage();
  }

  public invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public invalidateEndpoint(endpointPattern: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.endpoint === endpointPattern || entry.endpoint.startsWith(endpointPattern) || endpointPattern.startsWith(entry.endpoint)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.saveToStorage();
    }
    return count;
  }

  public invalidateOnMutation(mutationEndpoint: string, method: string): void {
    const upperMethod = method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
      const segments = mutationEndpoint.split('/').filter(Boolean);
      const baseResource = segments.length > 0 ? `/${segments[0]}` : mutationEndpoint;

      this.invalidateEndpoint(mutationEndpoint);
      this.invalidateEndpoint(baseResource);

      for (const [key, entry] of this.cache.entries()) {
        const entryBase = entry.endpoint.split('/').filter(Boolean)[0];
        const mutationBase = segments[0];
        if (entry.endpoint.includes(baseResource) || baseResource.includes(entry.endpoint) || (entryBase && mutationBase && entryBase === mutationBase)) {
          this.cache.delete(key);
        }
      }
      this.saveToStorage();
    }
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('Failed to clear API cache from localStorage:', error);
    }
  }

  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    
    let storageSizeBytes = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          storageSizeBytes = new Blob([stored]).size;
        }
      }
    } catch {
      storageSizeBytes = JSON.stringify(entries).length * 2;
    }

    return {
      totalEntries: entries.length,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      storageSizeBytes,
      entries,
    };
  }
}
