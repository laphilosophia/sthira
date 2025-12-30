import { beforeEach, describe, expect, it } from 'vitest'
import { StreamBuffer } from './StreamBuffer'

/**
 * StreamBuffer Tests
 *
 * Spec: engine-semantics.md §7 - Internal Streaming
 */
describe('StreamBuffer', () => {
  let buffer: StreamBuffer<number>

  beforeEach(() => {
    buffer = new StreamBuffer<number>()
  })

  describe('initialization', () => {
    it('should start empty', () => {
      expect(buffer.size).toBe(0)
    })

    it('should not be closed initially', () => {
      expect(buffer.isClosed).toBe(false)
    })

    it('should not be at capacity initially', () => {
      expect(buffer.isAtCapacity).toBe(false)
    })
  })

  describe('push', () => {
    it('should add chunk to buffer', () => {
      buffer.push(1)

      expect(buffer.size).toBe(1)
    })

    it('should return true when accepted', () => {
      const result = buffer.push(1)

      expect(result).toBe(true)
    })

    it('should reject when closed', () => {
      buffer.close()
      const result = buffer.push(1)

      expect(result).toBe(false)
      expect(buffer.size).toBe(0)
    })

    it('should reject when at capacity', () => {
      const smallBuffer = new StreamBuffer<number>({ highWaterMark: 2 })
      smallBuffer.push(1)
      smallBuffer.push(2)

      const result = smallBuffer.push(3)

      expect(result).toBe(false)
      expect(smallBuffer.size).toBe(2)
    })
  })

  describe('getChunks', () => {
    it('should return all chunks', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)

      expect(buffer.getChunks()).toEqual([1, 2, 3])
    })

    it('should return copy (not reference)', () => {
      buffer.push(1)
      const chunks = buffer.getChunks()
      buffer.push(2)

      expect(chunks).toEqual([1])
    })
  })

  describe('drain', () => {
    it('should return all chunks', () => {
      buffer.push(1)
      buffer.push(2)

      const chunks = buffer.drain()

      expect(chunks).toEqual([1, 2])
    })

    it('should clear buffer', () => {
      buffer.push(1)
      buffer.drain()

      expect(buffer.size).toBe(0)
    })
  })

  describe('clear', () => {
    it('should empty buffer', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.clear()

      expect(buffer.size).toBe(0)
    })
  })

  describe('reduce', () => {
    it('should reduce chunks to single value', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)

      const sum = buffer.reduce((acc, n) => acc + n, 0)

      expect(sum).toBe(6)
    })
  })

  describe('close', () => {
    it('should mark buffer as closed', () => {
      buffer.close()

      expect(buffer.isClosed).toBe(true)
    })

    it('should prevent further pushes', () => {
      buffer.close()
      buffer.push(1)

      expect(buffer.size).toBe(0)
    })
  })

  describe('highWaterMark', () => {
    it('should report at capacity when limit reached', () => {
      const smallBuffer = new StreamBuffer<number>({ highWaterMark: 2 })
      smallBuffer.push(1)
      smallBuffer.push(2)

      expect(smallBuffer.isAtCapacity).toBe(true)
    })

    it('should default to 10000', () => {
      for (let i = 0; i < 9999; i++) {
        buffer.push(i)
      }
      expect(buffer.isAtCapacity).toBe(false)

      buffer.push(9999)
      expect(buffer.isAtCapacity).toBe(true)
    })
  })
})
