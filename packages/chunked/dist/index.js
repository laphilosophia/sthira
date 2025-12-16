// src/lru.ts
var LRUCache = class {
  cache = /* @__PURE__ */ new Map();
  maxSize;
  currentSize = 0;
  constructor(maxSizeBytes) {
    this.maxSize = maxSizeBytes;
  }
  /**
   * Get item from cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return void 0;
    item.accessedAt = Date.now();
    return item.value;
  }
  /**
   * Set item in cache
   */
  set(key, value, size) {
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
    if (this.cache.has(key)) {
      const existing = this.cache.get(key);
      this.currentSize -= existing.size;
    }
    const item = {
      key,
      value,
      size,
      accessedAt: Date.now()
    };
    this.cache.set(key, item);
    this.currentSize += size;
  }
  /**
   * Delete item from cache
   */
  delete(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    this.currentSize -= item.size;
    return this.cache.delete(key);
  }
  /**
   * Check if key exists
   */
  has(key) {
    return this.cache.has(key);
  }
  /**
   * Get all keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }
  /**
   * Get current size in bytes
   */
  size() {
    return this.currentSize;
  }
  /**
   * Get item count
   */
  count() {
    return this.cache.size;
  }
  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }
  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldest = null;
    let oldestKey = null;
    for (const [key, item] of this.cache) {
      if (!oldest || item.accessedAt < oldest.accessedAt) {
        oldest = item;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
  /**
   * Prune items older than TTL
   */
  prune(ttlMs) {
    const now = Date.now();
    let pruned = 0;
    for (const [key, item] of this.cache) {
      if (now - item.accessedAt > ttlMs) {
        this.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
};

// src/store.ts
function estimateSize(value) {
  const json = JSON.stringify(value);
  return new Blob([json]).size;
}
function createChunkedStore(adapter, config) {
  const {
    name,
    chunkSize = 100,
    memoryBudget = 50 * 1024 * 1024,
    // 50MB default
    compress: _compress = true,
    // Reserved for future compression
    tiers = { hotLimit: 10, warmLimit: 50, ttl: 6e4 },
    onEvict,
    onError
  } = config;
  const prefix = `chunked:${name}:`;
  const hotCache = new LRUCache(memoryBudget * 0.3);
  const warmCache = new LRUCache(memoryBudget * 0.2);
  const chunkMeta = /* @__PURE__ */ new Map();
  const keyToChunk = /* @__PURE__ */ new Map();
  let currentChunkId = `chunk-${Date.now()}`;
  let currentChunkItems = /* @__PURE__ */ new Map();
  function getChunkForKey(key) {
    return keyToChunk.get(key);
  }
  async function loadChunk(chunkId) {
    const hot = hotCache.get(chunkId);
    if (hot) {
      updateChunkAccess(chunkId);
      return hot;
    }
    const warm = warmCache.get(chunkId);
    if (warm) {
      try {
        const decoded = new TextDecoder().decode(warm);
        const data = JSON.parse(decoded);
        const map = new Map(Object.entries(data));
        const size = warm.byteLength;
        hotCache.set(chunkId, map, size);
        warmCache.delete(chunkId);
        updateChunkAccess(chunkId);
        return map;
      } catch (error) {
        onError?.(error);
      }
    }
    try {
      const stored = await adapter.getItem(`${prefix}${chunkId}`);
      if (!stored) return void 0;
      const decoded = new TextDecoder().decode(stored);
      const data = JSON.parse(decoded);
      const map = new Map(Object.entries(data));
      hotCache.set(chunkId, map, stored.byteLength);
      updateChunkMeta(chunkId, "hot", stored.byteLength);
      return map;
    } catch (error) {
      onError?.(error);
      return void 0;
    }
  }
  async function saveChunk(chunkId, data) {
    try {
      const obj = Object.fromEntries(data);
      const json = JSON.stringify(obj);
      const encoded = new TextEncoder().encode(json);
      await adapter.setItem(`${prefix}${chunkId}`, encoded);
      updateChunkMeta(chunkId, "cold", encoded.byteLength);
    } catch (error) {
      onError?.(error);
    }
  }
  function updateChunkMeta(chunkId, state, size) {
    const existing = chunkMeta.get(chunkId);
    chunkMeta.set(chunkId, {
      id: chunkId,
      state,
      createdAt: existing?.createdAt ?? Date.now(),
      accessedAt: Date.now(),
      size,
      isPinned: existing?.isPinned ?? false
    });
  }
  function updateChunkAccess(chunkId) {
    const meta = chunkMeta.get(chunkId);
    if (meta) {
      meta.accessedAt = Date.now();
    }
  }
  async function demoteChunks() {
    const now = Date.now();
    const { hotLimit = 10, warmLimit = 50, ttl = 6e4 } = tiers;
    for (const chunkId of hotCache.keys()) {
      const meta = chunkMeta.get(chunkId);
      if (!meta || meta.isPinned) continue;
      if (now - meta.accessedAt > ttl && hotCache.count() > hotLimit) {
        const data = hotCache.get(chunkId);
        if (data) {
          const json = JSON.stringify(Object.fromEntries(data));
          const encoded = new TextEncoder().encode(json);
          warmCache.set(chunkId, encoded, encoded.byteLength);
          hotCache.delete(chunkId);
          updateChunkMeta(chunkId, "warm", encoded.byteLength);
        }
      }
    }
    for (const chunkId of warmCache.keys()) {
      const meta = chunkMeta.get(chunkId);
      if (!meta || meta.isPinned) continue;
      if (now - meta.accessedAt > ttl * 2 && warmCache.count() > warmLimit) {
        const encoded = warmCache.get(chunkId);
        if (encoded) {
          await adapter.setItem(`${prefix}${chunkId}`, encoded);
          warmCache.delete(chunkId);
          updateChunkMeta(chunkId, "cold", encoded.byteLength);
          onEvict?.(chunkId);
        }
      }
    }
  }
  return {
    async get(key) {
      const chunkId = getChunkForKey(key);
      if (!chunkId) return void 0;
      const chunk = await loadChunk(chunkId);
      return chunk?.get(key);
    },
    async set(key, value) {
      const existingChunk = getChunkForKey(key);
      if (existingChunk) {
        const chunk = await loadChunk(existingChunk);
        if (chunk) {
          chunk.set(key, value);
          await saveChunk(existingChunk, chunk);
          return;
        }
      }
      currentChunkItems.set(key, value);
      keyToChunk.set(key, currentChunkId);
      if (currentChunkItems.size >= chunkSize) {
        await saveChunk(currentChunkId, currentChunkItems);
        hotCache.set(
          currentChunkId,
          currentChunkItems,
          estimateSize(Object.fromEntries(currentChunkItems))
        );
        currentChunkId = `chunk-${Date.now()}`;
        currentChunkItems = /* @__PURE__ */ new Map();
      }
      await demoteChunks();
    },
    async delete(key) {
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
    async has(key) {
      return keyToChunk.has(key);
    },
    async keys() {
      return Array.from(keyToChunk.keys());
    },
    getState() {
      let hotChunks = 0, warmChunks = 0, coldChunks = 0;
      for (const meta of chunkMeta.values()) {
        if (meta.state === "hot") hotChunks++;
        else if (meta.state === "warm") warmChunks++;
        else if (meta.state === "cold") coldChunks++;
      }
      return {
        totalItems: keyToChunk.size,
        totalChunks: chunkMeta.size,
        hotChunks,
        warmChunks,
        coldChunks,
        memoryUsage: hotCache.size() + warmCache.size()
      };
    },
    pin(chunkId) {
      const meta = chunkMeta.get(chunkId);
      if (meta) {
        meta.isPinned = true;
      }
    },
    unpin(chunkId) {
      const meta = chunkMeta.get(chunkId);
      if (meta) {
        meta.isPinned = false;
      }
    },
    async gc() {
      await demoteChunks();
    },
    async flush() {
      if (currentChunkItems.size > 0) {
        await saveChunk(currentChunkId, currentChunkItems);
      }
      for (const chunkId of hotCache.keys()) {
        const data = hotCache.get(chunkId);
        if (data) {
          await saveChunk(chunkId, data);
        }
      }
      for (const chunkId of warmCache.keys()) {
        const data = warmCache.get(chunkId);
        if (data) {
          await adapter.setItem(`${prefix}${chunkId}`, data);
        }
      }
    },
    async clear() {
      hotCache.clear();
      warmCache.clear();
      chunkMeta.clear();
      keyToChunk.clear();
      currentChunkItems.clear();
      await adapter.clear(prefix);
    }
  };
}

export { LRUCache, createChunkedStore };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map