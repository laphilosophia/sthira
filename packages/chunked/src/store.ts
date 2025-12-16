import type { StorageAdapter } from '@sthirajs/persist';
import { LRUCache } from './lru';
import type { ChunkedStoreApi, ChunkedStoreConfig, ChunkedStoreState, ChunkMeta } from './types';

/**
 * Estimate size of a value in bytes
 */
function estimateSize(value: unknown): number {
  const json = JSON.stringify(value);
  return new Blob([json]).size;
}

/**
 * Create a chunked store for large datasets
 */
export function createChunkedStore<T>(
  adapter: StorageAdapter,
  config: ChunkedStoreConfig<T>,
): ChunkedStoreApi<T> {
  const {
    name,
    chunkSize = 100,
    memoryBudget = 50 * 1024 * 1024, // 50MB default
    compress: _compress = true, // Reserved for future compression
    tiers = { hotLimit: 10, warmLimit: 50, ttl: 60000 },
    onEvict,
    onError,
  } = config;
  void _compress;

  // Storage key prefix
  const prefix = `chunked:${name}:`;

  // Hot tier: Raw objects in memory (fast access)
  const hotCache = new LRUCache<Map<string, T>>(memoryBudget * 0.3);

  // Warm tier: Compressed in memory (slower, less memory)
  const warmCache = new LRUCache<Uint8Array>(memoryBudget * 0.2);

  // Chunk metadata
  const chunkMeta = new Map<string, ChunkMeta>();

  // Key to chunk mapping
  const keyToChunk = new Map<string, string>();

  // Current chunk for new items
  let currentChunkId = `chunk-${Date.now()}`;
  let currentChunkItems: Map<string, T> = new Map();

  /**
   * Get chunk ID for a key
   */
  function getChunkForKey(key: string): string | undefined {
    return keyToChunk.get(key);
  }

  /**
   * Load chunk from storage
   */
  async function loadChunk(chunkId: string): Promise<Map<string, T> | undefined> {
    // Try hot cache first
    const hot = hotCache.get(chunkId);
    if (hot) {
      updateChunkAccess(chunkId);
      return hot;
    }

    // Try warm cache
    const warm = warmCache.get(chunkId);
    if (warm) {
      try {
        const decoded = new TextDecoder().decode(warm);
        const data = JSON.parse(decoded) as Record<string, T>;
        const map = new Map(Object.entries(data));

        // Promote to hot
        const size = warm.byteLength;
        hotCache.set(chunkId, map, size);
        warmCache.delete(chunkId);
        updateChunkAccess(chunkId);

        return map;
      } catch (error) {
        onError?.(error as Error);
      }
    }

    // Load from cold storage
    try {
      const stored = await adapter.getItem(`${prefix}${chunkId}`);
      if (!stored) return undefined;

      const decoded = new TextDecoder().decode(stored);
      const data = JSON.parse(decoded) as Record<string, T>;
      const map = new Map(Object.entries(data));

      // Add to hot cache
      hotCache.set(chunkId, map, stored.byteLength);
      updateChunkMeta(chunkId, 'hot', stored.byteLength);

      return map;
    } catch (error) {
      onError?.(error as Error);
      return undefined;
    }
  }

  /**
   * Save chunk to storage
   */
  async function saveChunk(chunkId: string, data: Map<string, T>): Promise<void> {
    try {
      const obj = Object.fromEntries(data);
      const json = JSON.stringify(obj);
      const encoded = new TextEncoder().encode(json);

      await adapter.setItem(`${prefix}${chunkId}`, encoded);

      updateChunkMeta(chunkId, 'cold', encoded.byteLength);
    } catch (error) {
      onError?.(error as Error);
    }
  }

  /**
   * Update chunk metadata
   */
  function updateChunkMeta(chunkId: string, state: 'hot' | 'warm' | 'cold', size: number): void {
    const existing = chunkMeta.get(chunkId);

    chunkMeta.set(chunkId, {
      id: chunkId,
      state,
      createdAt: existing?.createdAt ?? Date.now(),
      accessedAt: Date.now(),
      size,
      isPinned: existing?.isPinned ?? false,
    });
  }

  /**
   * Update chunk access time
   */
  function updateChunkAccess(chunkId: string): void {
    const meta = chunkMeta.get(chunkId);
    if (meta) {
      meta.accessedAt = Date.now();
    }
  }

  /**
   * Demote chunks to colder tiers
   */
  async function demoteChunks(): Promise<void> {
    const now = Date.now();
    const { hotLimit = 10, warmLimit = 50, ttl = 60000 } = tiers;

    // Check hot cache for demotion
    for (const chunkId of hotCache.keys()) {
      const meta = chunkMeta.get(chunkId);
      if (!meta || meta.isPinned) continue;

      if (now - meta.accessedAt > ttl && hotCache.count() > hotLimit) {
        // Demote to warm
        const data = hotCache.get(chunkId);
        if (data) {
          const json = JSON.stringify(Object.fromEntries(data));
          const encoded = new TextEncoder().encode(json);
          warmCache.set(chunkId, encoded, encoded.byteLength);
          hotCache.delete(chunkId);
          updateChunkMeta(chunkId, 'warm', encoded.byteLength);
        }
      }
    }

    // Check warm cache for demotion to cold
    for (const chunkId of warmCache.keys()) {
      const meta = chunkMeta.get(chunkId);
      if (!meta || meta.isPinned) continue;

      if (now - meta.accessedAt > ttl * 2 && warmCache.count() > warmLimit) {
        // Save to cold storage
        const encoded = warmCache.get(chunkId);
        if (encoded) {
          await adapter.setItem(`${prefix}${chunkId}`, encoded);
          warmCache.delete(chunkId);
          updateChunkMeta(chunkId, 'cold', encoded.byteLength);
          onEvict?.(chunkId);
        }
      }
    }
  }

  // API
  return {
    async get(key: string): Promise<T | undefined> {
      const chunkId = getChunkForKey(key);
      if (!chunkId) return undefined;

      const chunk = await loadChunk(chunkId);
      return chunk?.get(key);
    },

    async set(key: string, value: T): Promise<void> {
      // Check if key exists in another chunk
      const existingChunk = getChunkForKey(key);
      if (existingChunk) {
        const chunk = await loadChunk(existingChunk);
        if (chunk) {
          chunk.set(key, value);
          await saveChunk(existingChunk, chunk);
          return;
        }
      }

      // Add to current chunk
      currentChunkItems.set(key, value);
      keyToChunk.set(key, currentChunkId);

      // Check if chunk is full
      if (currentChunkItems.size >= chunkSize) {
        // Save current chunk
        await saveChunk(currentChunkId, currentChunkItems);
        hotCache.set(
          currentChunkId,
          currentChunkItems,
          estimateSize(Object.fromEntries(currentChunkItems)),
        );

        // Start new chunk
        currentChunkId = `chunk-${Date.now()}`;
        currentChunkItems = new Map();
      }

      // Periodic demotion
      await demoteChunks();
    },

    async delete(key: string): Promise<boolean> {
      const chunkId = getChunkForKey(key);
      if (!chunkId) return false;

      const chunk = await loadChunk(chunkId);
      if (!chunk) return false;

      const deleted = chunk.delete(key);
      keyToChunk.delete(key);

      if (deleted) {
        await saveChunk(chunkId, chunk);
      }

      return deleted;
    },

    async has(key: string): Promise<boolean> {
      return keyToChunk.has(key);
    },

    async keys(): Promise<string[]> {
      return Array.from(keyToChunk.keys());
    },

    getState(): ChunkedStoreState {
      let hotChunks = 0,
        warmChunks = 0,
        coldChunks = 0;

      for (const meta of chunkMeta.values()) {
        if (meta.state === 'hot') hotChunks++;
        else if (meta.state === 'warm') warmChunks++;
        else if (meta.state === 'cold') coldChunks++;
      }

      return {
        totalItems: keyToChunk.size,
        totalChunks: chunkMeta.size,
        hotChunks,
        warmChunks,
        coldChunks,
        memoryUsage: hotCache.size() + warmCache.size(),
      };
    },

    pin(chunkId: string): void {
      const meta = chunkMeta.get(chunkId);
      if (meta) {
        meta.isPinned = true;
      }
    },

    unpin(chunkId: string): void {
      const meta = chunkMeta.get(chunkId);
      if (meta) {
        meta.isPinned = false;
      }
    },

    async gc(): Promise<void> {
      await demoteChunks();
    },

    async flush(): Promise<void> {
      // Save current chunk
      if (currentChunkItems.size > 0) {
        await saveChunk(currentChunkId, currentChunkItems);
      }

      // Save all hot chunks
      for (const chunkId of hotCache.keys()) {
        const data = hotCache.get(chunkId);
        if (data) {
          await saveChunk(chunkId, data);
        }
      }

      // Save all warm chunks
      for (const chunkId of warmCache.keys()) {
        const data = warmCache.get(chunkId);
        if (data) {
          await adapter.setItem(`${prefix}${chunkId}`, data);
        }
      }
    },

    async clear(): Promise<void> {
      hotCache.clear();
      warmCache.clear();
      chunkMeta.clear();
      keyToChunk.clear();
      currentChunkItems.clear();
      await adapter.clear(prefix);
    },
  };
}
