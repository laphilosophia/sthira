/**
 * StreamBuffer - Buffers streamed chunks into final result.
 *
 * Used internally by Engine to collect chunked output
 * and return as single result to caller.
 *
 * @see {@link docs/engine-semantics.md#internal-streaming}
 */

export interface StreamBufferConfig {
  /** Maximum buffer size before applying backpressure */
  readonly highWaterMark?: number
}

/**
 * StreamBuffer collects chunks and produces final result.
 */
export class StreamBuffer<T> {
  private readonly _chunks: T[] = []
  private readonly _highWaterMark: number
  private _closed = false

  constructor(config: StreamBufferConfig = {}) {
    this._highWaterMark = config.highWaterMark ?? 10000
  }

  /**
   * Number of buffered chunks.
   */
  get size(): number {
    return this._chunks.length
  }

  /**
   * Check if buffer is closed.
   */
  get isClosed(): boolean {
    return this._closed
  }

  /**
   * Check if buffer is at high water mark.
   */
  get isAtCapacity(): boolean {
    return this._chunks.length >= this._highWaterMark
  }

  /**
   * Push a chunk to the buffer.
   *
   * @param chunk - Chunk to add
   * @returns true if accepted, false if at capacity
   */
  push(chunk: T): boolean {
    if (this._closed) {
      return false
    }

    if (this._chunks.length >= this._highWaterMark) {
      return false
    }

    this._chunks.push(chunk)
    return true
  }

  /**
   * Close the buffer.
   * No more chunks can be added after close.
   */
  close(): void {
    this._closed = true
  }

  /**
   * Get all buffered chunks.
   */
  getChunks(): readonly T[] {
    return [...this._chunks]
  }

  /**
   * Drain buffer and return all chunks.
   * Clears the buffer.
   */
  drain(): T[] {
    const chunks = [...this._chunks]
    this._chunks.length = 0
    return chunks
  }

  /**
   * Clear buffer without returning chunks.
   */
  clear(): void {
    this._chunks.length = 0
  }

  /**
   * Reduce buffer to single value.
   *
   * @param reducer - Reducer function
   * @param initial - Initial value
   */
  reduce<R>(reducer: (acc: R, chunk: T) => R, initial: R): R {
    return this._chunks.reduce(reducer, initial)
  }
}
