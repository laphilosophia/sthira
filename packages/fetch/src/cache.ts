import type { CacheEntry, CacheOptions } from './types'

/**
 * In-memory cache for data fetching
 * Implements stale-while-revalidate pattern
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private gcInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start garbage collection
    this.startGC()
  }

  /**
   * Get cached data
   */
  get<T>(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) return undefined

    // Check if cache has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return undefined
    }

    return entry
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { staleTime = 5 * 60 * 1000, cacheTime = 10 * 60 * 1000 } = options

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      cacheTime,
    })
  }

  /**
   * Check if data is stale
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true

    return Date.now() - entry.timestamp > entry.staleTime
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.cacheTime
  }

  /**
   * Invalidate a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear()
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Start garbage collection interval
   */
  private startGC(): void {
    // Run GC every minute
    this.gcInterval = setInterval(() => {
      this.gc()
    }, 60 * 1000)
  }

  /**
   * Garbage collect expired entries
   */
  private gc(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Destroy cache and stop GC
   */
  destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
      this.gcInterval = null
    }
    this.cache.clear()
  }
}

// Global cache instance
let globalCache: QueryCache | null = null

/**
 * Get or create the global cache instance
 */
export function getQueryCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache()
  }
  return globalCache
}

/**
 * Reset the global cache (for testing)
 */
export function resetQueryCache(): void {
  if (globalCache) {
    globalCache.destroy()
    globalCache = null
  }
}
