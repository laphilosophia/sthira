import { StreamBuffer } from '../engine/StreamBuffer'
import { WorkerPool } from '../engine/WorkerPool'
import type {
  HandlerID,
  Ref,
  ScopeID,
  StreamID,
  TaskStatus,
  WorkerID,
} from '../types'
import { Handler } from './Handler'
import { Stream } from './Stream'
import { Worker } from './Worker'

/**
 * Generates a unique ref.
 */
const generateRef = (): Ref => {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Task outcome after completion.
 */
export type TaskOutcome = 'success' | 'error' | 'aborted'

/**
 * Options for run() execution.
 */
export interface TaskRunOptions {
  /** Run in idle time (requestIdleCallback) */
  readonly deferred?: boolean
  /** Enable incremental output streaming */
  readonly streaming?: boolean
}

/**
 * Task - Single execution instance.
 *
 * Task provides dual-API:
 * - effect() — Light path, direct execution, no overhead
 * - run() — Heavy path, uses WorkerPool, streaming
 *
 * @see {@link docs/execution-semantics.md#task}
 * @see {@link docs/engine-semantics.md#dual-execution-api}
 */
export class Task<T = unknown> {
  readonly ref: Ref
  readonly scopeId: ScopeID

  private readonly _controller = new AbortController()
  private readonly _workerPool: WorkerPool | null
  private _status: TaskStatus = 'pending'
  private _outcome: TaskOutcome | null = null
  private _error: Error | null = null
  private _result: T | null = null

  private readonly _workers = new Map<WorkerID, Worker>()
  private readonly _handlers = new Map<HandlerID, Handler>()
  private readonly _streams = new Map<StreamID, Stream>()

  /**
   * Create a new Task.
   *
   * @param scopeId - Scope this task belongs to
   * @param workerPool - Optional WorkerPool for heavy execution
   * @param ref - Optional custom ref
   */
  constructor(scopeId: ScopeID, workerPool?: WorkerPool, ref?: Ref) {
    this.ref = ref ?? generateRef()
    this.scopeId = scopeId
    this._workerPool = workerPool ?? null
  }

  /**
   * Abort signal for cancellation.
   */
  get signal(): AbortSignal {
    return this._controller.signal
  }

  /**
   * Current task status.
   */
  get status(): TaskStatus {
    return this._status
  }

  /**
   * Task outcome (only available after completion).
   */
  get outcome(): TaskOutcome | null {
    return this._outcome
  }

  /**
   * Error if task failed.
   */
  get error(): Error | null {
    return this._error
  }

  /**
   * Result if task succeeded.
   */
  get result(): T | null {
    return this._result
  }

  /**
   * Check if task is still active.
   */
  get isActive(): boolean {
    return this._status === 'pending' || this._status === 'running'
  }

  /**
   * Check if task completed (success, error, or aborted).
   */
  get isComplete(): boolean {
    return !this.isActive
  }

  /**
   * Number of active workers.
   */
  get workerCount(): number {
    return this._workers.size
  }

  /**
   * Number of registered handlers.
   */
  get handlerCount(): number {
    return this._handlers.size
  }

  /**
   * Number of active streams.
   */
  get streamCount(): number {
    return this._streams.size
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DUAL EXECUTION API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Light path execution — direct, no worker overhead.
   *
   * Use for:
   * - Computed properties
   * - Signal reflections
   * - Trivial operations
   *
   * @param fn - Sync or async function to execute
   * @returns Result directly
   *
   * @see {@link docs/engine-semantics.md#effect}
   */
  effect<R>(fn: () => R): R
  effect<R>(fn: () => Promise<R>): Promise<R>
  effect<R>(fn: () => R | Promise<R>): R | Promise<R> {
    if (!this.isActive) {
      throw new Error('Cannot execute effect: task is not active')
    }

    return fn()
  }

  /**
   * Heavy path execution — uses WorkerPool, streaming, buffering.
   *
   * Use for:
   * - Heavy computation
   * - Large data processing
   * - API calls with large payloads
   *
   * @param fn - Async function to execute
   * @param options - Execution options
   * @returns Promise resolving with result
   *
   * @see {@link docs/engine-semantics.md#run}
   */
  async run<R>(
    fn: (ctx: TaskContext) => Promise<R>,
    options: TaskRunOptions = {}
  ): Promise<R> {
    if (this._status !== 'pending') {
      throw new Error(`Cannot run task: status is ${this._status}`)
    }

    this._status = 'running'

    const { deferred = false, streaming = false } = options

    // Create context
    const buffer = streaming ? new StreamBuffer<unknown>() : null
    const ctx: TaskContext = {
      ref: this.ref,
      signal: this._controller.signal,
      emit: buffer ? (value) => buffer.push(value) : undefined,
      spawnWorker: (workerFn) => this._spawnWorker(workerFn),
      addHandler: (handlerFn) => this._addHandler(handlerFn),
      createStream: <S>() => this._createStream<S>(),
    }

    try {
      if (this._controller.signal.aborted) {
        this._status = 'aborted'
        this._outcome = 'aborted'
        throw new Error('Task was aborted')
      }

      let result: R

      // Deferred execution (idle time)
      if (deferred) {
        result = await this._runDeferred(() => fn(ctx))
      } else if (this._workerPool) {
        // Worker pool execution
        result = await this._workerPool.execute(() => fn(ctx))
      } else {
        // Direct execution
        result = await fn(ctx)
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime guard for async abort
      if (this._controller.signal.aborted) {
        this._status = 'aborted'
        this._outcome = 'aborted'
        throw new Error('Task was aborted')
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Generic result type requires cast
      this._result = result as unknown as T
      this._status = 'success'
      this._outcome = 'success'

      return result
    } catch (err) {
      if (this._controller.signal.aborted) {
        this._status = 'aborted'
        this._outcome = 'aborted'
      } else {
        this._status = 'error'
        this._outcome = 'error'
        this._error = err instanceof Error ? err : new Error(String(err))
      }
      throw this._error ?? new Error('Task was aborted')
    }
  }

  /**
   * Abort the task.
   *
   * Terminates all workers, cancels handlers, aborts streams.
   *
   * @see {@link docs/algorithm.md#disposal-algorithm}
   */
  abort(): void {
    if (!this.isActive) {
      return
    }

    this._controller.abort()

    for (const worker of this._workers.values()) {
      worker.terminate()
    }

    for (const handler of this._handlers.values()) {
      handler.cancel()
    }

    for (const stream of this._streams.values()) {
      stream.abort()
    }

    this._status = 'aborted'
    this._outcome = 'aborted'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private _runDeferred<R>(fn: () => Promise<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const execute = (): void => {
        fn().then(resolve).catch(reject)
      }

      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          execute()
        })
      } else {
        setTimeout(execute, 0)
      }
    })
  }

  private _spawnWorker(
    fn: (signal: AbortSignal) => Promise<void>
  ): WorkerHandle {
    if (!this.isActive) {
      throw new Error('Cannot spawn worker: task is not active')
    }

    const worker = new Worker(this.ref)
    this._workers.set(worker.id, worker)

    void worker.start(fn).catch(() => {
      // Worker errors tracked in worker.error
    })

    return {
      id: worker.id,
      terminate: () => {
        worker.terminate()
      },
    }
  }

  private _addHandler(fn: () => Promise<void>): HandlerHandle {
    if (!this.isActive) {
      throw new Error('Cannot add handler: task is not active')
    }

    const handler = new Handler(this.ref)
    handler.setFunction(fn)
    this._handlers.set(handler.id, handler)

    return {
      id: handler.id,
      execute: () => handler.execute(),
      cancel: () => {
        handler.cancel()
      },
    }
  }

  private _createStream<S>(): StreamHandle<S> {
    if (!this.isActive) {
      throw new Error('Cannot create stream: task is not active')
    }

    const stream = new Stream<S>(this.ref)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Stream generic type requires cast
    this._streams.set(stream.id, stream as unknown as Stream)

    return {
      id: stream.id,
      emit: (value) => {
        stream.emit(value)
      },
      subscribe: (fn) => stream.subscribe(fn),
      abort: () => {
        stream.abort()
      },
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Context passed to run() function.
 */
export interface TaskContext {
  readonly ref: Ref
  readonly signal: AbortSignal
  readonly emit: ((value: unknown) => boolean) | undefined
  readonly spawnWorker: (
    fn: (signal: AbortSignal) => Promise<void>
  ) => WorkerHandle
  readonly addHandler: (fn: () => Promise<void>) => HandlerHandle
  readonly createStream: <S>() => StreamHandle<S>
}

/**
 * Worker handle returned to task.
 */
interface WorkerHandle {
  readonly id: string
  readonly terminate: () => void
}

/**
 * Handler handle returned to task.
 */
interface HandlerHandle {
  readonly id: string
  readonly execute: () => Promise<void>
  readonly cancel: () => void
}

/**
 * Stream handle returned to task.
 */
interface StreamHandle<S> {
  readonly id: string
  readonly emit: (value: S) => void
  readonly subscribe: (fn: (value: S) => void) => () => void
  readonly abort: () => void
}
