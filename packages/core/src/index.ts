/**
 * @sthira/core
 *
 * Deterministic execution engine kernel for frontend applications.
 *
 * @see {@link docs/execution-semantics.md}
 * @packageDocumentation
 */

// Types
export * from './types'

// Scope
export {
  Scope,
  ScopeFSM,
  type ScopeConfig,
  type ScopeEngineConfig,
} from './scope'

// Task Execution Units
export {
  Handler,
  Stream,
  Task,
  TaskTable,
  Worker,
  type HandlerStatus,
  type StreamStatus,
  type StreamSubscriber,
  type TaskContext,
  type TaskOutcome,
  type TaskRunOptions,
  type WorkerStatus,
} from './task'

// Engine
export {
  StreamBuffer,
  WorkerPool,
  type StreamBufferConfig,
  type WorkerPoolConfig,
} from './engine'

// Core
export {
  Authority,
  type AuthorityConfig,
  type AuthorityEngineConfig,
} from './core'

// Public API
export {
  createAuthority,
  createScope,
  createTask,
  type TaskFactory,
} from './api'
