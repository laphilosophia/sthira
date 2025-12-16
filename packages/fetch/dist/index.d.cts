import { Unsubscribe } from '@sthira/core';

/**
 * DataSource type
 */
type DataSourceType = 'query' | 'mutation';
/**
 * DataSource interface for data fetching
 */
interface DataSource<T> {
    readonly type: DataSourceType;
    readonly cacheKey: string;
    /** Fetch the data */
    fetch(): Promise<T>;
    /** Invalidate cached data */
    invalidate(): void;
    /** Subscribe to data changes (for SSE/WS) */
    subscribe?(callback: (data: T) => void): Unsubscribe;
}
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    staleTime: number;
    cacheTime: number;
}
interface CacheOptions {
    /** Time until data is considered stale (ms) */
    staleTime?: number;
    /** Time until data is garbage collected (ms) */
    cacheTime?: number;
}
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface FetchSourceConfig<T> {
    /** Request URL */
    url: string | (() => string);
    /** HTTP method */
    method?: HttpMethod;
    /** Request headers */
    headers?: HeadersInit | (() => HeadersInit);
    /** Request body (for mutations) */
    body?: unknown | (() => unknown);
    /** Query parameters */
    params?: Record<string, string | number | boolean | undefined>;
    /** Transform response */
    transform?: (response: unknown) => T;
    /** Custom cache key */
    cacheKey?: string | (() => string);
    /** Stale time in ms (default: 5 minutes) */
    staleTime?: number;
    /** Cache time in ms (default: 10 minutes) */
    cacheTime?: number;
    /** Retry count (default: 3) */
    retry?: number | false;
    /** Retry delay in ms (default: 1000) */
    retryDelay?: number;
    /** Custom fetch function */
    fetcher?: typeof fetch;
    /** Abort signal */
    signal?: AbortSignal;
    /** Success callback */
    onSuccess?: (data: T) => void;
    /** Error callback */
    onError?: (error: Error) => void;
}
interface MutationConfig<T, V = void> extends Omit<FetchSourceConfig<T>, 'body'> {
    /** Body factory from variables */
    body?: (variables: V) => unknown;
}
type QueryStatus = 'idle' | 'pending' | 'success' | 'error';
interface QueryResult<T> {
    data: T | undefined;
    error: Error | undefined;
    status: QueryStatus;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    isSuccess: boolean;
    isStale: boolean;
    refetch: () => Promise<T>;
}
interface MutationResult<T, V = void> {
    data: T | undefined;
    error: Error | undefined;
    status: QueryStatus;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    mutate: (variables: V) => Promise<T>;
    reset: () => void;
}

/**
 * Create a fetch-based data source for queries
 */
declare function createFetchSource<T>(config: FetchSourceConfig<T>): DataSource<T> & {
    refetch: () => Promise<T>;
};
/**
 * Create a fetch-based data source for mutations
 */
declare function createMutation<T, V = void>(config: MutationConfig<T, V>): {
    mutate: (variables: V) => Promise<T>;
    reset: () => void;
};

/**
 * In-memory cache for data fetching
 * Implements stale-while-revalidate pattern
 */
declare class QueryCache {
    private cache;
    private gcInterval;
    constructor();
    /**
     * Get cached data
     */
    get<T>(key: string): CacheEntry<T> | undefined;
    /**
     * Set cached data
     */
    set<T>(key: string, data: T, options?: CacheOptions): void;
    /**
     * Check if data is stale
     */
    isStale(key: string): boolean;
    /**
     * Check if cache entry has expired
     */
    private isExpired;
    /**
     * Invalidate a cache entry
     */
    invalidate(key: string): void;
    /**
     * Invalidate all entries matching a prefix
     */
    invalidatePrefix(prefix: string): void;
    /**
     * Invalidate all cache entries
     */
    invalidateAll(): void;
    /**
     * Get all cache keys
     */
    keys(): string[];
    /**
     * Get cache size
     */
    get size(): number;
    /**
     * Start garbage collection interval
     */
    private startGC;
    /**
     * Garbage collect expired entries
     */
    private gc;
    /**
     * Destroy cache and stop GC
     */
    destroy(): void;
}
/**
 * Get or create the global cache instance
 */
declare function getQueryCache(): QueryCache;
/**
 * Reset the global cache (for testing)
 */
declare function resetQueryCache(): void;

/**
 * Global sthira API for router integration and data management
 */
declare const sthira: {
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
    prefetch<T>(source: DataSource<T>): Promise<void>;
    /**
     * Prefetch multiple data sources in parallel
     *
     * @example
     * ```ts
     * await sthira.prefetchAll([usersSource, postsSource])
     * ```
     */
    prefetchAll(sources: DataSource<unknown>[]): Promise<void>;
    /**
     * Ensure data exists (fetch if not cached)
     *
     * @example
     * ```ts
     * const users = await sthira.ensureData(usersSource)
     * ```
     */
    ensureData<T>(source: DataSource<T>): Promise<T>;
    /**
     * Invalidate a specific data source
     */
    invalidate<T>(source: DataSource<T>): void;
    /**
     * Invalidate all sources matching a cache key prefix
     *
     * @example
     * ```ts
     * sthira.invalidatePrefix('GET:/api/users')
     * ```
     */
    invalidatePrefix(prefix: string): void;
    /**
     * Invalidate all cached data
     */
    invalidateAll(): void;
    /**
     * Get the query cache instance
     */
    getCache(): QueryCache;
    /**
     * Create a router loader function
     *
     * @example
     * ```ts
     * export const loader = sthira.createLoader([usersSource, postsSource])
     * ```
     */
    createLoader<T extends DataSource<unknown>[], R = { [K in keyof T]: T[K] extends DataSource<infer U> ? U : never; }>(sources: T): () => Promise<R>;
};

export { type CacheEntry, type CacheOptions, type DataSource, type DataSourceType, type FetchSourceConfig, type HttpMethod, type MutationConfig, type MutationResult, QueryCache, type QueryResult, type QueryStatus, createFetchSource, createMutation, getQueryCache, resetQueryCache, sthira };
