import { addPendingSignal, scheduleBatchFlush } from './batch';
import { endTracking, getCurrentSubscriber, startTracking } from './context';
import type { NotifiableSignal } from './signal';
import type { ComputedSignal, ReadableSignal, Subscriber } from './types';

// ============================================================================
// Computed Implementation
// ============================================================================

/**
 * Internal Computed class - lazy evaluated derived value
 */
class ComputedImpl<T> implements ComputedSignal<T>, Subscriber, NotifiableSignal {
  private _dirty = true;
  private cachedValue: T | undefined;
  private fn: () => T;

  // Subscriber interface
  dependencies = new Set<ReadableSignal<unknown>>();

  // Signals that depend on this computed
  private subscribers = new Set<Subscriber>();
  private valueSubscribers = new Set<(value: T) => void>();

  constructor(fn: () => T) {
    this.fn = fn;
  }

  /**
   * Check if value needs recomputation
   */
  get dirty(): boolean {
    return this._dirty;
  }

  /**
   * Get computed value.
   * Recomputes if dirty, otherwise returns cached.
   * Tracks dependency if in reactive context.
   */
  get(): T {
    // Track this computed as dependency
    const subscriber = getCurrentSubscriber();
    if (subscriber) {
      this.subscribers.add(subscriber);
      subscriber.dependencies.add(this);
    }

    // Recompute if dirty
    if (this._dirty) {
      // Track dependencies during computation
      startTracking(this);
      try {
        this.cachedValue = this.fn();
        this._dirty = false;
      } finally {
        endTracking();
      }
    }

    return this.cachedValue as T;
  }

  /**
   * Peek value without tracking
   */
  peek(): T {
    return this._dirty ? this.fn() : (this.cachedValue as T);
  }

  /**
   * Subscribe to value changes
   */
  subscribe(fn: (value: T) => void): () => void {
    this.valueSubscribers.add(fn);
    return () => {
      this.valueSubscribers.delete(fn);
    };
  }

  /**
   * Subscriber interface - called when a dependency changes
   */
  invalidate(): void {
    // Always propagate to downstream first, even if already dirty
    // This ensures the entire dependency graph gets invalidated
    const wasDirty = this._dirty;
    this._dirty = true;

    // Propagate to downstream computed/effects immediately
    // This is needed because downstream may not have subscribed yet
    for (const subscriber of this.subscribers) {
      subscriber.invalidate();
    }

    // Only schedule notification if we weren't already dirty
    if (!wasDirty) {
      addPendingSignal(this);
      scheduleBatchFlush();
    }
  }

  /**
   * Notify subscribers (called by batch system)
   * @internal
   */
  _notify(): void {
    // Propagate to downstream computed/effects
    for (const subscriber of this.subscribers) {
      subscriber.invalidate();
    }

    // Notify value subscribers
    for (const fn of this.valueSubscribers) {
      try {
        fn(this.get());
      } catch (error) {
        console.error('[Sthira Computed] Error in subscriber:', error);
      }
    }
  }

  /**
   * Remove a subscriber
   * @internal
   */
  _removeSubscriber(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
  }
}

/**
 * Create a computed signal (lazy derived value)
 *
 * @example
 * ```ts
 * const count = signal(5);
 * const double = computed(() => count.get() * 2);
 *
 * double.get(); // 10 (computed on first access)
 * double.get(); // 10 (cached)
 * count.set(10);
 * double.get(); // 20 (recomputed)
 * ```
 */
export function computed<T>(fn: () => T): ComputedSignal<T> {
  return new ComputedImpl(fn);
}

/**
 * Type guard for computed
 */
export function isComputed(value: unknown): value is ComputedSignal<unknown> {
  return value instanceof ComputedImpl;
}
