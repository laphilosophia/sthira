// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
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
export type SerializationFormat = 'json' | 'msgpack';

/**
 * Serializer interface
 */
export interface Serializer {
  readonly format: SerializationFormat;
  encode<T>(data: T): Uint8Array;
  decode<T>(buffer: Uint8Array): T;
}

/**
 * Persist configuration
 */
export interface PersistConfig<T> {
  /** Storage key prefix */
  key: string;

  /** Storage adapter */
  adapter: StorageAdapter;

  /** Serializer (default: JSON) */
  serializer?: Serializer;

  /** Select which parts of state to persist */
  partialize?: (state: T) => Partial<T>;

  /** Merge persisted state with initial state */
  merge?: (persisted: Partial<T>, initial: T) => T;

  /** Debounce time for writes (ms) */
  debounceMs?: number;

  /** Version for migrations */
  version?: number;

  /** Migration function */
  migrate?: (persisted: unknown, version: number) => T;

  /** Called when hydration is complete */
  onHydrate?: (state: T) => void;

  /** Called on persistence error */
  onError?: (error: Error) => void;
}

/**
 * Persist state
 */
export interface PersistState {
  /** Whether state has been hydrated */
  hydrated: boolean;

  /** Last persisted timestamp */
  lastPersistedAt: number | null;

  /** Pending writes count */
  pendingWrites: number;
}

/**
 * Persist API exposed on store
 */
export interface PersistApi {
  /** Immediately persist current state */
  flush(): Promise<void>;

  /** Clear persisted state */
  clear(): Promise<void>;

  /** Rehydrate from storage */
  rehydrate(): Promise<void>;

  /** Get persist state */
  getState(): PersistState;

  /** Pause persistence */
  pause(): void;

  /** Resume persistence */
  resume(): void;
}

/**
 * Persisted state wrapper
 */
export interface PersistedData<T> {
  version: number;
  state: T;
  timestamp: number;
}

/**
 * IndexedDB adapter options
 */
export interface IndexedDBOptions {
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
export interface LocalStorageOptions {
  /** Key prefix */
  prefix?: string;
}
