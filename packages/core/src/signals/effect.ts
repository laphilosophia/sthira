import { endTracking, startTracking } from './context';
import type { EffectDispose, ReadableSignal, Subscriber } from './types';

// ============================================================================
// Effect Implementation
// ============================================================================

/**
 * Internal Effect class - side effect runner with auto-tracking
 */
class EffectImpl implements Subscriber {
  private fn: () => void | (() => void);
  private cleanup: (() => void) | void = undefined;
  private disposed = false;

  // Subscriber interface
  dependencies = new Set<ReadableSignal<unknown>>();

  constructor(fn: () => void | (() => void)) {
    this.fn = fn;
    // Run immediately to collect initial dependencies
    this.run();
  }

  /**
   * Run the effect function
   */
  private run(): void {
    if (this.disposed) {
      return;
    }

    // Clean up previous run
    this.runCleanup();

    // Clear old dependencies before re-tracking
    this.clearDependencies();

    // Track dependencies during execution
    startTracking(this);
    try {
      this.cleanup = this.fn();
    } finally {
      endTracking();
    }
  }

  /**
   * Clear dependencies from previous run
   */
  private clearDependencies(): void {
    for (const dep of this.dependencies) {
      // Remove ourselves from the signal's subscribers
      (dep as unknown as { _removeSubscriber?(s: Subscriber): void })._removeSubscriber?.(this);
    }
    this.dependencies.clear();
  }

  /**
   * Run cleanup function if any
   */
  private runCleanup(): void {
    if (typeof this.cleanup === 'function') {
      try {
        this.cleanup();
      } catch (error) {
        console.error('[Sthira Effect] Error in cleanup:', error);
      }
      this.cleanup = undefined;
    }
  }

  /**
   * Subscriber interface - called when a dependency changes.
   * Schedules re-run in next microtask to avoid infinite loops.
   */
  invalidate(): void {
    if (this.disposed) {
      return;
    }
    // Schedule re-run in microtask to batch multiple invalidations
    queueMicrotask(() => this.run());
  }

  /**
   * Dispose the effect - stop watching and cleanup
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.runCleanup();
    this.clearDependencies();
  }
}

/**
 * Create an effect that runs immediately and re-runs when dependencies change.
 * Returns a dispose function to stop the effect.
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * const dispose = effect(() => {
 *   console.log('Count:', count.get());
 *
 *   // Optional: return cleanup function
 *   return () => console.log('Cleaning up');
 * });
 *
 * count.set(1); // Logs: "Cleaning up", then "Count: 1"
 * dispose();    // Stops effect and runs cleanup
 * ```
 */
export function effect(fn: () => void | (() => void)): EffectDispose {
  const effectInstance = new EffectImpl(fn);
  return () => effectInstance.dispose();
}
