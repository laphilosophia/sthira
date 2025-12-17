'use strict';

// src/cache.ts
var QueryCache = class {
  cache = /* @__PURE__ */ new Map();
  gcInterval = null;
  constructor() {
    this.startGC();
  }
  /**
   * Get cached data
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return void 0;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return void 0;
    }
    return entry;
  }
  /**
   * Set cached data
   */
  set(key, data, options = {}) {
    const { staleTime = 5 * 60 * 1e3, cacheTime = 10 * 60 * 1e3 } = options;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      cacheTime
    });
  }
  /**
   * Check if data is stale
   */
  isStale(key) {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.staleTime;
  }
  /**
   * Check if cache entry has expired
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.cacheTime;
  }
  /**
   * Invalidate a cache entry
   */
  invalidate(key) {
    this.cache.delete(key);
  }
  /**
   * Invalidate all entries matching a prefix
   */
  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Invalidate all cache entries
   */
  invalidateAll() {
    this.cache.clear();
  }
  /**
   * Get all cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }
  /**
   * Get cache size
   */
  get size() {
    return this.cache.size;
  }
  /**
   * Start garbage collection interval
   */
  startGC() {
    this.gcInterval = setInterval(() => {
      this.gc();
    }, 60 * 1e3);
  }
  /**
   * Garbage collect expired entries
   */
  gc() {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Destroy cache and stop GC
   */
  destroy() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    this.cache.clear();
  }
};
var globalCache = null;
function getQueryCache() {
  if (!globalCache) {
    globalCache = new QueryCache();
  }
  return globalCache;
}
function resetQueryCache() {
  if (globalCache) {
    globalCache.destroy();
    globalCache = null;
  }
}

// src/fetch.ts
function buildUrl(baseUrl, params) {
  const url = typeof baseUrl === "function" ? baseUrl() : baseUrl;
  if (!params) return url;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0) {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  if (!queryString) return url;
  return url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
}
function generateCacheKey(config) {
  if (config.cacheKey) {
    return typeof config.cacheKey === "function" ? config.cacheKey() : config.cacheKey;
  }
  const url = typeof config.url === "function" ? config.url() : config.url;
  const method = config.method ?? "GET";
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${method}:${url}${params}`;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function createAbortSignal(timeout, externalSignal) {
  const controller = new AbortController();
  let timeoutId;
  if (timeout && timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new DOMException(`Request timeout after ${timeout}ms`, "TimeoutError"));
    }, timeout);
  }
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      const onAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener("abort", onAbort, { once: true });
    }
  }
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
  return { signal: controller.signal, controller, cleanup };
}
function createFetchSource(config) {
  const {
    url,
    method = "GET",
    headers,
    body,
    params,
    transform,
    staleTime = 5 * 60 * 1e3,
    cacheTime = 10 * 60 * 1e3,
    retry = 3,
    retryDelay = 1e3,
    fetcher = fetch,
    signal: externalSignal,
    timeout,
    cancelOnNewRequest = true,
    onSuccess,
    onError
  } = config;
  const cacheKey = generateCacheKey(config);
  const cache = getQueryCache();
  let inFlightRequest = null;
  let currentController = null;
  async function fetchData(abortContext) {
    const finalUrl = buildUrl(url, params);
    const finalHeaders = typeof headers === "function" ? headers() : headers;
    const finalBody = typeof body === "function" ? body() : body;
    const { signal, cleanup } = abortContext ?? createAbortSignal(timeout, externalSignal);
    const requestInit = {
      method,
      headers: finalHeaders,
      signal
    };
    if (finalBody && method !== "GET") {
      requestInit.body = JSON.stringify(finalBody);
      requestInit.headers = {
        "Content-Type": "application/json",
        ...finalHeaders
      };
    }
    let lastError = null;
    const maxRetries = retry === false ? 0 : retry;
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetcher(finalUrl, requestInit);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const rawData = await response.json();
          const data = transform ? transform(rawData) : rawData;
          cache.set(cacheKey, data, { staleTime, cacheTime });
          onSuccess?.(data);
          return data;
        } catch (error) {
          lastError = error;
          if (signal.aborted) {
            throw lastError;
          }
          if (attempt < maxRetries) {
            await sleep(retryDelay * (attempt + 1));
          }
        }
      }
      onError?.(lastError);
      throw lastError;
    } finally {
      cleanup();
    }
  }
  async function fetchWithDedup() {
    if (cancelOnNewRequest && currentController) {
      currentController.abort(new DOMException("Request superseded", "AbortError"));
    }
    if (!cancelOnNewRequest && inFlightRequest) {
      return inFlightRequest;
    }
    const cached = cache.get(cacheKey);
    if (cached && !cache.isStale(cacheKey)) {
      return cached.data;
    }
    const abortContext = createAbortSignal(timeout, externalSignal);
    currentController = abortContext.controller;
    inFlightRequest = fetchData(abortContext).finally(() => {
      inFlightRequest = null;
      currentController = null;
    });
    if (cached) {
      inFlightRequest.catch(() => {
      });
      return cached.data;
    }
    return inFlightRequest;
  }
  function abort() {
    if (currentController) {
      currentController.abort(new DOMException("Request aborted", "AbortError"));
      currentController = null;
    }
  }
  return {
    type: "query",
    cacheKey,
    fetch: fetchWithDedup,
    refetch: async () => {
      abort();
      cache.invalidate(cacheKey);
      const abortContext = createAbortSignal(timeout, externalSignal);
      currentController = abortContext.controller;
      return fetchData(abortContext).finally(() => {
        currentController = null;
      });
    },
    invalidate: () => {
      cache.invalidate(cacheKey);
    },
    abort
  };
}
function createMutation(config) {
  const {
    url,
    method = "POST",
    headers,
    body,
    params,
    transform,
    retry = 0,
    retryDelay = 1e3,
    fetcher = fetch,
    signal: externalSignal,
    timeout,
    onSuccess,
    onError
  } = config;
  let _lastData;
  let _lastError;
  let currentController = null;
  async function mutate(variables) {
    if (currentController) {
      currentController.abort(new DOMException("Mutation superseded", "AbortError"));
    }
    const finalUrl = buildUrl(url, params);
    const finalHeaders = typeof headers === "function" ? headers() : headers;
    const finalBody = body ? body(variables) : variables;
    const { signal, controller, cleanup } = createAbortSignal(timeout, externalSignal);
    currentController = controller;
    const requestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...finalHeaders
      },
      body: JSON.stringify(finalBody),
      signal
    };
    let lastMutationError = null;
    const maxRetries = retry === false ? 0 : retry;
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetcher(finalUrl, requestInit);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const rawData = await response.json();
          const data = transform ? transform(rawData) : rawData;
          _lastData = data;
          _lastError = void 0;
          onSuccess?.(data);
          return data;
        } catch (error) {
          lastMutationError = error;
          if (signal.aborted) {
            throw lastMutationError;
          }
          if (attempt < maxRetries) {
            await sleep(retryDelay * (attempt + 1));
          }
        }
      }
      _lastError = lastMutationError;
      onError?.(_lastError);
      throw _lastError;
    } finally {
      cleanup();
      currentController = null;
    }
  }
  function reset() {
    _lastData = void 0;
    _lastError = void 0;
  }
  function abort() {
    if (currentController) {
      currentController.abort(new DOMException("Mutation aborted", "AbortError"));
      currentController = null;
    }
  }
  return { mutate, reset, abort };
}

// src/sthira.ts
var sthira = {
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
  async prefetch(source) {
    await source.fetch();
  },
  /**
   * Prefetch multiple data sources in parallel
   *
   * @example
   * ```ts
   * await sthira.prefetchAll([usersSource, postsSource])
   * ```
   */
  async prefetchAll(sources) {
    await Promise.all(sources.map((source) => source.fetch()));
  },
  /**
   * Ensure data exists (fetch if not cached)
   *
   * @example
   * ```ts
   * const users = await sthira.ensureData(usersSource)
   * ```
   */
  async ensureData(source) {
    const cache = getQueryCache();
    const cached = cache.get(source.cacheKey);
    if (cached && !cache.isStale(source.cacheKey)) {
      return cached.data;
    }
    return source.fetch();
  },
  /**
   * Invalidate a specific data source
   */
  invalidate(source) {
    source.invalidate();
  },
  /**
   * Invalidate all sources matching a cache key prefix
   *
   * @example
   * ```ts
   * sthira.invalidatePrefix('GET:/api/users')
   * ```
   */
  invalidatePrefix(prefix) {
    getQueryCache().invalidatePrefix(prefix);
  },
  /**
   * Invalidate all cached data
   */
  invalidateAll() {
    getQueryCache().invalidateAll();
  },
  /**
   * Get the query cache instance
   */
  getCache() {
    return getQueryCache();
  },
  /**
   * Create a router loader function
   *
   * @example
   * ```ts
   * export const loader = sthira.createLoader([usersSource, postsSource])
   * ```
   */
  createLoader(sources) {
    return async () => {
      const results = await Promise.all(sources.map((source) => source.fetch()));
      return results;
    };
  }
};

exports.QueryCache = QueryCache;
exports.createFetchSource = createFetchSource;
exports.createMutation = createMutation;
exports.getQueryCache = getQueryCache;
exports.resetQueryCache = resetQueryCache;
exports.sthira = sthira;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map