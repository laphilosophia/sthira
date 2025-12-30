/**
 * WorkerPool - Manages Web Worker lifecycle.
 *
 * Handles:
 * - Worker spawning and termination
 * - Work distribution across workers
 * - Graceful shutdown
 *
 * @see {@link docs/engine-semantics.md#workerpool}
 */

export interface WorkerPoolConfig {
  /** Default number of workers */
  readonly defaultWorkers: number
  /** Maximum number of workers */
  readonly maxWorkers: number
  /** Idle timeout before terminating worker (ms) */
  readonly idleTimeout?: number
}

interface PendingWork<T> {
  readonly id: string
  readonly fn: () => T | Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: Error) => void
}

type WorkerState = 'idle' | 'busy' | 'terminated'

interface PooledWorker {
  id: string
  state: WorkerState
  currentWorkId: string | null
}

/**
 * WorkerPool manages a pool of logical workers for task execution.
 *
 * Note: In browser, these will be Web Workers.
 * For now, this is a logical pool that simulates worker behavior
 * using async execution for development/testing.
 *
 * @see {@link docs/engine-semantics.md}
 */
export class WorkerPool {
  private readonly _config: Required<WorkerPoolConfig>
  private readonly _workers: Map<string, PooledWorker> = new Map()
  private readonly _queue: PendingWork<unknown>[] = []
  private _disposed = false
  private _workCounter = 0

  constructor(config: WorkerPoolConfig) {
    this._config = {
      defaultWorkers: config.defaultWorkers,
      maxWorkers: config.maxWorkers,
      idleTimeout: config.idleTimeout ?? 30000,
    }

    // Initialize default workers
    this._initializeWorkers(this._config.defaultWorkers)
  }

  /**
   * Number of workers in the pool.
   */
  get size(): number {
    return this._workers.size
  }

  /**
   * Number of idle workers.
   */
  get idleCount(): number {
    let count = 0
    for (const worker of this._workers.values()) {
      if (worker.state === 'idle') count++
    }
    return count
  }

  /**
   * Number of busy workers.
   */
  get busyCount(): number {
    let count = 0
    for (const worker of this._workers.values()) {
      if (worker.state === 'busy') count++
    }
    return count
  }

  /**
   * Number of queued work items.
   */
  get queueSize(): number {
    return this._queue.length
  }

  /**
   * Check if pool is disposed.
   */
  get isDisposed(): boolean {
    return this._disposed
  }

  /**
   * Execute work in the pool.
   *
   * If a worker is available, executes immediately.
   * Otherwise, queues the work.
   *
   * @param fn - Function to execute
   * @returns Promise resolving with result
   */
  execute<T>(fn: () => T | Promise<T>): Promise<T> {
    if (this._disposed) {
      return Promise.reject(new Error('WorkerPool is disposed'))
    }

    const workId = this._generateWorkId()

    return new Promise<T>((resolve, reject) => {
      const work: PendingWork<T> = {
        id: workId,
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
      }

      // Try to find an idle worker
      const idleWorker = this._findIdleWorker()
      if (idleWorker) {
        this._dispatchWork(idleWorker, work as PendingWork<unknown>)
      } else {
        // Queue the work
        this._queue.push(work as PendingWork<unknown>)
      }
    })
  }

  /**
   * Scale the pool to a specific number of workers.
   *
   * @param count - Target worker count (capped by maxWorkers)
   */
  scale(count: number): void {
    if (this._disposed) return

    const target = Math.min(count, this._config.maxWorkers)
    const current = this._workers.size

    if (target > current) {
      // Add workers
      this._initializeWorkers(target - current)
    } else if (target < current) {
      // Remove idle workers first
      this._shrinkPool(current - target)
    }
  }

  /**
   * Dispose the pool and all workers.
   */
  dispose(): void {
    if (this._disposed) return

    this._disposed = true

    // Reject all queued work
    for (const work of this._queue) {
      work.reject(new Error('WorkerPool disposed'))
    }
    this._queue.length = 0

    // Terminate all workers
    for (const worker of this._workers.values()) {
      worker.state = 'terminated'
    }
    this._workers.clear()
  }

  private _initializeWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      const id = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      this._workers.set(id, {
        id,
        state: 'idle',
        currentWorkId: null,
      })
    }
  }

  private _findIdleWorker(): PooledWorker | undefined {
    for (const worker of this._workers.values()) {
      if (worker.state === 'idle') {
        return worker
      }
    }
    return undefined
  }

  private _dispatchWork(worker: PooledWorker, work: PendingWork<unknown>): void {
    worker.state = 'busy'
    worker.currentWorkId = work.id

    // Execute work asynchronously
    // In production, this would postMessage to a Web Worker
    Promise.resolve()
      .then(() => work.fn())
      .then((result) => {
        work.resolve(result)
      })
      .catch((error: unknown) => {
        work.reject(error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => {
        if (this._disposed) return

        worker.state = 'idle'
        worker.currentWorkId = null

        // Process next queued work
        this._processQueue()
      })
  }

  private _processQueue(): void {
    if (this._queue.length === 0) return

    const idleWorker = this._findIdleWorker()
    if (!idleWorker) return

    const work = this._queue.shift()
    if (work) {
      this._dispatchWork(idleWorker, work)
    }
  }

  private _shrinkPool(count: number): void {
    let removed = 0
    const toRemove: string[] = []

    // Collect idle workers to remove
    for (const worker of this._workers.values()) {
      if (removed >= count) break
      if (worker.state === 'idle') {
        toRemove.push(worker.id)
        removed++
      }
    }

    // Remove them
    for (const id of toRemove) {
      const worker = this._workers.get(id)
      if (worker) {
        worker.state = 'terminated'
        this._workers.delete(id)
      }
    }
  }

  private _generateWorkId(): string {
    return `work_${++this._workCounter}`
  }
}
