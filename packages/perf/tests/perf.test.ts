import { describe, expect, it, vi } from 'vitest'
import { createBatcher, deepMerger, defaultMerger } from '../src/batcher'
import { formatBytes, getMemoryInfo, getMemoryPressure, MemoryMonitor } from '../src/memory'
import { chunked, TaskScheduler, yieldToMain } from '../src/scheduler'
import { createDebounced, createPausable } from '../src/utils'

describe('createBatcher', () => {
  it('should batch items and flush', async () => {
    const flush = vi.fn()
    const batcher = createBatcher(flush, { debounceMs: 10 })

    batcher.add('a')
    batcher.add('b')
    batcher.add('c')

    expect(batcher.pending).toBe(3)

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 20))

    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledWith(['a', 'b', 'c'])
    expect(batcher.pending).toBe(0)
  })

  it('should flush immediately when maxSize reached', async () => {
    const flush = vi.fn()
    const batcher = createBatcher(flush, { maxSize: 2, debounceMs: 100 })

    batcher.add('a')
    batcher.add('b')

    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledWith(['a', 'b'])
  })

  it('should flush on max wait', async () => {
    const flush = vi.fn()
    const batcher = createBatcher(flush, { maxWait: 20, debounceMs: 1000 })

    batcher.add('a')

    await new Promise((r) => setTimeout(r, 30))

    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('should manual flush', () => {
    const flush = vi.fn()
    const batcher = createBatcher(flush, { debounceMs: 1000 })

    batcher.add('a')
    batcher.add('b')
    batcher.flush()

    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledWith(['a', 'b'])
  })
})

describe('defaultMerger', () => {
  it('should merge partial objects', () => {
    const result = defaultMerger([{ a: 1 }, { b: 2 }, { c: 3 }])
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('should override duplicates with last value', () => {
    const result = defaultMerger([{ a: 1 }, { a: 2 }])
    expect(result).toEqual({ a: 2 })
  })
})

describe('deepMerger', () => {
  it('should deep merge nested objects', () => {
    const result = deepMerger([{ user: { name: 'John' } }, { user: { age: 30 } }])
    expect(result).toEqual({ user: { name: 'John', age: 30 } })
  })
})

describe('TaskScheduler', () => {
  it('should create scheduler with options', () => {
    const scheduler = new TaskScheduler({ frameBudget: 10 })
    expect(scheduler.pending).toBe(0)
  })

  it('should clear queue', () => {
    const scheduler = new TaskScheduler()
    scheduler.clear()
    expect(scheduler.pending).toBe(0)
  })
})

describe('chunked', () => {
  it('should process array in chunks', async () => {
    const items = [1, 2, 3, 4, 5]
    const results = await chunked(items, (item) => item * 2, {
      chunkSize: 2,
      yieldBetweenChunks: false,
    })

    expect(results).toEqual([2, 4, 6, 8, 10])
  })

  it('should handle abort signal', async () => {
    const items = [1, 2, 3, 4, 5]
    const controller = new AbortController()
    controller.abort()

    await expect(chunked(items, (item) => item, { signal: controller.signal })).rejects.toThrow(
      'Chunked processing aborted'
    )
  })
})

describe('yieldToMain', () => {
  it('should yield without error', async () => {
    await expect(yieldToMain()).resolves.toBeUndefined()
  })
})

describe('Memory utilities', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0.00 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
  })

  it('should return null for getMemoryInfo in Node.js', () => {
    // Node.js doesn't have performance.memory
    const info = getMemoryInfo()
    expect(info).toBeNull()
  })

  it('should return none for getMemoryPressure when no memory API', () => {
    expect(getMemoryPressure()).toBe('none')
  })

  it('should create MemoryMonitor', () => {
    const monitor = new MemoryMonitor()
    expect(monitor.getPressure()).toBe('none')
  })

  it('should subscribe to memory changes', () => {
    const monitor = new MemoryMonitor()
    const callback = vi.fn()

    const unsubscribe = monitor.subscribe(callback)

    expect(typeof unsubscribe).toBe('function')

    unsubscribe()
  })
})

describe('createDebounced', () => {
  it('should debounce function calls', async () => {
    const fn = vi.fn()
    const debounced = createDebounced(fn, 20)

    debounced()
    debounced()
    debounced()

    expect(fn).not.toHaveBeenCalled()

    await new Promise((r) => setTimeout(r, 30))

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should flush immediately', () => {
    const fn = vi.fn()
    const debounced = createDebounced(fn, 1000)

    debounced()
    debounced.flush()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should cancel pending calls', async () => {
    const fn = vi.fn()
    const debounced = createDebounced(fn, 20)

    debounced()
    debounced.cancel()

    await new Promise((r) => setTimeout(r, 30))

    expect(fn).not.toHaveBeenCalled()
  })

  it('should report pending status', () => {
    const fn = vi.fn()
    const debounced = createDebounced(fn, 1000)

    expect(debounced.pending()).toBe(false)
    debounced()
    expect(debounced.pending()).toBe(true)
  })
})

describe('createPausable', () => {
  it('should track pause state', () => {
    const pausable = createPausable()

    expect(pausable.isPaused()).toBe(false)

    pausable.pause()
    expect(pausable.isPaused()).toBe(true)

    pausable.resume()
    expect(pausable.isPaused()).toBe(false)
  })
})
