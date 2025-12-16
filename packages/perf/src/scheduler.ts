import type { ChunkOptions, ScheduledTask, SchedulerOptions, TaskPriority } from './types'

/**
 * Frame-aware task scheduler
 * Respects browser's rendering budget for smooth 60fps
 */
export class TaskScheduler {
  private queue: ScheduledTask[] = []
  private isProcessing = false
  private frameBudget: number
  private useIdleCallback: boolean
  private frameDeadline = 0

  constructor(options: SchedulerOptions = {}) {
    this.frameBudget = options.frameBudget ?? 5
    this.useIdleCallback = options.useIdleCallback ?? true
  }

  /**
   * Schedule a task with priority
   */
  schedule<T>(task: () => T | Promise<T>, priority: TaskPriority = 'normal'): Promise<T> {
    return new Promise((resolve, reject) => {
      const scheduledTask: ScheduledTask<T> = {
        id: crypto.randomUUID(),
        task,
        priority,
        createdAt: Date.now(),
      }

      this.queue.push(scheduledTask as ScheduledTask)

      // Sort by priority
      this.sortQueue()

      // Start processing
      this.requestProcessing()

      // Return promise that resolves when task completes
      const originalTask = scheduledTask.task
      scheduledTask.task = async () => {
        try {
          const result = await originalTask()
          resolve(result)
          return result
        } catch (error) {
          reject(error)
          throw error
        }
      }
    })
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
      idle: 4,
    }

    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  /**
   * Request processing time
   */
  private requestProcessing(): void {
    if (this.isProcessing) return

    if (typeof requestIdleCallback !== 'undefined' && this.useIdleCallback) {
      requestIdleCallback((deadline) => {
        this.frameDeadline = performance.now() + deadline.timeRemaining()
        this.processQueue()
      })
    } else if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame((timestamp) => {
        this.frameDeadline = timestamp + this.frameBudget
        this.processQueue()
      })
    } else {
      // Node.js fallback
      setTimeout(() => this.processQueue(), 0)
    }
  }

  /**
   * Process queue within frame budget
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true

    while (this.queue.length > 0) {
      // Check frame budget
      if (this.shouldYield()) {
        this.isProcessing = false
        this.requestProcessing()
        return
      }

      const task = this.queue.shift()
      if (!task) break

      try {
        await task.task()
      } catch (error) {
        console.error('[Sthira Perf] Task error:', error)
      }
    }

    this.isProcessing = false
  }

  /**
   * Check if we should yield to browser
   */
  private shouldYield(): boolean {
    if (typeof performance === 'undefined') return false
    return performance.now() >= this.frameDeadline
  }

  /**
   * Get queue length
   */
  get pending(): number {
    return this.queue.length
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.queue = []
  }
}

/**
 * Process array in chunks with main thread yielding
 */
export async function chunked<T, R>(
  items: T[],
  processor: (item: T, index: number) => R | Promise<R>,
  options: ChunkOptions = {}
): Promise<R[]> {
  const { chunkSize = 100, yieldBetweenChunks = true, signal } = options

  const results: R[] = []

  for (let i = 0; i < items.length; i += chunkSize) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new DOMException('Chunked processing aborted', 'AbortError')
    }

    const chunk = items.slice(i, i + chunkSize)

    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j]!
      results.push(await processor(item, i + j))
    }

    // Yield between chunks
    if (yieldBetweenChunks && i + chunkSize < items.length) {
      await yieldToMain()
    }
  }

  return results
}

/**
 * Yield to main thread
 */
export async function yieldToMain(): Promise<void> {
  // Check for scheduler.yield (Chrome 115+)
  const g = globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }
  if (g.scheduler?.yield) {
    return g.scheduler.yield()
  }

  // Fallback: setTimeout
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Create a default scheduler instance
 */
let defaultScheduler: TaskScheduler | null = null

export function getScheduler(options?: SchedulerOptions): TaskScheduler {
  if (!defaultScheduler) {
    defaultScheduler = new TaskScheduler(options)
  }
  return defaultScheduler
}
