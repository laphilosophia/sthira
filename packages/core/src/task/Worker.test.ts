import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Worker } from './Worker'

/**
 * Worker Tests
 *
 * Spec: worker-lifecycle.md
 * Spec: execution-semantics.md §5 - Worker
 */
describe('Worker', () => {
  let worker: Worker

  beforeEach(() => {
    worker = new Worker('test-ref')
  })

  describe('initialization', () => {
    it('should generate unique worker id', () => {
      const worker2 = new Worker('test-ref')

      expect(worker.id).toBeDefined()
      expect(worker.id).not.toBe(worker2.id)
    })

    it('should bind to task ref', () => {
      expect(worker.taskRef).toBe('test-ref')
    })

    it('should start in idle status', () => {
      expect(worker.status).toBe('idle')
    })

    it('should have no error initially', () => {
      expect(worker.error).toBeNull()
    })

    it('should be active when idle', () => {
      expect(worker.isActive).toBe(true)
    })
  })

  describe('start', () => {
    // Spec: worker-lifecycle.md §5 - Workers execute instructions
    it('should execute worker function', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)

      await worker.start(fn)

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(worker.signal)
    })

    it('should transition to running during execution', async () => {
      let statusDuringExecution: string | undefined

      await worker.start(async () => {
        statusDuringExecution = worker.status
      })

      expect(statusDuringExecution).toBe('running')
    })

    it('should transition to terminated on success', async () => {
      await worker.start(async () => { })

      expect(worker.status).toBe('terminated')
    })

    it('should be active while running', async () => {
      let isActiveDuring: boolean | undefined

      await worker.start(async () => {
        isActiveDuring = worker.isActive
      })

      expect(isActiveDuring).toBe(true)
    })

    it('should not be active after termination', async () => {
      await worker.start(async () => { })

      expect(worker.isActive).toBe(false)
    })

    // Spec: worker-lifecycle.md §6 - Worker Failure
    it('should transition to failed on error', async () => {
      const error = new Error('Worker crashed')

      await expect(
        worker.start(async () => {
          throw error
        })
      ).rejects.toThrow('Worker crashed')

      expect(worker.status).toBe('failed')
    })

    it('should capture error on failure', async () => {
      const error = new Error('Worker crashed')

      await expect(
        worker.start(async () => {
          throw error
        })
      ).rejects.toThrow()

      expect(worker.error).toBe(error)
    })

    it('should throw if started when not idle', async () => {
      await worker.start(async () => { })

      await expect(worker.start(async () => { })).rejects.toThrow(
        'Cannot start worker: status is terminated'
      )
    })
  })

  describe('terminate', () => {
    // Spec: worker-lifecycle.md §11 - Disposal Semantics
    it('should abort signal on terminate', () => {
      worker.terminate()

      expect(worker.signal.aborted).toBe(true)
    })

    it('should transition to terminated', () => {
      worker.terminate()

      expect(worker.status).toBe('terminated')
    })

    it('should be idempotent', () => {
      worker.terminate()
      worker.terminate()
      worker.terminate()

      expect(worker.status).toBe('terminated')
    })

    it('should abort running execution', async () => {
      let aborted = false

      const promise = worker.start(async (signal) => {
        await new Promise<void>((resolve) => {
          const checkAbort = (): void => {
            if (signal.aborted) {
              aborted = true
              resolve()
            } else {
              setTimeout(checkAbort, 1)
            }
          }
          checkAbort()
        })
      })

      // Terminate while running
      worker.terminate()

      await promise

      expect(aborted).toBe(true)
      expect(worker.status).toBe('terminated')
    })

    it('should not affect already terminated worker', async () => {
      await worker.start(async () => { })

      expect(worker.status).toBe('terminated')

      worker.terminate()

      expect(worker.status).toBe('terminated')
    })

    it('should not affect failed worker', async () => {
      await expect(
        worker.start(async () => {
          throw new Error('fail')
        })
      ).rejects.toThrow()

      expect(worker.status).toBe('failed')

      worker.terminate()

      expect(worker.status).toBe('failed')
    })
  })

  describe('signal', () => {
    it('should provide abort signal', () => {
      expect(worker.signal).toBeInstanceOf(AbortSignal)
    })

    it('should not be aborted initially', () => {
      expect(worker.signal.aborted).toBe(false)
    })
  })
})
