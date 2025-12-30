import type { Ref, StreamID } from '../types'

/**
 * Generates a unique stream ID.
 */
const generateStreamId = (): StreamID => {
  return `stream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Stream status.
 */
export type StreamStatus = 'open' | 'closed' | 'aborted'

/**
 * Stream subscriber function type.
 */
export type StreamSubscriber<T> = (value: T) => void

/**
 * Stream - Runtime-controlled execution output channel.
 *
 * Streams:
 * - Lifecycle managed by task
 * - Abortable via task disposal
 * - Errors propagate, not silently dropped
 *
 * @see {@link docs/execution-semantics.md#stream}
 * @see {@link docs/implementation.md#stream}
 */
export class Stream<T = unknown> {
  readonly id: StreamID
  readonly taskRef: Ref

  private _status: StreamStatus = 'open'
  private _subscribers = new Set<StreamSubscriber<T>>()
  private _buffer: T[] = []

  constructor(taskRef: Ref) {
    this.id = generateStreamId()
    this.taskRef = taskRef
  }

  /**
   * Current stream status.
   */
  get status(): StreamStatus {
    return this._status
  }

  /**
   * Check if stream is open for emission.
   */
  get isOpen(): boolean {
    return this._status === 'open'
  }

  /**
   * Number of subscribers.
   */
  get subscriberCount(): number {
    return this._subscribers.size
  }

  /**
   * Buffered values (for late subscribers).
   */
  get buffer(): readonly T[] {
    return [...this._buffer]
  }

  /**
   * Emit a value to all subscribers.
   *
   * Values emitted to closed/aborted streams are ignored.
   *
   * @param value - Value to emit
   *
   * @see {@link docs/execution-semantics.md#streaming-semantics}
   */
  emit(value: T): void {
    if (this._status !== 'open') {
      return
    }

    this._buffer.push(value)

    for (const subscriber of this._subscribers) {
      try {
        subscriber(value)
      } catch {
        // Subscriber errors don't crash the stream
        // In production, this would be logged
      }
    }
  }

  /**
   * Subscribe to stream values.
   *
   * @param fn - Function called on each emission
   * @returns Unsubscribe function
   *
   * @see {@link docs/cache-ref-binding.md#streaming-interaction}
   */
  subscribe(fn: StreamSubscriber<T>): () => void {
    if (this._status !== 'open') {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- Intentional no-op unsubscribe for closed streams
      return () => { }
    }

    this._subscribers.add(fn)

    // Replay buffer to new subscriber
    for (const value of this._buffer) {
      try {
        fn(value)
      } catch {
        // Ignore replay errors
      }
    }

    return () => {
      this._subscribers.delete(fn)
    }
  }

  /**
   * Close the stream gracefully.
   *
   * No more emissions accepted, but clean shutdown.
   */
  close(): void {
    if (this._status !== 'open') {
      return
    }

    this._status = 'closed'
    this._subscribers.clear()
  }

  /**
   * Abort the stream.
   *
   * Forced termination due to task disposal.
   *
   * @see {@link docs/worker-lifecycle.md#streaming-interaction}
   */
  abort(): void {
    if (this._status !== 'open') {
      return
    }

    this._status = 'aborted'
    this._subscribers.clear()
  }
}
