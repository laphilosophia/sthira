import { addPendingSignal, scheduleBatchFlush } from './batch';
import { getCurrentSubscriber } from './context';
import type { Subscriber, WritableSignal } from './types';

// ============================================================================
// Signal Implementation
// ============================================================================

/**
 * Internal Signal class
 */
class SignalImpl<T> implements WritableSignal<T> {
  private value: T;
  private subscribers = new Set<Subscriber>();
  private valueSubscribers = new Set<(value: T) => void>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Get current value.
   * If called within a reactive context, automatically registers dependency.
   */
  get(): T {
    const subscriber = getCurrentSubscriber();
    if (subscriber) {
      // Register bidirectional dependency
      this.subscribers.add(subscriber);
      subscriber.dependencies.add(this);
    }
    return this.value;
  }

  /**
   * Get value without tracking (for debugging/logging)
   */
  peek(): T {
    return this.value;
  }

  /**
   * Set new value and notify subscribers
   */
  set(newValue: T): void {
    // Skip if value hasn't changed
    if (Object.is(this.value, newValue)) {
      return;
    }

    this.value = newValue;

    // Synchronously invalidate dependent computed/effects
    // This ensures computed.get() immediately after set() sees dirty=true
    for (const subscriber of this.subscribers) {
      subscriber.invalidate();
    }

    // Schedule async notification for value subscribers via batch system
    addPendingSignal(this);
    scheduleBatchFlush();
  }

  /**
   * Update value using a function
   */
  update(fn: (current: T) => T): void {
    this.set(fn(this.value));
  }

  /**
   * Subscribe to value changes (for external use)
   */
  subscribe(fn: (value: T) => void): () => void {
    this.valueSubscribers.add(fn);
    return () => {
      this.valueSubscribers.delete(fn);
    };
  }

  /**
   * Notify value subscribers that value has changed.
   * Called by the batch system.
   * Reactive subscribers (computed/effects) are already invalidated synchronously in set().
   * @internal
   */
  _notify(): void {
    // Notify value subscribers (async callbacks)
    for (const fn of this.valueSubscribers) {
      try {
        fn(this.value);
      } catch (error) {
        console.error('[Sthira Signal] Error in subscriber:', error);
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

// Notifiable signal interface for batch system
export interface NotifiableSignal {
  _notify(): void;
}

/**
 * Create a new signal
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
  return new SignalImpl(initialValue);
}

/**
 * Type guard for signal
 */
export function isSignal(value: unknown): value is WritableSignal<unknown> {
  return value instanceof SignalImpl;
}
