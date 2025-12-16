/**
 * Task priority levels
 */
type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';
/**
 * Scheduled task
 */
interface ScheduledTask<T = unknown> {
    id: string;
    task: () => T | Promise<T>;
    priority: TaskPriority;
    createdAt: number;
}
/**
 * Batch update options
 */
interface BatchOptions {
    /** Maximum batch size */
    maxSize?: number;
    /** Maximum wait time before flush (ms) */
    maxWait?: number;
    /** Minimum wait time for batching (ms) */
    debounceMs?: number;
}
/**
 * Chunked processing options
 */
interface ChunkOptions {
    /** Items per chunk */
    chunkSize?: number;
    /** Yield to main thread between chunks */
    yieldBetweenChunks?: boolean;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}
/**
 * Memory info
 */
interface MemoryInfo {
    /** Used JS heap size in bytes */
    usedHeap: number;
    /** Total JS heap size in bytes */
    totalHeap: number;
    /** Heap limit in bytes */
    heapLimit: number;
    /** Usage percentage (0-1) */
    usagePercent: number;
}
/**
 * Memory pressure level
 */
type MemoryPressure = 'none' | 'moderate' | 'critical';
/**
 * Worker task
 */
interface WorkerTask<TInput = unknown, TOutput = unknown> {
    type: string;
    payload: TInput;
    resolve: (value: TOutput) => void;
    reject: (error: Error) => void;
}
/**
 * Worker pool options
 */
interface WorkerPoolOptions {
    /** Maximum number of workers */
    maxWorkers?: number;
    /** Worker script URL or factory */
    workerFactory?: () => Worker;
    /** Terminate idle workers after ms */
    idleTimeout?: number;
}
/**
 * Scheduler options
 */
interface SchedulerOptions {
    /** Frame budget in ms (default: 5ms for 60fps) */
    frameBudget?: number;
    /** Use requestIdleCallback when available */
    useIdleCallback?: boolean;
}

/**
 * Create a batcher that collects updates and flushes them together
 * Useful for reducing React re-renders
 */
declare function createBatcher<T>(flush: (items: T[]) => void, options?: BatchOptions): {
    add: (item: T) => void;
    flush: () => void;
    readonly pending: number;
};
/**
 * Batch React state updates using unstable_batchedUpdates pattern
 */
declare function createReactBatcher<T>(setState: (updater: (prev: T) => T) => void, merger: (batch: Partial<T>[]) => Partial<T>, options?: BatchOptions): {
    update: (partial: Partial<T>) => void;
    flush: () => void;
};
/**
 * Default merger that spreads all partials
 */
declare function defaultMerger<T>(batch: Partial<T>[]): Partial<T>;
/**
 * Deep merge for nested objects
 */
declare function deepMerger<T extends Record<string, unknown>>(batch: Partial<T>[]): Partial<T>;

/**
 * Frame-aware task scheduler
 * Respects browser's rendering budget for smooth 60fps
 */
declare class TaskScheduler {
    private queue;
    private isProcessing;
    private frameBudget;
    private useIdleCallback;
    private frameDeadline;
    constructor(options?: SchedulerOptions);
    /**
     * Schedule a task with priority
     */
    schedule<T>(task: () => T | Promise<T>, priority?: TaskPriority): Promise<T>;
    /**
     * Sort queue by priority
     */
    private sortQueue;
    /**
     * Request processing time
     */
    private requestProcessing;
    /**
     * Process queue within frame budget
     */
    private processQueue;
    /**
     * Check if we should yield to browser
     */
    private shouldYield;
    /**
     * Get queue length
     */
    get pending(): number;
    /**
     * Clear all pending tasks
     */
    clear(): void;
}
/**
 * Process array in chunks with main thread yielding
 */
declare function chunked<T, R>(items: T[], processor: (item: T, index: number) => R | Promise<R>, options?: ChunkOptions): Promise<R[]>;
/**
 * Yield to main thread
 */
declare function yieldToMain(): Promise<void>;
declare function getScheduler(options?: SchedulerOptions): TaskScheduler;

/**
 * Get current memory info (Chrome only)
 */
declare function getMemoryInfo(): MemoryInfo | null;
/**
 * Get memory pressure level
 */
declare function getMemoryPressure(): MemoryPressure;
/**
 * Check if memory is under pressure
 */
declare function isMemoryPressured(): boolean;
/**
 * Memory pressure callback type
 */
type MemoryPressureCallback = (pressure: MemoryPressure) => void;
/**
 * Memory monitor for watching memory pressure
 */
declare class MemoryMonitor {
    private intervalId;
    private callbacks;
    private lastPressure;
    private intervalMs;
    constructor(intervalMs?: number);
    /**
     * Start monitoring
     */
    start(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Check memory pressure and notify if changed
     */
    private check;
    /**
     * Subscribe to pressure changes
     */
    subscribe(callback: MemoryPressureCallback): () => void;
    /**
     * Notify all subscribers
     */
    private notify;
    /**
     * Get current memory info
     */
    getInfo(): MemoryInfo | null;
    /**
     * Get current pressure level
     */
    getPressure(): MemoryPressure;
}
/**
 * Format bytes to human readable
 */
declare function formatBytes(bytes: number): string;
declare function getMemoryMonitor(intervalMs?: number): MemoryMonitor;

/**
 * Debounce configuration
 */
interface DebounceOptions {
    /** Debounce delay in ms */
    delay: number;
    /** Optional max wait time */
    maxWait?: number;
}
/**
 * Debounced function with controls
 */
interface Debounced<T extends (...args: unknown[]) => void> {
    /** Call the debounced function */
    (...args: Parameters<T>): void;
    /** Flush immediately */
    flush(): void;
    /** Cancel pending execution */
    cancel(): void;
    /** Check if pending */
    pending(): boolean;
}
/**
 * Create a debounced version of a function
 * Shared utility for persist, cross-tab, etc.
 */
declare function createDebounced<T extends (...args: unknown[]) => void>(fn: T, options: DebounceOptions | number): Debounced<T>;
/**
 * Pausable controller
 */
interface PausableController {
    pause(): void;
    resume(): void;
    isPaused(): boolean;
}
/**
 * Create a pausable controller
 * Shared utility for persist, devtools, cross-tab
 */
declare function createPausable(): PausableController;

export { type BatchOptions, type ChunkOptions, type DebounceOptions, type Debounced, type MemoryInfo, MemoryMonitor, type MemoryPressure, type MemoryPressureCallback, type PausableController, type ScheduledTask, type SchedulerOptions, type TaskPriority, TaskScheduler, type WorkerPoolOptions, type WorkerTask, chunked, createBatcher, createDebounced, createPausable, createReactBatcher, deepMerger, defaultMerger, formatBytes, getMemoryInfo, getMemoryMonitor, getMemoryPressure, getScheduler, isMemoryPressured, yieldToMain };
