import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkerPool } from '../engine/WorkerPool'
import { Task } from './Task'

/**
 * Task Tests
 *
 * Spec: execution-semantics.md §2 - Task
 * Spec: engine-semantics.md §3 - Dual Execution API
 */
describe('Task', () => {
  let task: Task<string>

  beforeEach(() => {
    task = new Task<string>('test-scope')
  })

  describe('initialization', () => {
    it('should generate unique ref', () => {
      const task2 = new Task('test-scope')

      expect(task.ref).toBeDefined()
      expect(task.ref).not.toBe(task2.ref)
    })

    it('should accept custom ref', () => {
      const customTask = new Task('scope', undefined, 'custom-ref')
      expect(customTask.ref).toBe('custom-ref')
    })

    it('should bind to scope id', () => {
      expect(task.scopeId).toBe('test-scope')
    })

    it('should start in pending status', () => {
      expect(task.status).toBe('pending')
    })

    it('should have no outcome initially', () => {
      expect(task.outcome).toBeNull()
    })

    it('should have no error initially', () => {
      expect(task.error).toBeNull()
    })

    it('should have no result initially', () => {
      expect(task.result).toBeNull()
    })

    it('should be active when pending', () => {
      expect(task.isActive).toBe(true)
    })

    it('should not be complete when pending', () => {
      expect(task.isComplete).toBe(false)
    })

    it('should have no workers initially', () => {
      expect(task.workerCount).toBe(0)
    })

    it('should have no handlers initially', () => {
      expect(task.handlerCount).toBe(0)
    })

    it('should have no streams initially', () => {
      expect(task.streamCount).toBe(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // effect() - LIGHT PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('effect() - light path', () => {
    it('should execute sync function directly', () => {
      const result = task.effect(() => 42)

      expect(result).toBe(42)
    })

    it('should execute async function', async () => {
      const result = await task.effect(async () => 'async-result')

      expect(result).toBe('async-result')
    })

    it('should throw if task is not active', () => {
      task.abort()

      expect(() => task.effect(() => 42)).toThrow(
        'Cannot execute effect: task is not active'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // run() - HEAVY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('run() - heavy path', () => {
    it('should execute function', async () => {
      const result = await task.run(async () => 'result')

      expect(result).toBe('result')
    })

    it('should pass context with ref and signal', async () => {
      let receivedCtx: unknown

      await task.run(async (ctx) => {
        receivedCtx = ctx
        return 'result'
      })

      expect(receivedCtx).toMatchObject({
        ref: task.ref,
        signal: expect.any(AbortSignal),
        spawnWorker: expect.any(Function),
        addHandler: expect.any(Function),
        createStream: expect.any(Function),
      })
    })

    it('should transition to running during execution', async () => {
      let statusDuringExecution: string | undefined

      await task.run(async () => {
        statusDuringExecution = task.status
        return 'result'
      })

      expect(statusDuringExecution).toBe('running')
    })

    it('should transition to success on completion', async () => {
      await task.run(async () => 'result')

      expect(task.status).toBe('success')
      expect(task.outcome).toBe('success')
    })

    it('should store result on success', async () => {
      await task.run(async () => 'my-result')

      expect(task.result).toBe('my-result')
    })

    it('should return result', async () => {
      const result = await task.run(async () => 'my-result')

      expect(result).toBe('my-result')
    })

    it('should transition to error on failure', async () => {
      await expect(
        task.run(async () => {
          throw new Error('Task crashed')
        })
      ).rejects.toThrow('Task crashed')

      expect(task.status).toBe('error')
      expect(task.outcome).toBe('error')
    })

    it('should store error on failure', async () => {
      const error = new Error('Task crashed')

      await expect(
        task.run(async () => {
          throw error
        })
      ).rejects.toThrow()

      expect(task.error).toBe(error)
    })

    it('should not be active after success', async () => {
      await task.run(async () => 'result')

      expect(task.isActive).toBe(false)
      expect(task.isComplete).toBe(true)
    })

    it('should not be active after error', async () => {
      await expect(
        task.run(async () => {
          throw new Error('fail')
        })
      ).rejects.toThrow()

      expect(task.isActive).toBe(false)
      expect(task.isComplete).toBe(true)
    })

    it('should throw if already executed', async () => {
      await task.run(async () => 'result')

      await expect(task.run(async () => 'again')).rejects.toThrow(
        'Cannot run task: status is success'
      )
    })

    it('should support deferred execution', async () => {
      const result = await task.run(async () => 'deferred', { deferred: true })

      expect(result).toBe('deferred')
    })

    it('should use worker pool when provided', async () => {
      const pool = new WorkerPool({ defaultWorkers: 1, maxWorkers: 2 })
      const taskWithPool = new Task<string>('scope', pool)

      const result = await taskWithPool.run(async () => 'pooled')

      expect(result).toBe('pooled')
      pool.dispose()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // abort()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('abort', () => {
    it('should abort signal', () => {
      task.abort()

      expect(task.signal.aborted).toBe(true)
    })

    it('should transition to aborted', () => {
      task.abort()

      expect(task.status).toBe('aborted')
      expect(task.outcome).toBe('aborted')
    })

    it('should not be active after abort', () => {
      task.abort()

      expect(task.isActive).toBe(false)
      expect(task.isComplete).toBe(true)
    })

    it('should be idempotent', () => {
      task.abort()
      task.abort()
      task.abort()

      expect(task.status).toBe('aborted')
    })

    it('should terminate workers on abort', async () => {
      let workerTerminated = false

      await task
        .run(async (ctx) => {
          ctx.spawnWorker(async (signal) => {
            await new Promise<void>((resolve) => {
              signal.addEventListener('abort', () => {
                workerTerminated = true
                resolve()
              })
            })
          })

          // Abort mid-execution
          task.abort()

          return 'result'
        })
        .catch(() => {})

      expect(workerTerminated).toBe(true)
    })

    it('should not affect completed task', async () => {
      await task.run(async () => 'result')

      task.abort()

      expect(task.status).toBe('success')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Context methods (via run)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('spawnWorker (via run)', () => {
    it('should spawn worker during execution', async () => {
      await task.run(async (ctx) => {
        const handle = ctx.spawnWorker(async () => {})

        expect(handle.id).toBeDefined()
        expect(typeof handle.terminate).toBe('function')

        return 'result'
      })
    })

    it('should increment worker count', async () => {
      await task.run(async (ctx) => {
        ctx.spawnWorker(async () => {})

        expect(task.workerCount).toBe(1)

        return 'result'
      })
    })
  })

  describe('addHandler (via run)', () => {
    it('should add handler during execution', async () => {
      await task.run(async (ctx) => {
        const handle = ctx.addHandler(async () => {})

        expect(handle.id).toBeDefined()
        expect(typeof handle.execute).toBe('function')
        expect(typeof handle.cancel).toBe('function')

        return 'result'
      })
    })

    it('should increment handler count', async () => {
      await task.run(async (ctx) => {
        ctx.addHandler(async () => {})

        expect(task.handlerCount).toBe(1)

        return 'result'
      })
    })

    it('should execute handler', async () => {
      const handlerFn = vi.fn().mockResolvedValue(undefined)

      await task.run(async (ctx) => {
        const handle = ctx.addHandler(handlerFn)
        await handle.execute()

        return 'result'
      })

      expect(handlerFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('createStream (via run)', () => {
    it('should create stream during execution', async () => {
      await task.run(async (ctx) => {
        const handle = ctx.createStream<number>()

        expect(handle.id).toBeDefined()
        expect(typeof handle.emit).toBe('function')
        expect(typeof handle.subscribe).toBe('function')
        expect(typeof handle.abort).toBe('function')

        return 'result'
      })
    })

    it('should increment stream count', async () => {
      await task.run(async (ctx) => {
        ctx.createStream()

        expect(task.streamCount).toBe(1)

        return 'result'
      })
    })

    it('should emit values to subscribers', async () => {
      const subscriber = vi.fn()

      await task.run(async (ctx) => {
        const stream = ctx.createStream<number>()
        stream.subscribe(subscriber)
        stream.emit(42)

        return 'result'
      })

      expect(subscriber).toHaveBeenCalledWith(42)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Signal
  // ═══════════════════════════════════════════════════════════════════════════

  describe('signal', () => {
    it('should provide abort signal', () => {
      expect(task.signal).toBeInstanceOf(AbortSignal)
    })

    it('should not be aborted initially', () => {
      expect(task.signal.aborted).toBe(false)
    })
  })
})
