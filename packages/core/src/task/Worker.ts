import type { Ref, WorkerID } from '../types'

/**
 * Generates a unique worker ID.
 */
const generateWorkerId = (): WorkerID => {
  return `worker_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Worker execution status.
 */
export type WorkerStatus = 'idle' | 'running' | 'terminated' | 'failed'

/**
 * Worker - Task-correlated execution unit.
 *
 * Workers are:
 * - Strictly bound to a single task via Ref
 * - Spawned only after execution activation
 * - Destroyed when task is disposed
 *
 * Workers do NOT:
 * - Mutate state directly
 * - Commit results
 * - Manage cache validity
 *
 * @see {@link docs/worker-lifecycle.md}
 * @see {@link docs/execution-semantics.md#worker}
 */
export class Worker {
  readonly id: WorkerID
  readonly taskRef: Ref

  private _status: WorkerStatus = 'idle'
  private _abortController: AbortController
  private _error: Error | null = null

  constructor(taskRef: Ref) {
    this.id = generateWorkerId()
    this.taskRef = taskRef
    this._abortController = new AbortController()
  }

  /**
   * Current worker status.
   */
  get status(): WorkerStatus {
    return this._status
  }

  /**
   * Abort signal for cancellation.
   */
  get signal(): AbortSignal {
    return this._abortController.signal
  }

  /**
   * Error if worker failed.
   */
  get error(): Error | null {
    return this._error
  }

  /**
   * Check if worker is active (idle or running).
   */
  get isActive(): boolean {
    return this._status === 'idle' || this._status === 'running'
  }

  /**
   * Start worker execution.
   *
   * @param fn - Worker function to execute
   * @returns Promise that resolves when worker completes
   *
   * @see {@link docs/worker-lifecycle.md#worker-execution-model}
   */
  async start(fn: (signal: AbortSignal) => Promise<void>): Promise<void> {
    if (this._status !== 'idle') {
      throw new Error(`Cannot start worker: status is ${this._status}`)
    }

    this._status = 'running'

    try {
      await fn(this._abortController.signal)

      // Only mark success if not already terminated
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime guard for async termination
      if (this._status === 'running') {
        this._status = 'terminated'
      }
    } catch (err) {
      // Check if aborted
      if (this._abortController.signal.aborted) {
        this._status = 'terminated'
        return
      }

      // Worker failure
      this._status = 'failed'
      this._error = err instanceof Error ? err : new Error(String(err))
      throw this._error
    }
  }

  /**
   * Terminate worker execution.
   *
   * Triggers abort signal and marks worker as terminated.
   *
   * @see {@link docs/worker-lifecycle.md#disposal-semantics}
   */
  terminate(): void {
    if (!this.isActive) {
      return
    }

    this._abortController.abort()
    this._status = 'terminated'
  }
}
