import type { Ref, RequestID, ScopeID } from './ids'

/**
 * Task execution status.
 *
 * @see {@link docs/execution-semantics.md}
 */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'aborted'

/**
 * Task outcome classification.
 *
 * @see {@link docs/failure-taxonomy.md}
 */
export type TaskOutcome =
  | 'SUCCESS'
  | 'ERROR'
  | 'ABORTED'
  | 'REJECTED'
  | 'TIMEOUT'

/**
 * Internal execution request representation.
 *
 * @see {@link docs/execution-activation.md#execution-request-format}
 */
export interface ExecutionRequest {
  readonly id: RequestID
  readonly scopeId: ScopeID
  readonly timestamp: number
  readonly priority?: TaskPriority
}

/**
 * Task priority levels.
 *
 * @see {@link docs/scheduler-priority.md#priority-model}
 */
export type TaskPriority = 'HIGH' | 'NORMAL' | 'LOW'

/**
 * Context passed to task function.
 *
 * @see {@link docs/api-contract.md#task-api}
 */
export interface TaskContext {
  /** Immutable execution symbol */
  readonly ref: Ref
  /** Abort signal for cancellation */
  readonly signal: AbortSignal
  /** Spawn a worker for parallel execution */
  readonly spawnWorker: (fn: WorkerFunction) => WorkerHandle
  /** Add a handler for execution */
  readonly addHandler: (fn: HandlerFunction) => HandlerHandle
  /** Create a stream for output */
  readonly createStream: <T>() => StreamHandle<T>
}

/**
 * Task function signature.
 */
export type TaskFunction<T = unknown> = (ctx: TaskContext) => Promise<T>

/**
 * Worker function signature.
 */
export type WorkerFunction = (signal: AbortSignal) => Promise<void>

/**
 * Handler function signature.
 */
export type HandlerFunction = () => Promise<void>

/**
 * Worker handle returned to task.
 */
export interface WorkerHandle {
  readonly id: string
  readonly terminate: () => void
}

/**
 * Handler handle returned to task.
 */
export interface HandlerHandle {
  readonly id: string
  readonly execute: () => Promise<void>
  readonly cancel: () => void
}

/**
 * Stream handle returned to task.
 */
export interface StreamHandle<T = unknown> {
  readonly id: string
  readonly emit: (value: T) => void
  readonly subscribe: (fn: (value: T) => void) => () => void
  readonly abort: () => void
}
