// ============================================================================
// @sthira/core - High-performance state manager
// ============================================================================

// Core store
export { createSelector, createStore, shallowEqual } from './store'

// Proxy utilities
export { SubscriptionManager, createReactiveProxy, isProxy, toRaw } from './proxy'

// Computed
export { ComputedManager } from './computed'

// Interceptors
export { InterceptorsManager } from './interceptors'

// Event bus
export { StoreEvents, createEventBus } from './events'

// FSM
export { AsyncStateMachine, createAsyncState, isDataStale } from './fsm'

// Schema validation
export { SchemaValidator, createSchemaValidator } from './schema'

// Scheduler (lazy-loaded if performance enabled)
export { TaskScheduler, createPerformanceUtils } from './scheduler'

// Types
export type {
  AsyncState,
  // FSM
  AsyncStatus,
  ChunkedOptions,
  // Computed
  ComputedDefinitions,
  ComputedFn,
  ComputedValues,
  // DataSource
  DataSource,
  DataSourceConfig,
  // v2 Plugin APIs
  DevToolsApi,
  DevToolsPluginConfig,
  EmitOptions,
  ErrorContext,
  // Events
  EventBus,
  EventHandler,
  EventPriority,
  GetState,
  // Interceptors
  Interceptors,
  Listener,
  // Performance
  PerformanceConfig,
  PerformanceOptions,
  PerformancePreset,
  PerformanceUtils,
  // v2 Plugin APIs
  PersistApi,
  PersistPluginConfig,
  // Plugins
  Plugin,
  SetOptions,
  SetState,
  Store,
  // Store
  StoreConfig,
  StoreEvent,
  // v2 Plugin APIs
  SyncApi,
  SyncPluginConfig,
  Unsubscribe,
  // Validation
  ValidationResult,
  WorkerConfig,
} from './types'

// Re-export FSM transitions for external use
export { ASYNC_TRANSITIONS } from './types'
