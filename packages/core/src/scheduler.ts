import type { ChunkedOptions, PerformanceConfig, PerformanceUtils } from './types';

/**
 * Frame-aware task scheduler
 * Respects browser's rendering budget to maintain 60fps
 */
export class TaskScheduler {
  private frameBudgetMs: number;
  private taskQueue: Array<{
    task: () => unknown | Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
    priority: 'high' | 'normal' | 'low';
  }> = [];
  private isProcessing = false;
  private frameDeadline = 0;

  constructor(frameBudgetMs = 5) {
    this.frameBudgetMs = frameBudgetMs;
  }

  /**
   * Schedule a task with priority
   */
  schedule<T>(
    task: () => T | Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal',
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task: task as () => unknown | Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      });

      // Sort by priority
      this.taskQueue.sort((a, b) => {
        const order = { high: 0, normal: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });

      this.requestProcessing();
    });
  }

  /**
   * Request processing time
   */
  private requestProcessing(): void {
    if (this.isProcessing) return;

    // Use requestAnimationFrame for frame-aligned processing
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame((timestamp) => {
        this.frameDeadline = timestamp + this.frameBudgetMs;
        this.processQueue();
      });
    } else {
      // Node.js fallback - use setTimeout(0) for next tick
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Process queue while respecting frame budget
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      // Check if we should yield to browser
      if (this.shouldYield()) {
        this.isProcessing = false;
        this.requestProcessing();
        return;
      }

      const item = this.taskQueue.shift();
      if (!item) break;

      try {
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Check if we should yield to browser
   */
  private shouldYield(): boolean {
    if (typeof performance === 'undefined') return false;
    return performance.now() >= this.frameDeadline;
  }

  /**
   * Yield to main thread
   */
  async yieldToMain(): Promise<void> {
    // Check for scheduler.yield API (Chrome 115+)
    const g = globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } };
    if (g.scheduler?.yield) {
      return g.scheduler.yield();
    }

    // Fallback: setTimeout to yield
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Process array in chunks
   */
  async chunked<T, R>(items: T[], fn: (item: T) => R, options: ChunkedOptions = {}): Promise<R[]> {
    const { chunkSize = 100, yieldEvery = true } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      const chunkResults = await this.schedule(() => chunk.map(fn), 'normal');
      results.push(...(chunkResults as R[]));

      if (yieldEvery && i + chunkSize < items.length) {
        await this.yieldToMain();
      }
    }

    return results;
  }
}

/**
 * Create performance utilities based on config
 */
export function createPerformanceUtils(
  config: PerformanceConfig | undefined,
): PerformanceUtils | undefined {
  if (!config) return undefined;

  const options = typeof config === 'string' ? getPresetOptions(config) : config;

  if (!options.scheduler && !options.batching) {
    return undefined;
  }

  const scheduler = new TaskScheduler();

  return {
    schedule: scheduler.schedule.bind(scheduler),
    yieldToMain: scheduler.yieldToMain.bind(scheduler),
    chunked: scheduler.chunked.bind(scheduler),
  };
}

/**
 * Get options from preset name
 */
function getPresetOptions(preset: string): {
  scheduler?: boolean;
  batching?: boolean;
  workers?: boolean;
} {
  switch (preset) {
    case 'minimal':
      return {};
    case 'balanced':
      return { scheduler: true, batching: true };
    case 'heavy':
      return { scheduler: true, batching: true, workers: true };
    default:
      return {};
  }
}
