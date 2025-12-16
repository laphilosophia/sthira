import type { BatchOptions } from './types';

/**
 * Create a batcher that collects updates and flushes them together
 * Useful for reducing React re-renders
 */
export function createBatcher<T>(
  flush: (items: T[]) => void,
  options: BatchOptions = {},
): {
  add: (item: T) => void;
  flush: () => void;
  readonly pending: number;
} {
  const { maxSize = 100, maxWait = 50, debounceMs = 10 } = options;

  let queue: T[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;

  function doFlush(): void {
    if (queue.length === 0) return;

    // Clear timers
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }

    const items = queue;
    queue = [];
    flush(items);
  }

  function scheduleFlush(): void {
    // Set debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(doFlush, debounceMs);
  }

  return {
    add(item: T): void {
      queue.push(item);

      // Immediate flush if max size reached
      if (queue.length >= maxSize) {
        doFlush();
        return;
      }

      // Start max wait timer on first item
      if (queue.length === 1 && maxWait > 0) {
        maxWaitTimer = setTimeout(doFlush, maxWait);
      }

      scheduleFlush();
    },

    flush: doFlush,

    get pending(): number {
      return queue.length;
    },
  };
}

/**
 * Batch React state updates using unstable_batchedUpdates pattern
 */
export function createReactBatcher<T>(
  setState: (updater: (prev: T) => T) => void,
  merger: (batch: Partial<T>[]) => Partial<T>,
  options: BatchOptions = {},
): {
  update: (partial: Partial<T>) => void;
  flush: () => void;
} {
  const batcher = createBatcher<Partial<T>>((items) => {
    const merged = merger(items);
    setState((prev) => ({ ...prev, ...merged }));
  }, options);

  return {
    update: batcher.add,
    flush: batcher.flush,
  };
}

/**
 * Default merger that spreads all partials
 */
export function defaultMerger<T>(batch: Partial<T>[]): Partial<T> {
  return batch.reduce((acc, item) => ({ ...acc, ...item }), {} as Partial<T>);
}

/**
 * Deep merge for nested objects
 */
export function deepMerger<T extends Record<string, unknown>>(batch: Partial<T>[]): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const item of batch) {
    for (const [key, value] of Object.entries(item)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = { ...(result[key] as object), ...value };
      } else {
        result[key] = value;
      }
    }
  }

  return result as Partial<T>;
}
