// ============================================================================
// @sthirajs/core - Signal Primitives
// Fine-grained reactivity with automatic dependency tracking
// ============================================================================

// Types
export type {
  ComputedSignal,
  EffectDispose,
  ReadableSignal,
  Subscriber,
  WritableSignal,
} from './types';

// Signal - reactive value holder
export { isSignal, signal } from './signal';

// Computed - lazy derived values
export { computed, isComputed } from './computed';

// Effect - side effect runner
export { effect } from './effect';

// Batch - update batching
export { batch, isBatching } from './batch';

// Context - for advanced usage
export { isTracking, untracked } from './context';
