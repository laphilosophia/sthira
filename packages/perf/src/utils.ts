/**
 * Debounce configuration
 */
export interface DebounceOptions {
  /** Debounce delay in ms */
  delay: number
  /** Optional max wait time */
  maxWait?: number
}

/**
 * Debounced function with controls
 */
export interface Debounced<T extends (...args: unknown[]) => void> {
  /** Call the debounced function */
  (...args: Parameters<T>): void
  /** Flush immediately */
  flush(): void
  /** Cancel pending execution */
  cancel(): void
  /** Check if pending */
  pending(): boolean
}

/**
 * Create a debounced version of a function
 * Shared utility for persist, cross-tab, etc.
 */
export function createDebounced<T extends (...args: unknown[]) => void>(
  fn: T,
  options: DebounceOptions | number
): Debounced<T> {
  const { delay, maxWait } =
    typeof options === 'number' ? { delay: options, maxWait: undefined } : options

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastCallTime = 0

  function execute(): void {
    if (lastArgs === null) return

    fn(...lastArgs)
    lastArgs = null
    lastCallTime = 0

    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
  }

  function debounced(...args: Parameters<T>): void {
    lastArgs = args
    const now = Date.now()

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Start max wait timer if configured and not already running
    if (maxWait && !maxWaitTimer && !lastCallTime) {
      lastCallTime = now
      maxWaitTimer = setTimeout(execute, maxWait)
    }

    // Set debounce timer
    debounceTimer = setTimeout(execute, delay)
  }

  debounced.flush = (): void => {
    execute()
  }

  debounced.cancel = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
    lastArgs = null
    lastCallTime = 0
  }

  debounced.pending = (): boolean => {
    return debounceTimer !== null
  }

  return debounced as Debounced<T>
}

/**
 * Pausable controller
 */
export interface PausableController {
  pause(): void
  resume(): void
  isPaused(): boolean
}

/**
 * Create a pausable controller
 * Shared utility for persist, devtools, cross-tab
 */
export function createPausable(): PausableController {
  let paused = false

  return {
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
    },
    isPaused: () => paused,
  }
}
