import type { NotifiableSignal } from './signal';

// ============================================================================
// Batched Updates
// ============================================================================

/**
 * Microtask-based update batching.
 * Multiple signal changes in the same synchronous block
 * result in a single notification pass.
 */

let pendingSignals = new Set<NotifiableSignal>();
let batchDepth = 0;
let flushScheduled = false;

/**
 * Add a signal to the pending notification queue
 * @internal
 */
export function addPendingSignal(signal: NotifiableSignal): void {
  pendingSignals.add(signal);
}

/**
 * Schedule a batch flush if not already scheduled
 * @internal
 */
export function scheduleBatchFlush(): void {
  if (flushScheduled || batchDepth > 0) {
    return;
  }

  flushScheduled = true;
  queueMicrotask(flushBatch);
}

/**
 * Flush all pending notifications
 */
function flushBatch(): void {
  flushScheduled = false;

  if (pendingSignals.size === 0) {
    return;
  }

  // Take current pending set and clear it
  const signals = pendingSignals;
  pendingSignals = new Set();

  // Notify all pending signals
  for (const signal of signals) {
    signal._notify();
  }
}

/**
 * Execute a function with batched updates.
 * All signal changes within the function will be
 * deferred until the function completes.
 *
 * @example
 * ```ts
 * batch(() => {
 *   count.set(1);
 *   count.set(2);
 *   count.set(3);
 * }); // Subscribers notified only once with final value
 * ```
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pendingSignals.size > 0) {
      flushBatch();
    }
  }
}

/**
 * Check if we're currently in a batch
 */
export function isBatching(): boolean {
  return batchDepth > 0;
}
