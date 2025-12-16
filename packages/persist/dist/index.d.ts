import { Plugin } from '@sthira/core';

/**
 * Storage adapter interface
 */
interface StorageAdapter {
    /** Adapter name for debugging */
    readonly name: string;
    /** Check if adapter is available */
    isAvailable(): boolean;
    /** Get item from storage */
    getItem(key: string): Promise<Uint8Array | null>;
    /** Set item in storage */
    setItem(key: string, value: Uint8Array): Promise<void>;
    /** Remove item from storage */
    removeItem(key: string): Promise<void>;
    /** Clear all items with prefix */
    clear(prefix?: string): Promise<void>;
    /** Get all keys with prefix */
    keys(prefix?: string): Promise<string[]>;
    /** Get storage size in bytes */
    getSize?(): Promise<number>;
}
/**
 * Serialization format
 */
type SerializationFormat = 'json' | 'msgpack';
/**
 * Serializer interface
 */
interface Serializer {
    readonly format: SerializationFormat;
    encode<T>(data: T): Uint8Array;
    decode<T>(buffer: Uint8Array): T;
}
/**
 * Persisted state wrapper
 */
interface PersistedData<T> {
    version: number;
    state: T;
    timestamp: number;
}
/**
 * IndexedDB adapter options
 */
interface IndexedDBOptions {
    /** Database name */
    dbName?: string;
    /** Store name */
    storeName?: string;
    /** Database version */
    dbVersion?: number;
}
/**
 * localStorage adapter options
 */
interface LocalStorageOptions {
    /** Key prefix */
    prefix?: string;
}

/**
 * Persist plugin configuration
 */
interface PersistConfig<T extends object = object> {
    /** Storage key */
    key: string;
    /** Storage type */
    storage?: 'indexeddb' | 'localstorage' | 'memory';
    /** Custom storage adapter (overrides storage option) */
    adapter?: StorageAdapter;
    /** Custom serializer (default: JSON) */
    serializer?: Serializer;
    /** Schema version for migrations */
    version?: number;
    /** Migration function */
    migrate?: (state: unknown, version: number) => Partial<T>;
    /** Persist only specific fields */
    partialize?: (state: T) => Partial<T>;
    /** Merge strategy */
    merge?: (persisted: Partial<T>, current: T) => T;
    /** Debounce writes (ms) */
    debounce?: number;
    /** Called when hydration completes */
    onReady?: (state: T) => void;
    /** Called on error */
    onError?: (error: Error) => void;
}
/**
 * Persist API exposed on store
 */
interface PersistApi {
    /** Load state from storage */
    hydrate: () => Promise<void>;
    /** Force persist current state */
    persist: () => Promise<void>;
    /** Clear persisted data */
    clear: () => Promise<void>;
    /** Pause auto-persist */
    pause: () => void;
    /** Resume auto-persist */
    resume: () => void;
    /** Get persist status */
    getStatus: () => {
        hydrated: boolean;
        persisting: boolean;
        lastPersistedAt: number | null;
    };
}
/**
 * Create persistence plugin
 */
declare function createPersistPlugin<T extends object>(config: PersistConfig<T>): Plugin<T> & {
    api: PersistApi;
};
/**
 * Wait for hydration to complete
 */
declare function waitForHydration(api: PersistApi, timeoutMs?: number): Promise<void>;

/**
 * JSON serializer (default, always available)
 */
declare const jsonSerializer: Serializer;
/**
 * MessagePack serializer (optional, faster & smaller)
 * Lazy loaded to reduce bundle size
 */
declare const msgpackSerializer: Serializer;
/**
 * Load MessagePack module (async)
 */
declare function loadMsgpack(): Promise<void>;
/**
 * Check if MessagePack is available
 */
declare function isMsgpackAvailable(): boolean;
/**
 * Get serializer by format
 */
declare function getSerializer(format: SerializationFormat): Serializer;
/**
 * Create a custom serializer
 */
declare function createSerializer(encode: <T>(data: T) => Uint8Array, decode: <T>(buffer: Uint8Array) => T, format?: SerializationFormat): Serializer;

/**
 * IndexedDB storage adapter
 * Best for large data, async, binary-native
 */
declare function createIndexedDBAdapter(options?: IndexedDBOptions): StorageAdapter;
declare function getIndexedDBAdapter(options?: IndexedDBOptions): StorageAdapter;

/**
 * localStorage storage adapter
 * Simple, synchronous, limited to ~5MB, string-only (we convert to/from base64)
 */
declare function createLocalStorageAdapter(options?: LocalStorageOptions): StorageAdapter;
declare function getLocalStorageAdapter(options?: LocalStorageOptions): StorageAdapter;

/**
 * In-memory storage adapter
 * Useful for testing and SSR
 */
declare function createMemoryAdapter(): StorageAdapter;

export { type IndexedDBOptions, type LocalStorageOptions, type PersistApi, type PersistConfig, type PersistedData, type SerializationFormat, type Serializer, type StorageAdapter, createIndexedDBAdapter, createLocalStorageAdapter, createMemoryAdapter, createPersistPlugin, createSerializer, getIndexedDBAdapter, getLocalStorageAdapter, getSerializer, isMsgpackAvailable, jsonSerializer, loadMsgpack, msgpackSerializer, waitForHydration };
