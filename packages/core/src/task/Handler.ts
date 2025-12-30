import type { HandlerID, Ref } from '../types'

/**
 * Generates a unique handler ID.
 */
const generateHandlerId = (): HandlerID => {
  return `handler_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Handler execution status.
 */
export type HandlerStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Handler - Method participating in task execution.
 *
 * Handlers:
 * - May run in parallel (DAG, not pipeline)
 * - May fail independently (causes task error)
 * - Execution order is not fixed
 *
 * @see {@link docs/execution-semantics.md#handler}
 * @see {@link docs/implementation.md#handler}
 */
export class Handler {
  readonly id: HandlerID
  readonly taskRef: Ref

  private _status: HandlerStatus = 'pending'
  private _fn: (() => Promise<void>) | null = null
  private _error: Error | null = null
  private _cancelled = false

  constructor(taskRef: Ref) {
    this.id = generateHandlerId()
    this.taskRef = taskRef
  }

  /**
   * Current handler status.
   */
  get status(): HandlerStatus {
    return this._status
  }

  /**
   * Error if handler failed.
   */
  get error(): Error | null {
    return this._error
  }

  /**
   * Check if handler is still pending.
   */
  get isPending(): boolean {
    return this._status === 'pending'
  }

  /**
   * Check if handler completed successfully.
   */
  get isCompleted(): boolean {
    return this._status === 'completed'
  }

  /**
   * Set the handler function.
   *
   * @param fn - Async function to execute
   */
  setFunction(fn: () => Promise<void>): void {
    if (this._fn !== null) {
      throw new Error('Handler function already set')
    }
    this._fn = fn
  }

  /**
   * Execute the handler.
   *
   * @returns Promise that resolves when handler completes
   * @throws Error if handler fails or is cancelled
   *
   * @see {@link docs/execution-semantics.md#handler}
   */
  async execute(): Promise<void> {
    if (this._status !== 'pending') {
      throw new Error(`Cannot execute handler: status is ${this._status}`)
    }

    if (this._fn === null) {
      throw new Error('Handler function not set')
    }

    if (this._cancelled) {
      this._status = 'cancelled'
      throw new Error('Handler was cancelled before execution')
    }

    this._status = 'running'

    try {
      await this._fn()

      // Check if cancelled during execution
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime guard for async cancellation
      if (this._cancelled) {
        this._status = 'cancelled'
        return
      }

      this._status = 'completed'
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime guard for async cancellation
      if (this._cancelled) {
        this._status = 'cancelled'
        return
      }

      this._status = 'failed'
      this._error = err instanceof Error ? err : new Error(String(err))
      throw this._error
    }
  }

  /**
   * Cancel the handler.
   *
   * If pending, prevents execution.
   * If running, marks as cancelled after current execution.
   *
   * @see {@link docs/algorithm.md#disposal-algorithm}
   */
  cancel(): void {
    if (this._status === 'completed' || this._status === 'failed') {
      return
    }

    this._cancelled = true

    if (this._status === 'pending') {
      this._status = 'cancelled'
    }
  }
}
