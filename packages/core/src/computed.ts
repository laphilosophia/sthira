import type { ComputedDefinitions, ComputedFn } from './types'

/**
 * Memoized computed value
 */
interface MemoizedComputed<T> {
  /** Get the computed value */
  get(): T
  /** Invalidate the cached value */
  invalidate(): void
  /** Check if cache is valid */
  isValid(): boolean
}

/**
 * Create a memoized computed value
 */
function createMemoizedComputed<TState, TResult>(
  fn: ComputedFn<TState, TResult>,
  getState: () => TState,
  getComputed: () => Record<string, unknown>
): MemoizedComputed<TResult> {
  let cachedValue: TResult | undefined
  let cachedState: TState | undefined
  let isValid = false

  return {
    get(): TResult {
      const currentState = getState()

      // Return cached if still valid (same state reference)
      if (isValid && cachedState === currentState) {
        return cachedValue as TResult
      }

      // Recompute
      cachedValue = fn(currentState, getComputed())
      cachedState = currentState
      isValid = true

      return cachedValue
    },

    invalidate(): void {
      isValid = false
      cachedValue = undefined
      cachedState = undefined
    },

    isValid(): boolean {
      return isValid
    },
  }
}

/**
 * Computed values manager
 */
export class ComputedManager<TState extends object> {
  private computedMap = new Map<string, MemoizedComputed<unknown>>()
  private definitions: ComputedDefinitions<TState>
  private getState: () => TState

  constructor(definitions: ComputedDefinitions<TState> | undefined, getState: () => TState) {
    this.definitions = definitions ?? {}
    this.getState = getState

    // Initialize computed values
    this.initialize()
  }

  /**
   * Initialize all computed values
   */
  private initialize(): void {
    const computedProxy = this.createComputedProxy()

    for (const [key, fn] of Object.entries(this.definitions)) {
      this.computedMap.set(
        key,
        createMemoizedComputed(
          fn as ComputedFn<TState, unknown>,
          this.getState,
          () => computedProxy
        )
      )
    }
  }

  /**
   * Create a proxy that lazily evaluates computed values
   */
  private createComputedProxy(): Record<string, unknown> {
    return new Proxy({} as Record<string, unknown>, {
      get: (_, prop: string) => {
        return this.get(prop)
      },
    })
  }

  /**
   * Get a computed value
   */
  get(key: string): unknown {
    const computed = this.computedMap.get(key)
    if (!computed) {
      return undefined
    }
    return computed.get()
  }

  /**
   * Get all computed values
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const key of this.computedMap.keys()) {
      result[key] = this.get(key)
    }

    return result
  }

  /**
   * Invalidate all computed values
   */
  invalidateAll(): void {
    for (const computed of this.computedMap.values()) {
      computed.invalidate()
    }
  }

  /**
   * Invalidate specific computed value
   */
  invalidate(key: string): void {
    const computed = this.computedMap.get(key)
    if (computed) {
      computed.invalidate()
    }
  }

  /**
   * Check if computed value exists
   */
  has(key: string): boolean {
    return this.computedMap.has(key)
  }

  /**
   * Get computed keys
   */
  keys(): string[] {
    return Array.from(this.computedMap.keys())
  }
}
