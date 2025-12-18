import { ZodType, ZodError } from 'zod';

/**
 * Configuration for creating a store
 */
interface StoreConfig<TState extends object, TActions extends object> {
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
type SetState<TState> = (partial: Partial<TState> | ((state: TState) => Partial<TState>), options?: SetOptions) => void;
/**
 * Get state function
 */
type GetState<TState> = () => TState;
/**
 * Set options
 */
interface SetOptions {
    /** Skip interceptors */
    skipInterceptors?: boolean;
    /** Skip subscribers notification */
    silent?: boolean;
}
type ComputedDefinitions<TState> = {
    [key: string]: ComputedFn<TState, unknown>;
};
type ComputedFn<TState, TResult> = (state: TState, computed: Record<string, unknown>) => TResult;
type ComputedValues<TComputed extends ComputedDefinitions<object>> = {
    [K in keyof TComputed]: TComputed[K] extends ComputedFn<object, infer R> ? R : never;
};
interface Interceptors<TState> {
    /** Called before state is set. Can transform value. */
    beforeSet?: (path: string | null, value: Partial<TState>, prevState: TState) => Partial<TState> | void;
    /** Called after state is set */
    afterSet?: (path: string | null, value: Partial<TState>, newState: TState) => void;
    /** Called when an error occurs */
    onError?: (error: Error, context: ErrorContext) => void;
}
interface ErrorContext {
    action?: string;
    state?: unknown;
    error: Error;
}
type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale';
interface AsyncState<TData, TError = Error> {
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
declare const ASYNC_TRANSITIONS: Record<AsyncStatus, AsyncStatus[]>;
type PerformancePreset = 'minimal' | 'balanced' | 'heavy';
interface PerformanceOptions {
    /** Enable frame-aware task scheduling */
    scheduler?: boolean;
    /** Enable batched updates */
    batching?: boolean;
    /** Enable web worker pool */
    workers?: boolean | WorkerConfig;
}
type PerformanceConfig = PerformancePreset | PerformanceOptions;
interface WorkerConfig {
    maxWorkers?: number;
    workerScript?: string | URL;
}
interface Plugin<TState extends object = object> {
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
/**
 * Persist plugin configuration
 */
interface PersistPluginConfig {
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
interface SyncPluginConfig {
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
interface DevToolsPluginConfig {
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
 * Sync API returned when sync plugin is enabled
 */
interface SyncApi {
    /** Force broadcast current state */
    broadcast: () => void;
    /** Disconnect from sync channel */
    disconnect: () => void;
    /** Get sync status */
    getStatus: () => {
        connected: boolean;
        tabId: string;
        lastSyncAt: number | null;
    };
}
/**
 * DevTools API returned when devtools plugin is enabled
 */
interface DevToolsApi {
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
    getStatus?: () => {
        connected: boolean;
    };
}
interface Store<TState extends object, TActions extends object> {
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
type Listener<TState> = (state: TState, prevState: TState) => void;
type Unsubscribe = () => void;
type EventPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';
interface StoreEvent<TPayload = unknown> {
    type: string;
    payload: TPayload;
    timestamp: number;
    source: 'user' | 'system' | 'sync' | 'plugin';
    priority: EventPriority;
    meta?: Record<string, unknown>;
}
type EventHandler<TPayload = unknown> = (event: StoreEvent<TPayload>) => void;
interface EventBus {
    emit<T>(type: string, payload: T, options?: EmitOptions): void;
    on<T>(type: string, handler: EventHandler<T>): Unsubscribe;
    once<T>(type: string, handler: EventHandler<T>): Unsubscribe;
    off(type: string, handler?: EventHandler): void;
}
interface EmitOptions {
    source?: StoreEvent['source'];
    priority?: EventPriority;
    meta?: Record<string, unknown>;
}
interface PerformanceUtils {
    /** Schedule a task with priority */
    schedule<T>(task: () => T | Promise<T>, priority?: 'high' | 'normal' | 'low'): Promise<T>;
    /** Yield to main thread */
    yieldToMain(): Promise<void>;
    /** Process array in chunks */
    chunked<T, R>(items: T[], fn: (item: T) => R, options?: ChunkedOptions): Promise<R[]>;
    /** Offload to worker (if workers enabled) */
    offload?<T, R>(taskType: string, data: T): Promise<R>;
}
interface ChunkedOptions {
    chunkSize?: number;
    yieldEvery?: boolean;
}
interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: ZodError;
}
interface DataSource<T> {
    type: 'query' | 'mutation' | 'subscription';
    getCacheKey(): string;
    fetch(): Promise<T>;
    subscribe?(callback: (data: T) => void): Unsubscribe;
    invalidate(): void;
}
interface DataSourceConfig<T> {
    cacheKey?: string | (() => string);
    staleTime?: number;
    cacheTime?: number;
    retry?: number | boolean;
    retryDelay?: number;
    transform?: (raw: unknown) => T;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
}

/**
 * Infer return type based on config
 */
type StoreReturn<TState extends object, TActions extends object, TConfig extends StoreConfig<TState, TActions>> = Store<TState, TActions> & TActions & (TConfig['persist'] extends PersistPluginConfig | true ? {
    persist: PersistApi;
} : object) & (TConfig['sync'] extends SyncPluginConfig | string | true ? {
    sync: SyncApi;
} : object) & (TConfig['devtools'] extends DevToolsPluginConfig | true ? {
    devtools: DevToolsApi;
} : object);
/**
 * Create a new store with v2 plugin architecture
 */
declare function createStore<TState extends object, TActions extends object = object, TConfig extends StoreConfig<TState, TActions> = StoreConfig<TState, TActions>>(config: TConfig): StoreReturn<TState, TActions, TConfig>;
/**
 * Create a selector function with memoization
 */
declare function createSelector<TState, TResult>(selector: (state: TState) => TResult, equalityFn?: (a: TResult, b: TResult) => boolean): (state: TState) => TResult;
/**
 * Shallow equality check for objects
 */
declare function shallowEqual<T>(a: T, b: T): boolean;

/**
 * Deep proxy for fine-grained reactivity
 * Uses Proxy + Reflect pattern inspired by Vue 3 reactivity
 */
type ChangeCallback = () => void;
interface ProxyConfig {
    deep?: boolean;
    onChange?: ChangeCallback;
}
/**
 * Get raw value from proxy
 */
declare function toRaw<T>(proxy: T): T;
/**
 * Check if value is a proxy
 */
declare function isProxy(value: unknown): boolean;
/**
 * Create a deep reactive proxy
 */
declare function createReactiveProxy<T extends object>(target: T, config?: ProxyConfig): T;
/**
 * Subscription manager for state changes
 */
declare class SubscriptionManager<TState> {
    private listeners;
    private batchedNotifications;
    private isBatching;
    private notifyScheduled;
    /**
     * Subscribe to state changes
     */
    subscribe(listener: Listener<TState>): Unsubscribe;
    /**
     * Notify all listeners of state change
     */
    notify(state: TState, prevState: TState): void;
    /**
     * Start batching notifications
     */
    startBatch(): void;
    /**
     * End batching and flush notifications
     */
    endBatch(): void;
    /**
     * Schedule notification in next microtask
     */
    private scheduleNotify;
    /**
     * Flush batched notifications
     */
    private flushBatch;
    /**
     * Actually notify listeners
     */
    private notifyListeners;
    /**
     * Get listener count
     */
    get size(): number;
    /**
     * Clear all listeners
     */
    clear(): void;
}

/**
 * Computed values manager
 */
declare class ComputedManager<TState extends object> {
    private computedMap;
    private definitions;
    private getState;
    constructor(definitions: ComputedDefinitions<TState> | undefined, getState: () => TState);
    /**
     * Initialize all computed values
     */
    private initialize;
    /**
     * Create a proxy that lazily evaluates computed values
     */
    private createComputedProxy;
    /**
     * Get a computed value
     */
    get(key: string): unknown;
    /**
     * Get all computed values
     */
    getAll(): Record<string, unknown>;
    /**
     * Invalidate all computed values
     */
    invalidateAll(): void;
    /**
     * Invalidate specific computed value
     */
    invalidate(key: string): void;
    /**
     * Check if computed value exists
     */
    has(key: string): boolean;
    /**
     * Get computed keys
     */
    keys(): string[];
}

/**
 * Interceptors manager - Axios-style hooks
 */
declare class InterceptorsManager<TState> {
    private interceptors;
    constructor(interceptors?: Interceptors<TState>);
    /**
     * Execute beforeSet interceptor
     * Returns transformed value or original if no transform
     */
    beforeSet(path: string | null, value: Partial<TState>, prevState: TState): Partial<TState>;
    /**
     * Execute afterSet interceptor
     */
    afterSet(path: string | null, value: Partial<TState>, newState: TState): void;
    /**
     * Handle error through interceptor or console
     */
    handleError(error: Error, context: ErrorContext): void;
    /**
     * Check if any interceptors are defined
     */
    hasInterceptors(): boolean;
    /**
     * Update interceptors
     */
    setInterceptors(interceptors: Interceptors<TState>): void;
}

/**
 * Event bus implementation for bi-directional communication
 */
declare function createEventBus(): EventBus;
/**
 * Built-in event types
 */
declare const StoreEvents: {
    readonly STATE_CHANGE: "state:change";
    readonly STATE_RESET: "state:reset";
    readonly COMPUTED_INVALIDATE: "computed:invalidate";
    readonly ERROR: "error";
    readonly DESTROY: "destroy";
};

/**
 * Create initial async state
 */
declare function createAsyncState<TData, TError = Error>(): AsyncState<TData, TError>;
/**
 * Finite State Machine for async state transitions
 */
declare class AsyncStateMachine<TData, TError = Error> {
    private state;
    private listeners;
    constructor(initialState?: Partial<AsyncState<TData, TError>>);
    /**
     * Get current state
     */
    getState(): AsyncState<TData, TError>;
    /**
     * Check if transition is valid
     */
    canTransition(to: AsyncStatus): boolean;
    /**
     * Transition to a new status
     */
    transition(to: AsyncStatus, payload?: Partial<Omit<AsyncState<TData, TError>, 'status'>>): boolean;
    /**
     * Set loading state
     */
    setLoading(): void;
    /**
     * Set success state
     */
    setSuccess(data: TData): void;
    /**
     * Set error state
     */
    setError(error: TError): void;
    /**
     * Set stale state
     */
    setStale(): void;
    /**
     * Reset to idle
     */
    reset(): void;
    /**
     * Subscribe to state changes
     */
    subscribe(listener: (state: AsyncState<TData, TError>) => void): () => void;
    /**
     * Notify all listeners
     */
    private notifyListeners;
    /**
     * Is loading (no data yet)
     */
    get isLoading(): boolean;
    /**
     * Is loading with error (no data, but has error)
     */
    get isLoadingError(): boolean;
    /**
     * Is success
     */
    get isSuccess(): boolean;
    /**
     * Is error
     */
    get isError(): boolean;
    /**
     * Is stale
     */
    get isStale(): boolean;
    /**
     * Is fetching (includes refetching)
     */
    get isFetching(): boolean;
    /**
     * Is refetching (fetching with existing data)
     */
    get isRefetching(): boolean;
    /**
     * Has data
     */
    get hasData(): boolean;
}
/**
 * Check if data is stale based on staleTime
 */
declare function isDataStale(dataUpdatedAt: number | null, staleTime: number): boolean;

/**
 * Schema validator using Zod
 */
declare class SchemaValidator<TState> {
    private schema?;
    constructor(schema?: ZodType<TState> | undefined);
    /**
     * Validate data against schema
     */
    validate(data: unknown): TState;
    /**
     * Safe validation that returns result object
     */
    safeParse(data: unknown): ValidationResult<TState>;
    /**
     * Validate partial data (for updates)
     */
    validatePartial(data: unknown): Partial<TState>;
    /**
     * Safe partial validation
     */
    safeParsePartial(data: unknown): ValidationResult<Partial<TState>>;
    /**
     * Get the underlying schema
     */
    getSchema(): ZodType<TState> | undefined;
}
/**
 * Create a schema validator
 */
declare function createSchemaValidator<TState>(schema: ZodType<TState>): SchemaValidator<TState>;

/**
 * Frame-aware task scheduler
 * Respects browser's rendering budget to maintain 60fps
 */
declare class TaskScheduler {
    private frameBudgetMs;
    private taskQueue;
    private isProcessing;
    private frameDeadline;
    constructor(frameBudgetMs?: number);
    /**
     * Schedule a task with priority
     */
    schedule<T>(task: () => T | Promise<T>, priority?: 'high' | 'normal' | 'low'): Promise<T>;
    /**
     * Request processing time
     */
    private requestProcessing;
    /**
     * Process queue while respecting frame budget
     */
    private processQueue;
    /**
     * Check if we should yield to browser
     */
    private shouldYield;
    /**
     * Yield to main thread
     */
    yieldToMain(): Promise<void>;
    /**
     * Process array in chunks
     */
    chunked<T, R>(items: T[], fn: (item: T) => R, options?: ChunkedOptions): Promise<R[]>;
}
/**
 * Create performance utilities based on config
 */
declare function createPerformanceUtils(config: PerformanceConfig | undefined): PerformanceUtils | undefined;

/**
 * Subscriber interface for dependency tracking
 */
interface Subscriber {
    /** Called when a dependency changes */
    invalidate(): void;
    /** Dependencies this subscriber is tracking */
    dependencies: Set<ReadableSignal<unknown>>;
}
/**
 * Read-only signal interface
 */
interface ReadableSignal<T> {
    /** Get current value (tracks dependency if in reactive context) */
    get(): T;
    /** Subscribe to value changes */
    subscribe(fn: (value: T) => void): () => void;
    /** Peek value without tracking */
    peek(): T;
}
/**
 * Writable signal interface
 */
interface WritableSignal<T> extends ReadableSignal<T> {
    /** Set new value */
    set(value: T): void;
    /** Update value using function */
    update(fn: (current: T) => T): void;
}
/**
 * Computed signal interface (read-only + lazy)
 */
interface ComputedSignal<T> extends ReadableSignal<T> {
    /** Check if value needs recomputation */
    readonly dirty: boolean;
}
/**
 * Effect dispose function
 */
type EffectDispose = () => void;

/**
 * Create a new signal
 */
declare function signal<T>(initialValue: T): WritableSignal<T>;
/**
 * Type guard for signal
 */
declare function isSignal(value: unknown): value is WritableSignal<unknown>;

/**
 * Create a computed signal (lazy derived value)
 *
 * @example
 * ```ts
 * const count = signal(5);
 * const double = computed(() => count.get() * 2);
 *
 * double.get(); // 10 (computed on first access)
 * double.get(); // 10 (cached)
 * count.set(10);
 * double.get(); // 20 (recomputed)
 * ```
 */
declare function computed<T>(fn: () => T): ComputedSignal<T>;
/**
 * Type guard for computed
 */
declare function isComputed(value: unknown): value is ComputedSignal<unknown>;

/**
 * Create an effect that runs immediately and re-runs when dependencies change.
 * Returns a dispose function to stop the effect.
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * const dispose = effect(() => {
 *   console.log('Count:', count.get());
 *
 *   // Optional: return cleanup function
 *   return () => console.log('Cleaning up');
 * });
 *
 * count.set(1); // Logs: "Cleaning up", then "Count: 1"
 * dispose();    // Stops effect and runs cleanup
 * ```
 */
declare function effect(fn: () => void | (() => void)): EffectDispose;

/**
 * Execute a function with batched updates.
 * All signal changes within the function will be
 * deferred until the function completes.
 *
 * @example
 * ```ts
 * batch(() => {
 *   count.set(1);
 *   count.set(2);
 *   count.set(3);
 * }); // Subscribers notified only once with final value
 * ```
 */
declare function batch<T>(fn: () => T): T;
/**
 * Check if we're currently in a batch
 */
declare function isBatching(): boolean;

/**
 * Check if we're currently tracking dependencies
 */
declare function isTracking(): boolean;
/**
 * Run a function without tracking dependencies
 */
declare function untracked<T>(fn: () => T): T;

export { ASYNC_TRANSITIONS, type AsyncState, AsyncStateMachine, type AsyncStatus, type ChunkedOptions, type ComputedDefinitions, type ComputedFn, ComputedManager, type ComputedSignal, type ComputedValues, type DataSource, type DataSourceConfig, type DevToolsApi, type DevToolsPluginConfig, type EffectDispose, type EmitOptions, type ErrorContext, type EventBus, type EventHandler, type EventPriority, type GetState, type Interceptors, InterceptorsManager, type Listener, type PerformanceConfig, type PerformanceOptions, type PerformancePreset, type PerformanceUtils, type PersistApi, type PersistPluginConfig, type Plugin, type ReadableSignal, SchemaValidator, type SetOptions, type SetState, type Store, type StoreConfig, type StoreEvent, StoreEvents, type Subscriber, SubscriptionManager, type SyncApi, type SyncPluginConfig, TaskScheduler, type Unsubscribe, type ValidationResult, type WorkerConfig, type WritableSignal, batch, computed, createAsyncState, createEventBus, createPerformanceUtils, createReactiveProxy, createSchemaValidator, createSelector, createStore, effect, isBatching, isComputed, isDataStale, isProxy, isSignal, isTracking, shallowEqual, signal, toRaw, untracked };
