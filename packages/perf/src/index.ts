// ============================================================================
// @sthira/perf - Performance utilities for Sthira
// ============================================================================

// Batching
export { createBatcher, createReactBatcher, deepMerger, defaultMerger } from './batcher'

// Scheduler
export { TaskScheduler, chunked, getScheduler, yieldToMain } from './scheduler'

// Memory
export {
  MemoryMonitor,
  formatBytes,
  getMemoryInfo,
  getMemoryMonitor,
  getMemoryPressure,
  isMemoryPressured,
  type MemoryPressureCallback,
} from './memory'

// Utilities (shared patterns)
export { createDebounced, createPausable } from './utils'
export type { DebounceOptions, Debounced, PausableController } from './utils'

// Types
export type {
  BatchOptions,
  ChunkOptions,
  MemoryInfo,
  MemoryPressure,
  ScheduledTask,
  SchedulerOptions,
  TaskPriority,
  WorkerPoolOptions,
  WorkerTask,
} from './types'
