import { StorageAdapter } from '@sthirajs/persist';

/**
 * Chunk state
 */
type ChunkState = 'hot' | 'warm' | 'cold' | 'evicted';
/**
 * Chunk metadata
 */
interface ChunkMeta {
    id: string;
    state: ChunkState;
    createdAt: number;
    accessedAt: number;
    size: number;
    isPinned: boolean;
}
/**
 * Chunk data with metadata
 */
interface Chunk<T = unknown> {
    meta: ChunkMeta;
    data: T;
}
/**
 * Memory tier configuration
 */
interface TierConfig {
    /** Max items in hot tier (raw objects) */
    hotLimit?: number;
    /** Max items in warm tier (compressed) */
    warmLimit?: number;
    /** Time before moving to colder tier (ms) */
    ttl?: number;
}
/**
 * Chunked store configuration
 */
interface ChunkedStoreConfig<T> {
    /** Store name */
    name: string;
    /** Chunk size (number of items per chunk) */
    chunkSize?: number;
    /** Memory budget in bytes */
    memoryBudget?: number;
    /** Enable compression for warm/cold storage */
    compress?: boolean;
    /** Tier configuration */
    tiers?: TierConfig;
    /** Custom chunk key generator */
    getKey?: (item: T, index: number) => string;
    /** Called when chunk is evicted */
    onEvict?: (chunkId: string) => void;
    /** Called on error */
    onError?: (error: Error) => void;
}
/**
 * Chunked store state
 */
interface ChunkedStoreState {
    /** Total items */
    totalItems: number;
    /** Total chunks */
    totalChunks: number;
    /** Chunks in hot memory */
    hotChunks: number;
    /** Chunks in warm memory */
    warmChunks: number;
    /** Chunks in cold storage */
    coldChunks: number;
    /** Estimated memory usage (bytes) */
    memoryUsage: number;
}
/**
 * Chunked store API
 */
interface ChunkedStoreApi<T> {
    /** Get item by key */
    get(key: string): Promise<T | undefined>;
    /** Set item */
    set(key: string, value: T): Promise<void>;
    /** Delete item */
    delete(key: string): Promise<boolean>;
    /** Check if item exists */
    has(key: string): Promise<boolean>;
    /** Get all keys */
    keys(): Promise<string[]>;
    /** Get store state */
    getState(): ChunkedStoreState;
    /** Pin chunk in hot memory */
    pin(chunkId: string): void;
    /** Unpin chunk */
    unpin(chunkId: string): void;
    /** Force garbage collection */
    gc(): Promise<void>;
    /** Flush all chunks to storage */
    flush(): Promise<void>;
    /** Clear all data */
    clear(): Promise<void>;
}
/**
 * LRU cache item
 */
interface LRUItem<T> {
    key: string;
    value: T;
    size: number;
    accessedAt: number;
}

/**
 * Create a chunked store for large datasets
 */
declare function createChunkedStore<T>(adapter: StorageAdapter, config: ChunkedStoreConfig<T>): ChunkedStoreApi<T>;

/**
 * LRU (Least Recently Used) Cache
 * Used for memory-efficient chunk management
 */
declare class LRUCache<T> {
    private cache;
    private maxSize;
    private currentSize;
    constructor(maxSizeBytes: number);
    /**
     * Get item from cache
     */
    get(key: string): T | undefined;
    /**
     * Set item in cache
     */
    set(key: string, value: T, size: number): void;
    /**
     * Delete item from cache
     */
    delete(key: string): boolean;
    /**
     * Check if key exists
     */
    has(key: string): boolean;
    /**
     * Get all keys
     */
    keys(): string[];
    /**
     * Get current size in bytes
     */
    size(): number;
    /**
     * Get item count
     */
    count(): number;
    /**
     * Clear cache
     */
    clear(): void;
    /**
     * Evict least recently used item
     */
    private evictLRU;
    /**
     * Prune items older than TTL
     */
    prune(ttlMs: number): number;
}

export { type Chunk, type ChunkMeta, type ChunkState, type ChunkedStoreApi, type ChunkedStoreConfig, type ChunkedStoreState, LRUCache, type LRUItem, type TierConfig, createChunkedStore };
