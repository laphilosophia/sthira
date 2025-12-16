import { createStore } from '@sthirajs/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createMemoryAdapter } from '../src/adapters/memory';
import { createPersistPlugin, waitForHydration } from '../src/plugin';
import { jsonSerializer } from '../src/serialization';

describe('Memory Adapter', () => {
  const adapter = createMemoryAdapter();

  beforeEach(async () => {
    await adapter.clear();
  });

  it('should set and get items', async () => {
    const data = new TextEncoder().encode('test data');
    await adapter.setItem('key1', data);

    const result = await adapter.getItem('key1');
    expect(result).toEqual(data);
  });

  it('should return null for missing items', async () => {
    const result = await adapter.getItem('missing');
    expect(result).toBeNull();
  });

  it('should remove items', async () => {
    const data = new TextEncoder().encode('test');
    await adapter.setItem('key1', data);
    await adapter.removeItem('key1');

    const result = await adapter.getItem('key1');
    expect(result).toBeNull();
  });

  it('should clear all items', async () => {
    await adapter.setItem('key1', new TextEncoder().encode('a'));
    await adapter.setItem('key2', new TextEncoder().encode('b'));

    await adapter.clear();

    expect(await adapter.keys()).toEqual([]);
  });

  it('should clear items by prefix', async () => {
    await adapter.setItem('user:1', new TextEncoder().encode('a'));
    await adapter.setItem('user:2', new TextEncoder().encode('b'));
    await adapter.setItem('post:1', new TextEncoder().encode('c'));

    await adapter.clear('user:');

    const keys = await adapter.keys();
    expect(keys).toEqual(['post:1']);
  });

  it('should get keys', async () => {
    await adapter.setItem('key1', new TextEncoder().encode('a'));
    await adapter.setItem('key2', new TextEncoder().encode('b'));

    const keys = await adapter.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should calculate size', async () => {
    const data = new TextEncoder().encode('12345'); // 5 bytes
    await adapter.setItem('key1', data);

    const size = await adapter.getSize!();
    expect(size).toBe(5);
  });
});

describe('JSON Serializer', () => {
  it('should encode and decode objects', () => {
    const data = { name: 'test', count: 42 };
    const encoded = jsonSerializer.encode(data);
    const decoded = jsonSerializer.decode<typeof data>(encoded);

    expect(decoded).toEqual(data);
  });

  it('should handle arrays', () => {
    const data = [1, 2, 3, 'a', 'b'];
    const encoded = jsonSerializer.encode(data);
    const decoded = jsonSerializer.decode<typeof data>(encoded);

    expect(decoded).toEqual(data);
  });

  it('should handle nested objects', () => {
    const data = { user: { profile: { name: 'Test' } } };
    const encoded = jsonSerializer.encode(data);
    const decoded = jsonSerializer.decode<typeof data>(encoded);

    expect(decoded).toEqual(data);
  });
});

describe('createPersistPlugin', () => {
  const schema = z.object({
    count: z.number(),
    name: z.string(),
  });

  let memoryStore: Map<string, Uint8Array>;

  beforeEach(() => {
    memoryStore = new Map();
  });

  it('should create plugin with API', () => {
    const plugin = createPersistPlugin({
      key: 'test',
      storage: 'memory',
    });

    expect(plugin.name).toBe('persist');
    expect(plugin.api).toBeDefined();
    expect(plugin.api.hydrate).toBeInstanceOf(Function);
    expect(plugin.api.persist).toBeInstanceOf(Function);
    expect(plugin.api.clear).toBeInstanceOf(Function);
    expect(plugin.api.pause).toBeInstanceOf(Function);
    expect(plugin.api.resume).toBeInstanceOf(Function);
    expect(plugin.api.getStatus).toBeInstanceOf(Function);
  });

  it('should integrate with store', async () => {
    const store = createStore({
      name: 'plugin-test',
      schema,
      state: { count: 0, name: 'initial' },
      plugins: [
        createPersistPlugin({
          key: 'plugin-test',
          storage: 'memory',
          debounce: 10,
        }),
      ],
    });

    // Plugin should have extended the store
    expect((store as any).persist).toBeDefined();

    const status = (store as any).persist.getStatus();
    expect(status).toHaveProperty('hydrated');
    expect(status).toHaveProperty('persisting');
  });

  it('should expose wait for hydration', async () => {
    const plugin = createPersistPlugin({
      key: 'hydration-test',
      storage: 'memory',
    });

    // waitForHydration is a standalone utility
    expect(waitForHydration).toBeInstanceOf(Function);

    // Mock a working API for testing
    const mockApi = {
      getStatus: () => ({ hydrated: true, persisting: false, lastPersistedAt: null }),
    };

    await expect(waitForHydration(mockApi as any, 100)).resolves.toBeUndefined();
  });

  it('should timeout on hydration wait', async () => {
    const mockApi = {
      getStatus: () => ({ hydrated: false, persisting: false, lastPersistedAt: null }),
    };

    await expect(waitForHydration(mockApi as any, 50)).rejects.toThrow('Hydration timeout');
  });
});
