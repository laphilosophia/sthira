import type { Subscriber } from './types';

// ============================================================================
// Dependency Tracking Context
// ============================================================================

/**
 * Global tracking context for automatic dependency detection.
 * Uses a stack to handle nested computations correctly.
 */

let currentSubscriber: Subscriber | null = null;
const subscriberStack: (Subscriber | null)[] = [];

/**
 * Start tracking dependencies for a subscriber
 */
export function startTracking(subscriber: Subscriber): void {
  subscriberStack.push(currentSubscriber);
  currentSubscriber = subscriber;
  // Clear old dependencies - they will be re-collected
  subscriber.dependencies.clear();
}

/**
 * Stop tracking and restore previous context
 */
export function endTracking(): void {
  currentSubscriber = subscriberStack.pop() ?? null;
}

/**
 * Get the currently active subscriber (if any)
 */
export function getCurrentSubscriber(): Subscriber | null {
  return currentSubscriber;
}

/**
 * Check if we're currently tracking dependencies
 */
export function isTracking(): boolean {
  return currentSubscriber !== null;
}

/**
 * Run a function without tracking dependencies
 */
export function untracked<T>(fn: () => T): T {
  const prev = currentSubscriber;
  currentSubscriber = null;
  try {
    return fn();
  } finally {
    currentSubscriber = prev;
  }
}
