import type { ZodError, ZodType } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Configuration for creating a store
 */
export interface StoreConfig<TState extends object, TActions extends object> {
  /** Unique store name for debugging and DevTools */
  name: string;

  /** Zod schema for runtime validation */
  schema?: ZodType<TState>;

  /** Initial state or factory function */
  state: TState | (() => TState);

  /** Computed/derived values (auto-memoized) */
  computed?: ComputedDefinitions<TState>;

  /** Actions that can modify state */
  actions?: (set: SetState<TState>, get: GetState<TState>) => TActions;

  /** Axios-style interceptors */
  interceptors?: Interceptors<TState>;

  /** Performance configuration */
  performance?: PerformanceConfig;

  /** Legacy plugins array (v1 API) */
  plugins?: Plugin<TState>[];

  // ========================================
  // v2 Declarative Plugin Config
  // ========================================

  /** Persistence configuration */
  persist?: boolean | PersistPluginConfig;

  /** Cross-tab sync configuration */
  sync?: boolean | string | SyncPluginConfig;

  /** DevTools configuration */
  devtools?: boolean | DevToolsPluginConfig;
}

/**
 * Set state function
 */
export type SetState<TState> = (
  partial: Partial<TState> | ((state: TState) => Partial<TState>),
  options?: SetOptions,
) => void;

/**
 * Get state function
 */
export type GetState<TState> = () => TState;

/**
 * Set options
 */
export interface SetOptions {
  /** Skip interceptors */
  skipInterceptors?: boolean;
  /** Skip subscribers notification */
  silent?: boolean;
}

// ============================================================================
// Computed Types
// ============================================================================

export type ComputedDefinitions<TState> = {
  [key: string]: ComputedFn<TState, unknown>;
};

export type ComputedFn<TState, TResult> = (
  state: TState,
  computed: Record<string, unknown>,
) => TResult;

export type ComputedValues<TComputed extends ComputedDefinitions<object>> = {
  [K in keyof TComputed]: TComputed[K] extends ComputedFn<object, infer R> ? R : never;
};

// ============================================================================
// Interceptors Types
// ============================================================================

export interface Interceptors<TState> {
  /** Called before state is set. Can transform value. */
  beforeSet?: (
    path: string | null,
    value: Partial<TState>,
    prevState: TState,
  ) => Partial<TState> | void;

  /** Called after state is set */
  afterSet?: (path: string | null, value: Partial<TState>, newState: TState) => void;

  /** Called when an error occurs */
  onError?: (error: Error, context: ErrorContext) => void;
}

export interface ErrorContext {
  action?: string;
  state?: unknown;
  error: Error;
}

// ============================================================================
// FSM / Async State Types
// ============================================================================

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale';

export interface AsyncState<TData, TError = Error> {
  status: AsyncStatus;
  data: TData | undefined;
  error: TError | undefined;
  dataUpdatedAt: number | null;
  errorUpdatedAt: number | null;
  isFetching: boolean;
  isRefetching: boolean;
  fetchCount: number;
}

/**
 * Allowed FSM transitions
 */
export const ASYNC_TRANSITIONS: Record<AsyncStatus, AsyncStatus[]> = {
  idle: ['loading'],
  loading: ['success', 'error'],
  success: ['loading', 'stale'],
  error: ['loading', 'idle'],
  stale: ['loading', 'success'],
};

// ============================================================================
// Performance Types
// ============================================================================

export type PerformancePreset = 'minimal' | 'balanced' | 'heavy';

export interface PerformanceOptions {
  /** Enable frame-aware task scheduling */
  scheduler?: boolean;
  /** Enable batched updates */
  batching?: boolean;
  /** Enable web worker pool */
  workers?: boolean | WorkerConfig;
}

export type PerformanceConfig = PerformancePreset | PerformanceOptions;

export interface WorkerConfig {
  maxWorkers?: number;
  workerScript?: string | URL;
}

// ============================================================================
// Plugin Types
// ============================================================================

export interface Plugin<TState extends object = object> {
  name: string;
  version: string;

  /** Called when store is created */
  onInit?: (store: Store<TState, object>) => void | Promise<void>;

  /** Called before store is destroyed */
  onDestroy?: (store: Store<TState, object>) => void | Promise<void>;

  /** Called before state change */
  onBeforeChange?: (partial: Partial<TState>, prevState: TState) => Partial<TState> | void;

  /** Called after state change */
  onAfterChange?: (newState: TState, prevState: TState) => void;

  /** Extend store with new properties */
  extend?: (store: Store<TState, object>) => Record<string, unknown>;
}

// ============================================================================
// v2 Declarative Plugin Config Types
// ============================================================================

/**
 * Persist plugin configuration
 */
export interface PersistPluginConfig {
  /** Storage key */
  key: string;
  /** Storage adapter type */
  storage?: 'indexeddb' | 'localstorage' | 'memory';
  /** Serialization format */
  serialize?: 'json' | 'msgpack';
  /** Schema version for migrations */
  version?: number;
  /** Migration function */
  migrate?: (state: unknown, version: number) => unknown;
  /** Persist only specific fields */
  partialize?: (state: unknown) => unknown;
  /** Debounce writes (ms) */
  debounce?: number;
  /** Called when hydration completes */
  onReady?: (state: unknown) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Sync (cross-tab) plugin configuration
 */
export interface SyncPluginConfig {
  /** BroadcastChannel name */
  channel: string;
  /** Only sync specific fields */
  include?: string[];
  /** Exclude specific fields from sync */
  exclude?: string[];
  /** Debounce sync messages (ms) */
  debounce?: number;
  /** Conflict resolution strategy */
  onConflict?: 'local' | 'remote' | 'merge';
}

/**
 * DevTools plugin configuration
 */
export interface DevToolsPluginConfig {
  /** Instance name in DevTools */
  name?: string;
  /** Max action history */
  maxAge?: number;
  /** Enable action traces */
  trace?: boolean;
}

/**
 * Persist API returned when persist plugin is enabled
 */
export interface PersistApi {
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
  getStatus: () => { hydrated: boolean; persisting: boolean; lastPersistedAt: number | null };
}

/**
 * Sync API returned when sync plugin is enabled
 */
export interface SyncApi {
  /** Force broadcast current state */
  broadcast: () => void;
  /** Disconnect from sync channel */
  disconnect: () => void;
  /** Get sync status */
  getStatus: () => { connected: boolean; tabId: string; lastSyncAt: number | null };
}

/**
 * DevTools API returned when devtools plugin is enabled
 */
export interface DevToolsApi {
  /** Export current state as JSON */
  export: () => string;
  /** Import state from JSON */
  import: (json: string) => void;
  /** Alias for export */
  exportState?: () => string;
  /** Alias for import */
  importState?: (json: string) => void;
  /** Disconnect from devtools */
  disconnect?: () => void;
  /** Get status */
  getStatus?: () => { connected: boolean };
}

// ============================================================================
// Store Types
// ============================================================================

export interface Store<TState extends object, TActions extends object> {
  /** Store name */
  readonly name: string;

  /** Get current state */
  getState: GetState<TState>;

  /** Set state */
  setState: SetState<TState>;

  /** Subscribe to state changes */
  subscribe: (listener: Listener<TState>) => Unsubscribe;

  /** Get computed values */
  getComputed: () => Record<string, unknown>;

  /** Actions */
  actions: TActions;

  /** Destroy store */
  destroy: () => void;

  /** Performance utilities (if enabled) */
  perf?: PerformanceUtils;

  /** Event bus */
  events: EventBus;

  /** Plugin extensions */
  [key: string]: unknown;
}

export type Listener<TState> = (state: TState, prevState: TState) => void;
export type Unsubscribe = () => void;

// ============================================================================
// Event Bus Types
// ============================================================================

export type EventPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

export interface StoreEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  timestamp: number;
  source: 'user' | 'system' | 'sync' | 'plugin';
  priority: EventPriority;
  meta?: Record<string, unknown>;
}

export type EventHandler<TPayload = unknown> = (event: StoreEvent<TPayload>) => void;

export interface EventBus {
  emit<T>(type: string, payload: T, options?: EmitOptions): void;
  on<T>(type: string, handler: EventHandler<T>): Unsubscribe;
  once<T>(type: string, handler: EventHandler<T>): Unsubscribe;
  off(type: string, handler?: EventHandler): void;
}

export interface EmitOptions {
  source?: StoreEvent['source'];
  priority?: EventPriority;
  meta?: Record<string, unknown>;
}

// ============================================================================
// Performance Utils Types
// ============================================================================

export interface PerformanceUtils {
  /** Schedule a task with priority */
  schedule<T>(task: () => T | Promise<T>, priority?: 'high' | 'normal' | 'low'): Promise<T>;

  /** Yield to main thread */
  yieldToMain(): Promise<void>;

  /** Process array in chunks */
  chunked<T, R>(items: T[], fn: (item: T) => R, options?: ChunkedOptions): Promise<R[]>;

  /** Offload to worker (if workers enabled) */
  offload?<T, R>(taskType: string, data: T): Promise<R>;
}

export interface ChunkedOptions {
  chunkSize?: number;
  yieldEvery?: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ZodError;
}

// ============================================================================
// DataSource Types (for @sthirajs/fetch)
// ============================================================================

export interface DataSource<T> {
  type: 'query' | 'mutation' | 'subscription';
  getCacheKey(): string;
  fetch(): Promise<T>;
  subscribe?(callback: (data: T) => void): Unsubscribe;
  invalidate(): void;
}

export interface DataSourceConfig<T> {
  cacheKey?: string | (() => string);
  staleTime?: number;
  cacheTime?: number;
  retry?: number | boolean;
  retryDelay?: number;
  transform?: (raw: unknown) => T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}
