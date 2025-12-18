// ============================================================================
// Signal Types
// ============================================================================

/**
 * Subscriber interface for dependency tracking
 */
export interface Subscriber {
  /** Called when a dependency changes */
  invalidate(): void;
  /** Dependencies this subscriber is tracking */
  dependencies: Set<ReadableSignal<unknown>>;
}

/**
 * Read-only signal interface
 */
export interface ReadableSignal<T> {
  /** Get current value (tracks dependency if in reactive context) */
  get(): T;
  /** Subscribe to value changes */
  subscribe(fn: (value: T) => void): () => void;
  /** Peek value without tracking */
  peek(): T;
}

/**
 * Writable signal interface
 */
export interface WritableSignal<T> extends ReadableSignal<T> {
  /** Set new value */
  set(value: T): void;
  /** Update value using function */
  update(fn: (current: T) => T): void;
}

/**
 * Computed signal interface (read-only + lazy)
 */
export interface ComputedSignal<T> extends ReadableSignal<T> {
  /** Check if value needs recomputation */
  readonly dirty: boolean;
}

/**
 * Effect dispose function
 */
export type EffectDispose = () => void;
