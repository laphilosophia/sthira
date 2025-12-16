import { createMemoryAdapter } from '@sthira/persist';
import { beforeEach, describe, expect, it } from 'vitest';
import { LRUCache } from '../src/lru';
import { createChunkedStore } from '../src/store';

describe('LRUCache', () => {
  it('should create cache with max size', () => {
    const cache = new LRUCache<string>(1024);
    expect(cache.count()).toBe(0);
    expect(cache.size()).toBe(0);
  });

  it('should set and get items', () => {
    const cache = new LRUCache<string>(1024);
    cache.set('key1', 'value1', 10);
    cache.set('key2', 'value2', 10);

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.count()).toBe(2);
  });

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string>(1024);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should delete items', () => {
    const cache = new LRUCache<string>(1024);
    cache.set('key1', 'value1', 10);

    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.delete('missing')).toBe(false);
  });

  it('should evict items when over budget', () => {
    const cache = new LRUCache<string>(30);

    cache.set('a', 'value', 15);
    cache.set('b', 'value', 15);
    // Cache is at capacity (30)

    // Add new item, should evict something
    cache.set('c', 'value', 15);

    // At least one old item should be evicted
    const count = cache.count();
    expect(count).toBe(2); // Can only fit 2 items of 15 bytes each
    expect(cache.has('c')).toBe(true); // New item should exist
  });

  it('should track size correctly', () => {
    const cache = new LRUCache<string>(1024);
    cache.set('a', 'x', 10);
    cache.set('b', 'y', 20);

    expect(cache.size()).toBe(30);

    cache.delete('a');
    expect(cache.size()).toBe(20);
  });

  it('should clear cache', () => {
    const cache = new LRUCache<string>(1024);
    cache.set('a', 'x', 10);
    cache.set('b', 'y', 20);

    cache.clear();

    expect(cache.count()).toBe(0);
    expect(cache.size()).toBe(0);
  });

  it('should prune old items', async () => {
    const cache = new LRUCache<string>(1024);
    cache.set('old', 'value', 10);

    // Wait
    await new Promise((r) => setTimeout(r, 20));
    cache.set('new', 'value', 10);

    const pruned = cache.prune(10); // 10ms TTL

    expect(pruned).toBe(1);
    expect(cache.has('old')).toBe(false);
    expect(cache.has('new')).toBe(true);
  });
});

describe('createChunkedStore', () => {
  let adapter: ReturnType<typeof createMemoryAdapter>;

  beforeEach(() => {
    adapter = createMemoryAdapter();
  });

  it('should create chunked store', () => {
    const store = createChunkedStore(adapter, { name: 'test' });

    expect(store.get).toBeDefined();
    expect(store.set).toBeDefined();
    expect(store.delete).toBeDefined();
    expect(store.has).toBeDefined();
    expect(store.keys).toBeDefined();
    expect(store.getState).toBeDefined();
  });

  it('should set items and track keys', async () => {
    const store = createChunkedStore<{ id: number }>(adapter, { name: 'test' });

    await store.set('item1', { id: 1 });
    await store.set('item2', { id: 2 });

    // Items should be tracked
    expect(await store.has('item1')).toBe(true);
    expect(await store.has('item2')).toBe(true);
  });

  it('should check if items exist', async () => {
    const store = createChunkedStore<string>(adapter, { name: 'test' });

    await store.set('exists', 'value');

    expect(await store.has('exists')).toBe(true);
    expect(await store.has('missing')).toBe(false);
  });

  it('should support delete operation', async () => {
    const store = createChunkedStore<string>(adapter, { name: 'test' });

    await store.set('item', 'value');
    expect(await store.has('item')).toBe(true);

    // Delete should not throw
    await expect(store.delete('item')).resolves.toBeDefined();
  });

  it('should get all keys', async () => {
    const store = createChunkedStore<string>(adapter, { name: 'test' });

    await store.set('a', 'value');
    await store.set('b', 'value');
    await store.set('c', 'value');

    const keys = await store.keys();
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(keys).toContain('c');
  });

  it('should report state', async () => {
    const store = createChunkedStore<string>(adapter, { name: 'test' });

    await store.set('a', 'value');
    await store.set('b', 'value');

    const state = store.getState();
    expect(state.totalItems).toBe(2);
  });

  it('should clear all data', async () => {
    const store = createChunkedStore<string>(adapter, { name: 'test' });

    await store.set('a', 'value');
    await store.set('b', 'value');

    await store.clear();

    expect(await store.keys()).toEqual([]);
    expect(store.getState().totalItems).toBe(0);
  });
});
