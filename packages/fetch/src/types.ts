import type { Unsubscribe } from '@sthira/core';

// ============================================================================
// DataSource Types
// ============================================================================

/**
 * DataSource type
 */
export type DataSourceType = 'query' | 'mutation';

/**
 * DataSource interface for data fetching
 */
export interface DataSource<T> {
  readonly type: DataSourceType;
  readonly cacheKey: string;

  /** Fetch the data */
  fetch(): Promise<T>;

  /** Invalidate cached data */
  invalidate(): void;

  /** Subscribe to data changes (for SSE/WS) */
  subscribe?(callback: (data: T) => void): Unsubscribe;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
  cacheTime: number;
}

export interface CacheOptions {
  /** Time until data is considered stale (ms) */
  staleTime?: number;
  /** Time until data is garbage collected (ms) */
  cacheTime?: number;
}

// ============================================================================
// Fetch Source Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface FetchSourceConfig<T> {
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

export interface MutationConfig<T, V = void> extends Omit<FetchSourceConfig<T>, 'body'> {
  /** Body factory from variables */
  body?: (variables: V) => unknown;
}

// ============================================================================
// Query Result Types
// ============================================================================

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export interface QueryResult<T> {
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

export interface MutationResult<T, V = void> {
  data: T | undefined;
  error: Error | undefined;
  status: QueryStatus;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: V) => Promise<T>;
  reset: () => void;
}
