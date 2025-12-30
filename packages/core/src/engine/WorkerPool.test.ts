import { beforeEach, describe, expect, it } from 'vitest'
import { WorkerPool } from './WorkerPool'

/**
 * WorkerPool Tests
 *
 * Spec: engine-semantics.md §4 - Worker Pool Configuration
 */
describe('WorkerPool', () => {
  let pool: WorkerPool

  beforeEach(() => {
    pool = new WorkerPool({
      defaultWorkers: 2,
      maxWorkers: 4,
    })
  })

  describe('initialization', () => {
    it('should create default number of workers', () => {
      expect(pool.size).toBe(2)
    })

    it('should have all workers idle initially', () => {
      expect(pool.idleCount).toBe(2)
      expect(pool.busyCount).toBe(0)
    })

    it('should have empty queue initially', () => {
      expect(pool.queueSize).toBe(0)
    })

    it('should not be disposed initially', () => {
      expect(pool.isDisposed).toBe(false)
    })
  })

  describe('execute', () => {
    it('should execute work and return result', async () => {
      const result = await pool.execute(() => 42)

      expect(result).toBe(42)
    })

    it('should execute async work', async () => {
      const result = await pool.execute(async () => {
        return 'async result'
      })

      expect(result).toBe('async result')
    })

    it('should propagate errors', async () => {
      await expect(
        pool.execute(() => {
          throw new Error('work failed')
        })
      ).rejects.toThrow('work failed')
    })

    it('should queue work when all workers busy', async () => {
      // Start 3 long-running tasks (pool has 2 workers)
      const task1 = pool.execute(
        () => new Promise((r) => setTimeout(() => r(1), 50))
      )
      const task2 = pool.execute(
        () => new Promise((r) => setTimeout(() => r(2), 50))
      )
      const task3 = pool.execute(
        () => new Promise((r) => setTimeout(() => r(3), 50))
      )

      // Should queue the third
      expect(pool.queueSize).toBe(1)

      const results = await Promise.all([task1, task2, task3])
      expect(results).toEqual([1, 2, 3])
    })

    it('should process queue when worker becomes available', async () => {
      const order: number[] = []

      const task1 = pool.execute(async () => {
        await new Promise((r) => setTimeout(r, 10))
        order.push(1)
        return 1
      })
      const task2 = pool.execute(async () => {
        await new Promise((r) => setTimeout(r, 10))
        order.push(2)
        return 2
      })
      const task3 = pool.execute(async () => {
        order.push(3)
        return 3
      })

      await Promise.all([task1, task2, task3])

      // Task 3 was queued and executed after 1 or 2 finished
      expect(order).toContain(3)
    })

    it('should reject if pool is disposed', async () => {
      pool.dispose()

      await expect(pool.execute(() => 42)).rejects.toThrow(
        'WorkerPool is disposed'
      )
    })
  })

  describe('scale', () => {
    it('should scale up workers', () => {
      pool.scale(4)

      expect(pool.size).toBe(4)
    })

    it('should not exceed maxWorkers', () => {
      pool.scale(10)

      expect(pool.size).toBe(4) // maxWorkers is 4
    })

    it('should scale down by removing idle workers', () => {
      pool.scale(4)
      expect(pool.size).toBe(4)

      pool.scale(1)
      expect(pool.size).toBe(1)
    })
  })

  describe('dispose', () => {
    it('should mark pool as disposed', () => {
      pool.dispose()

      expect(pool.isDisposed).toBe(true)
    })

    it('should clear all workers', () => {
      pool.dispose()

      expect(pool.size).toBe(0)
    })

    it('should reject queued work', async () => {
      // Fill workers
      const task1 = pool.execute(
        () => new Promise((r) => setTimeout(() => r(1), 100))
      )
      const task2 = pool.execute(
        () => new Promise((r) => setTimeout(() => r(2), 100))
      )
      // Queue third
      const task3 = pool.execute(() => 3)

      expect(pool.queueSize).toBe(1)

      // Dispose while work is queued
      pool.dispose()

      await expect(task3).rejects.toThrow('WorkerPool disposed')
    })

    it('should be idempotent', () => {
      pool.dispose()
      pool.dispose()
      pool.dispose()

      expect(pool.isDisposed).toBe(true)
    })
  })

  describe('concurrent execution', () => {
    it('should execute multiple works in parallel', async () => {
      const startTimes: number[] = []
      const now = Date.now()

      const tasks = [
        pool.execute(async () => {
          startTimes.push(Date.now() - now)
          await new Promise((r) => setTimeout(r, 20))
          return 1
        }),
        pool.execute(async () => {
          startTimes.push(Date.now() - now)
          await new Promise((r) => setTimeout(r, 20))
          return 2
        }),
      ]

      await Promise.all(tasks)

      // Both should start nearly simultaneously (within 10ms)
      expect(Math.abs(startTimes[0] - startTimes[1])).toBeLessThan(10)
    })
  })
})
