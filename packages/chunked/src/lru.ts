import type { LRUItem } from './types';

/**
 * LRU (Least Recently Used) Cache
 * Used for memory-efficient chunk management
 */
export class LRUCache<T> {
  private cache = new Map<string, LRUItem<T>>();
  private maxSize: number;
  private currentSize = 0;

  constructor(maxSizeBytes: number) {
    this.maxSize = maxSizeBytes;
  }

  /**
   * Get item from cache
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Update access time
    item.accessedAt = Date.now();

    return item.value;
  }

  /**
   * Set item in cache
   */
  set(key: string, value: T, size: number): void {
    // Evict until we have space
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Remove existing item if updating
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    // Add new item
    const item: LRUItem<T> = {
      key,
      value,
      size,
      accessedAt: Date.now(),
    };

    this.cache.set(key, item);
    this.currentSize += size;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    this.currentSize -= item.size;
    return this.cache.delete(key);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get current size in bytes
   */
  size(): number {
    return this.currentSize;
  }

  /**
   * Get item count
   */
  count(): number {
    return this.cache.size;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldest: LRUItem<T> | null = null;
    let oldestKey: string | null = null;

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
  prune(ttlMs: number): number {
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
}
