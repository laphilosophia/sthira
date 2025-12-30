import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Stream } from './Stream'

/**
 * Stream Tests
 *
 * Spec: execution-semantics.md §8 - Streaming Semantics
 * Spec: cache-ref-binding.md §10 - Streaming Interaction
 */
describe('Stream', () => {
  let stream: Stream<number>

  beforeEach(() => {
    stream = new Stream<number>('test-ref')
  })

  describe('initialization', () => {
    it('should generate unique stream id', () => {
      const stream2 = new Stream<number>('test-ref')

      expect(stream.id).toBeDefined()
      expect(stream.id).not.toBe(stream2.id)
    })

    it('should bind to task ref', () => {
      expect(stream.taskRef).toBe('test-ref')
    })

    it('should start in open status', () => {
      expect(stream.status).toBe('open')
    })

    it('should be open initially', () => {
      expect(stream.isOpen).toBe(true)
    })

    it('should have no subscribers initially', () => {
      expect(stream.subscriberCount).toBe(0)
    })

    it('should have empty buffer initially', () => {
      expect(stream.buffer).toEqual([])
    })
  })

  describe('emit', () => {
    it('should emit value to subscribers', () => {
      const subscriber = vi.fn()
      stream.subscribe(subscriber)

      stream.emit(42)

      expect(subscriber).toHaveBeenCalledWith(42)
    })

    it('should emit to multiple subscribers', () => {
      const sub1 = vi.fn()
      const sub2 = vi.fn()
      stream.subscribe(sub1)
      stream.subscribe(sub2)

      stream.emit(42)

      expect(sub1).toHaveBeenCalledWith(42)
      expect(sub2).toHaveBeenCalledWith(42)
    })

    it('should buffer emitted values', () => {
      stream.emit(1)
      stream.emit(2)
      stream.emit(3)

      expect(stream.buffer).toEqual([1, 2, 3])
    })

    // Spec: execution-semantics.md §8 - Streaming aborted on disposal
    it('should ignore emissions when closed', () => {
      const subscriber = vi.fn()
      stream.subscribe(subscriber)
      subscriber.mockClear()

      stream.close()
      stream.emit(42)

      expect(subscriber).not.toHaveBeenCalled()
    })

    it('should ignore emissions when aborted', () => {
      const subscriber = vi.fn()
      stream.subscribe(subscriber)
      subscriber.mockClear()

      stream.abort()
      stream.emit(42)

      expect(subscriber).not.toHaveBeenCalled()
    })

    it('should not crash on subscriber error', () => {
      const badSubscriber = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber error')
      })
      const goodSubscriber = vi.fn()

      stream.subscribe(badSubscriber)
      stream.subscribe(goodSubscriber)

      // Should not throw
      stream.emit(42)

      expect(goodSubscriber).toHaveBeenCalledWith(42)
    })
  })

  describe('subscribe', () => {
    it('should add subscriber', () => {
      stream.subscribe(vi.fn())

      expect(stream.subscriberCount).toBe(1)
    })

    it('should return unsubscribe function', () => {
      const unsubscribe = stream.subscribe(vi.fn())

      expect(typeof unsubscribe).toBe('function')
    })

    it('should remove subscriber on unsubscribe', () => {
      const unsubscribe = stream.subscribe(vi.fn())
      unsubscribe()

      expect(stream.subscriberCount).toBe(0)
    })

    it('should replay buffer to new subscriber', () => {
      stream.emit(1)
      stream.emit(2)

      const subscriber = vi.fn()
      stream.subscribe(subscriber)

      expect(subscriber).toHaveBeenCalledTimes(2)
      expect(subscriber).toHaveBeenNthCalledWith(1, 1)
      expect(subscriber).toHaveBeenNthCalledWith(2, 2)
    })

    it('should return no-op when closed', () => {
      stream.close()
      const unsubscribe = stream.subscribe(vi.fn())

      expect(typeof unsubscribe).toBe('function')
      expect(stream.subscriberCount).toBe(0)
    })
  })

  describe('close', () => {
    it('should transition to closed status', () => {
      stream.close()

      expect(stream.status).toBe('closed')
    })

    it('should clear subscribers', () => {
      stream.subscribe(vi.fn())
      stream.close()

      expect(stream.subscriberCount).toBe(0)
    })

    it('should not be open after close', () => {
      stream.close()

      expect(stream.isOpen).toBe(false)
    })

    it('should be idempotent', () => {
      stream.close()
      stream.close()
      stream.close()

      expect(stream.status).toBe('closed')
    })
  })

  describe('abort', () => {
    // Spec: worker-lifecycle.md §10 - Worker failure aborts streams
    it('should transition to aborted status', () => {
      stream.abort()

      expect(stream.status).toBe('aborted')
    })

    it('should clear subscribers', () => {
      stream.subscribe(vi.fn())
      stream.abort()

      expect(stream.subscriberCount).toBe(0)
    })

    it('should not be open after abort', () => {
      stream.abort()

      expect(stream.isOpen).toBe(false)
    })

    it('should be idempotent', () => {
      stream.abort()
      stream.abort()
      stream.abort()

      expect(stream.status).toBe('aborted')
    })

    it('should not affect closed stream', () => {
      stream.close()
      stream.abort()

      expect(stream.status).toBe('closed')
    })
  })

  describe('type safety', () => {
    it('should work with generic types', () => {
      const stringStream = new Stream<string>('ref')
      const subscriber = vi.fn()

      stringStream.subscribe(subscriber)
      stringStream.emit('hello')

      expect(subscriber).toHaveBeenCalledWith('hello')
    })

    it('should work with object types', () => {
      interface Data {
        id: number
        name: string
      }

      const objectStream = new Stream<Data>('ref')
      const subscriber = vi.fn()

      objectStream.subscribe(subscriber)
      objectStream.emit({ id: 1, name: 'test' })

      expect(subscriber).toHaveBeenCalledWith({ id: 1, name: 'test' })
    })
  })
})
