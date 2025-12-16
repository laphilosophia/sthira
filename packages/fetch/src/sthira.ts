import { getQueryCache } from './cache'
import type { DataSource } from './types'

/**
 * Global sthira API for router integration and data management
 */
export const sthira = {
  /**
   * Prefetch data for a data source
   * Useful for router loaders
   *
   * @example
   * ```ts
   * // In router loader
   * export async function loader() {
   *   await sthira.prefetch(usersSource)
   *   return null
   * }
   * ```
   */
  async prefetch<T>(source: DataSource<T>): Promise<void> {
    await source.fetch()
  },

  /**
   * Prefetch multiple data sources in parallel
   *
   * @example
   * ```ts
   * await sthira.prefetchAll([usersSource, postsSource])
   * ```
   */
  async prefetchAll(sources: DataSource<unknown>[]): Promise<void> {
    await Promise.all(sources.map((source) => source.fetch()))
  },

  /**
   * Ensure data exists (fetch if not cached)
   *
   * @example
   * ```ts
   * const users = await sthira.ensureData(usersSource)
   * ```
   */
  async ensureData<T>(source: DataSource<T>): Promise<T> {
    const cache = getQueryCache()
    const cached = cache.get<T>(source.cacheKey)

    if (cached && !cache.isStale(source.cacheKey)) {
      return cached.data
    }

    return source.fetch()
  },

  /**
   * Invalidate a specific data source
   */
  invalidate<T>(source: DataSource<T>): void {
    source.invalidate()
  },

  /**
   * Invalidate all sources matching a cache key prefix
   *
   * @example
   * ```ts
   * sthira.invalidatePrefix('GET:/api/users')
   * ```
   */
  invalidatePrefix(prefix: string): void {
    getQueryCache().invalidatePrefix(prefix)
  },

  /**
   * Invalidate all cached data
   */
  invalidateAll(): void {
    getQueryCache().invalidateAll()
  },

  /**
   * Get the query cache instance
   */
  getCache() {
    return getQueryCache()
  },

  /**
   * Create a router loader function
   *
   * @example
   * ```ts
   * export const loader = sthira.createLoader([usersSource, postsSource])
   * ```
   */
  createLoader<
    T extends DataSource<unknown>[],
    R = { [K in keyof T]: T[K] extends DataSource<infer U> ? U : never }
  >(sources: T): () => Promise<R> {
    return async () => {
      const results = await Promise.all(sources.map((source) => source.fetch()))
      return results as R
    }
  },
}
