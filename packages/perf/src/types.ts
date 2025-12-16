// ============================================================================
// Performance Types
// ============================================================================

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle'

/**
 * Scheduled task
 */
export interface ScheduledTask<T = unknown> {
  id: string
  task: () => T | Promise<T>
  priority: TaskPriority
  createdAt: number
}

/**
 * Batch update options
 */
export interface BatchOptions {
  /** Maximum batch size */
  maxSize?: number
  /** Maximum wait time before flush (ms) */
  maxWait?: number
  /** Minimum wait time for batching (ms) */
  debounceMs?: number
}

/**
 * Chunked processing options
 */
export interface ChunkOptions {
  /** Items per chunk */
  chunkSize?: number
  /** Yield to main thread between chunks */
  yieldBetweenChunks?: boolean
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Memory info
 */
export interface MemoryInfo {
  /** Used JS heap size in bytes */
  usedHeap: number
  /** Total JS heap size in bytes */
  totalHeap: number
  /** Heap limit in bytes */
  heapLimit: number
  /** Usage percentage (0-1) */
  usagePercent: number
}

/**
 * Memory pressure level
 */
export type MemoryPressure = 'none' | 'moderate' | 'critical'

/**
 * Worker task
 */
export interface WorkerTask<TInput = unknown, TOutput = unknown> {
  type: string
  payload: TInput
  resolve: (value: TOutput) => void
  reject: (error: Error) => void
}

/**
 * Worker pool options
 */
export interface WorkerPoolOptions {
  /** Maximum number of workers */
  maxWorkers?: number
  /** Worker script URL or factory */
  workerFactory?: () => Worker
  /** Terminate idle workers after ms */
  idleTimeout?: number
}

/**
 * Scheduler options
 */
export interface SchedulerOptions {
  /** Frame budget in ms (default: 5ms for 60fps) */
  frameBudget?: number
  /** Use requestIdleCallback when available */
  useIdleCallback?: boolean
}
