import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryCache, resetQueryCache } from '../src/cache';
import { createFetchSource, createMutation } from '../src/fetch';
import { sthira } from '../src/sthira';

// Mock fetch
const mockFetch = vi.fn();

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should set and get cache entries', () => {
    cache.set('test-key', { data: 'test' });
    const entry = cache.get<{ data: string }>('test-key');

    expect(entry).toBeDefined();
    expect(entry?.data).toEqual({ data: 'test' });
  });

  it('should return undefined for missing entries', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should invalidate entries', () => {
    cache.set('test-key', { data: 'test' });
    cache.invalidate('test-key');

    expect(cache.get('test-key')).toBeUndefined();
  });

  it('should invalidate by prefix', () => {
    cache.set('GET:/api/users', []);
    cache.set('GET:/api/users/1', {});
    cache.set('POST:/api/login', {});

    cache.invalidatePrefix('GET:/api/users');

    expect(cache.get('GET:/api/users')).toBeUndefined();
    expect(cache.get('GET:/api/users/1')).toBeUndefined();
    expect(cache.get('POST:/api/login')).toBeDefined();
  });

  it('should check staleness', () => {
    // Use negative staleTime to immediately be stale
    cache.set('test-key', { data: 'test' }, { staleTime: -1 });

    expect(cache.isStale('test-key')).toBe(true);
  });

  it('should invalidate all entries', () => {
    cache.set('key1', 'data1');
    cache.set('key2', 'data2');

    cache.invalidateAll();

    expect(cache.size).toBe(0);
  });
});

describe('createFetchSource', () => {
  beforeEach(() => {
    resetQueryCache();
    mockFetch.mockReset();
  });

  it('should create a fetch source with correct cacheKey', () => {
    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
    });

    expect(source.type).toBe('query');
    expect(source.cacheKey).toBe('GET:https://api.example.com/users');
  });

  it('should fetch and cache data', async () => {
    const mockData = { users: [{ id: 1, name: 'John' }] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
    });

    const result = await source.fetch();

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should return cached data on subsequent calls', async () => {
    const mockData = { id: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      staleTime: 60000,
      fetcher: mockFetch,
    });

    await source.fetch();
    await source.fetch();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should transform response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { users: [] } }),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
      transform: (res) => (res as { data: unknown }).data,
    });

    const result = await source.fetch();

    expect(result).toEqual({ users: [] });
  });

  it('should retry on failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
      retry: 1,
      retryDelay: 10,
    });

    const result = await source.fetch();

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
    });

    await source.fetch();
    source.invalidate();
    await source.fetch();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
      onSuccess,
    });

    await source.fetch();

    expect(onSuccess).toHaveBeenCalledWith({ data: 'test' });
  });
});

describe('createMutation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should perform mutation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'Created' }),
    });

    const mutation = createMutation<{ id: number; name: string }, { name: string }>({
      url: 'https://api.example.com/users',
      method: 'POST',
      fetcher: mockFetch,
    });

    const result = await mutation.mutate({ name: 'New User' });

    expect(result).toEqual({ id: 1, name: 'Created' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New User' }),
      }),
    );
  });
});

describe('sthira global API', () => {
  beforeEach(() => {
    resetQueryCache();
    mockFetch.mockReset();
  });

  it('should prefetch data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [] }),
    });

    const source = createFetchSource({
      url: 'https://api.example.com/users',
      fetcher: mockFetch,
    });

    await sthira.prefetch(source);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should prefetch multiple sources', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const source1 = createFetchSource({ url: '/api/users', fetcher: mockFetch });
    const source2 = createFetchSource({ url: '/api/posts', fetcher: mockFetch });

    await sthira.prefetchAll([source1, source2]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should ensure data returns cached', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });

    const source = createFetchSource({
      url: '/api/users',
      fetcher: mockFetch,
      staleTime: 60000,
    });

    await source.fetch();
    const result = await sthira.ensureData(source);

    expect(result).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should create router loader', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ loaded: true }),
    });

    const source = createFetchSource({ url: '/api/data', fetcher: mockFetch });
    const loader = sthira.createLoader([source]);

    const result = await loader();

    expect(result).toEqual([{ loaded: true }]);
  });
});

describe('Abort and Timeout functionality', () => {
  beforeEach(() => {
    resetQueryCache();
    mockFetch.mockReset();
  });

  it('should abort request when timeout expires', async () => {
    // Mock fetch that takes longer than timeout
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve({}) }),
            2000,
          );
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(init.signal?.reason || new Error('Aborted'));
          });
        }),
    );

    const source = createFetchSource({
      url: '/api/slow',
      fetcher: mockFetch,
      timeout: 50, // Very short timeout
      retry: false,
    });

    await expect(source.fetch()).rejects.toThrow();
  });

  it('should abort request manually', async () => {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve({}) }),
            2000,
          );
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(init.signal?.reason || new Error('Aborted'));
          });
        }),
    );

    const source = createFetchSource({
      url: '/api/users',
      fetcher: mockFetch,
      retry: false,
    });

    const fetchPromise = source.fetch();

    // Abort immediately
    setTimeout(() => source.abort(), 10);

    await expect(fetchPromise).rejects.toThrow();
  });

  it('should cancel previous request when cancelOnNewRequest is true', async () => {
    let requestCount = 0;
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      requestCount++;
      const currentRequest = requestCount;
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(
          () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ request: currentRequest }),
            }),
          100,
        );
        init.signal?.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(init.signal?.reason || new Error('Aborted'));
        });
      });
    });

    const source = createFetchSource({
      url: '/api/users',
      fetcher: mockFetch,
      cancelOnNewRequest: true,
      staleTime: 0,
      retry: false,
    });

    // Start first request
    const firstRequest = source.fetch();

    // Start second request immediately (should cancel first)
    const secondRequest = source.fetch();

    // First request should be aborted
    await expect(firstRequest).rejects.toThrow();

    // Second request should succeed
    const result = (await secondRequest) as { request: number };
    expect(result.request).toBe(2);
  });

  it('should support external AbortSignal', async () => {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve({}) }),
            2000,
          );
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(init.signal?.reason || new Error('Aborted'));
          });
        }),
    );

    const controller = new AbortController();

    const source = createFetchSource({
      url: '/api/users',
      fetcher: mockFetch,
      signal: controller.signal,
      retry: false,
    });

    const fetchPromise = source.fetch();

    // Abort via external controller
    setTimeout(() => controller.abort(), 10);

    await expect(fetchPromise).rejects.toThrow();
  });
});

describe('Mutation abort functionality', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should abort mutation manually', async () => {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve({}) }),
            2000,
          );
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(init.signal?.reason || new Error('Aborted'));
          });
        }),
    );

    const mutation = createMutation<{ id: number }, { name: string }>({
      url: '/api/users',
      method: 'POST',
      fetcher: mockFetch,
    });

    const mutatePromise = mutation.mutate({ name: 'Test' });

    // Manually abort
    setTimeout(() => mutation.abort(), 10);

    await expect(mutatePromise).rejects.toThrow();
  });

  it('should abort previous mutation when new one starts', async () => {
    let mutationCount = 0;
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      mutationCount++;
      const currentMutation = mutationCount;
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(
          () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ id: currentMutation }),
            }),
          100,
        );
        init.signal?.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(init.signal?.reason || new Error('Aborted'));
        });
      });
    });

    const mutation = createMutation<{ id: number }, { name: string }>({
      url: '/api/users',
      method: 'POST',
      fetcher: mockFetch,
    });

    // Start first mutation
    const firstMutation = mutation.mutate({ name: 'First' });

    // Start second mutation (should cancel first)
    const secondMutation = mutation.mutate({ name: 'Second' });

    // First mutation should be aborted
    await expect(firstMutation).rejects.toThrow();

    // Second mutation should succeed
    const result = await secondMutation;
    expect(result.id).toBe(2);
  });

  it('should respect timeout in mutations', async () => {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve({}) }),
            2000,
          );
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(init.signal?.reason || new Error('Aborted'));
          });
        }),
    );

    const mutation = createMutation<{ id: number }, { name: string }>({
      url: '/api/users',
      method: 'POST',
      fetcher: mockFetch,
      timeout: 50, // Very short timeout
    });

    await expect(mutation.mutate({ name: 'Test' })).rejects.toThrow();
  });
});
