import { getQueryCache } from './cache';
import type { DataSource, FetchSourceConfig, MutationConfig } from './types';

/**
 * Build URL with query parameters
 */
function buildUrl(
  baseUrl: string | (() => string),
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = typeof baseUrl === 'function' ? baseUrl() : baseUrl;

  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return url;

  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
}

/**
 * Generate cache key from config
 */
function generateCacheKey<T>(config: FetchSourceConfig<T>): string {
  if (config.cacheKey) {
    return typeof config.cacheKey === 'function' ? config.cacheKey() : config.cacheKey;
  }

  const url = typeof config.url === 'function' ? config.url() : config.url;
  const method = config.method ?? 'GET';
  const params = config.params ? JSON.stringify(config.params) : '';

  return `${method}:${url}${params}`;
}

/**
 * Sleep for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a fetch-based data source for queries
 */
export function createFetchSource<T>(
  config: FetchSourceConfig<T>,
): DataSource<T> & { refetch: () => Promise<T> } {
  const {
    url,
    method = 'GET',
    headers,
    body,
    params,
    transform,
    staleTime = 5 * 60 * 1000,
    cacheTime = 10 * 60 * 1000,
    retry = 3,
    retryDelay = 1000,
    fetcher = fetch,
    signal,
    onSuccess,
    onError,
  } = config;

  const cacheKey = generateCacheKey(config);
  const cache = getQueryCache();

  let inFlightRequest: Promise<T> | null = null;

  async function fetchData(): Promise<T> {
    const finalUrl = buildUrl(url, params);
    const finalHeaders = typeof headers === 'function' ? headers() : headers;
    const finalBody = typeof body === 'function' ? body() : body;

    const requestInit: RequestInit = {
      method,
      headers: finalHeaders,
      signal,
    };

    if (finalBody && method !== 'GET') {
      requestInit.body = JSON.stringify(finalBody);
      requestInit.headers = {
        'Content-Type': 'application/json',
        ...(finalHeaders as Record<string, string>),
      };
    }

    let lastError: Error | null = null;
    const maxRetries = retry === false ? 0 : retry;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetcher(finalUrl, requestInit);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        const data = transform ? transform(rawData) : (rawData as T);

        // Cache the result
        cache.set(cacheKey, data, { staleTime, cacheTime });

        onSuccess?.(data);
        return data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort
        if (signal?.aborted) {
          throw lastError;
        }

        // Retry with delay
        if (attempt < maxRetries) {
          await sleep(retryDelay * (attempt + 1));
        }
      }
    }

    onError?.(lastError!);
    throw lastError;
  }

  async function fetchWithDedup(): Promise<T> {
    // Return in-flight request if exists (deduplication)
    if (inFlightRequest) {
      return inFlightRequest;
    }

    // Check cache first (stale-while-revalidate)
    const cached = cache.get<T>(cacheKey);
    if (cached && !cache.isStale(cacheKey)) {
      return cached.data;
    }

    // Start new request
    inFlightRequest = fetchData().finally(() => {
      inFlightRequest = null;
    });

    // If we have stale data, return it while revalidating
    if (cached) {
      // Background revalidation
      inFlightRequest.catch(() => {
        // Ignore background errors
      });
      return cached.data;
    }

    return inFlightRequest;
  }

  return {
    type: 'query',
    cacheKey,

    fetch: fetchWithDedup,

    refetch: async () => {
      cache.invalidate(cacheKey);
      return fetchData();
    },

    invalidate: () => {
      cache.invalidate(cacheKey);
    },
  };
}

/**
 * Create a fetch-based data source for mutations
 */
export function createMutation<T, V = void>(
  config: MutationConfig<T, V>,
): {
  mutate: (variables: V) => Promise<T>;
  reset: () => void;
} {
  const {
    url,
    method = 'POST',
    headers,
    body,
    params,
    transform,
    retry = 0,
    retryDelay = 1000,
    fetcher = fetch,
    signal,
    onSuccess,
    onError,
  } = config;

  let _lastData: T | undefined;
  let _lastError: Error | undefined;
  // Track state for potential future use (status exposure)
  void _lastData;

  async function mutate(variables: V): Promise<T> {
    const finalUrl = buildUrl(url, params);
    const finalHeaders = typeof headers === 'function' ? headers() : headers;
    const finalBody = body ? body(variables) : variables;

    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(finalHeaders as Record<string, string>),
      },
      body: JSON.stringify(finalBody),
      signal,
    };

    let lastMutationError: Error | null = null;
    const maxRetries = retry === false ? 0 : retry;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetcher(finalUrl, requestInit);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        const data = transform ? transform(rawData) : (rawData as T);

        _lastData = data;
        _lastError = undefined;
        onSuccess?.(data);
        return data;
      } catch (error) {
        lastMutationError = error as Error;

        if (signal?.aborted) {
          throw lastMutationError;
        }

        if (attempt < maxRetries) {
          await sleep(retryDelay * (attempt + 1));
        }
      }
    }

    _lastError = lastMutationError!;
    onError?.(_lastError);
    throw _lastError;
  }

  function reset(): void {
    _lastData = undefined;
    _lastError = undefined;
  }

  return { mutate, reset };
}
