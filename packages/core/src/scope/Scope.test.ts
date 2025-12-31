import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkerPool } from '../engine/WorkerPool'
import { Scope } from './Scope'

/**
 * Scope Tests
 *
 * Spec: architecture-foundation.md §3 - Execution Layer Hierarchy
 * Spec: execution-semantics.md §2 - Scope
 */
describe('Scope', () => {
  let scope: Scope

  beforeEach(() => {
    scope = new Scope({
      id: 'test-scope',
      name: 'Test Scope',
    })
  })

  describe('initialization', () => {
    it('should set id and name', () => {
      expect(scope.id).toBe('test-scope')
      expect(scope.name).toBe('Test Scope')
    })

    it('should start in INIT state', () => {
      expect(scope.state).toBe('INIT')
    })

    it('should be alive initially', () => {
      expect(scope.isAlive).toBe(true)
    })

    it('should not be able to execute in INIT', () => {
      expect(scope.canExecute).toBe(false)
    })

    it('should have no tasks initially', () => {
      expect(scope.taskCount).toBe(0)
    })

    it('should store engine config', () => {
      const scopeWithConfig = new Scope({
        id: 'scope',
        name: 'Scope',
        engine: { workers: 4 },
      })
      expect(scopeWithConfig.workerCount).toBe(4)
    })
  })

  describe('lifecycle', () => {
    it('should mount (INIT → ATTACHED)', () => {
      const result = scope.mount()

      expect(result).toBe(true)
      expect(scope.state).toBe('ATTACHED')
      expect(scope.canExecute).toBe(true)
    })

    it('should transition to RUNNING on first task', async () => {
      scope.mount()

      await scope.run(async () => 'result')

      expect(scope.state).toBe('RUNNING')
    })

    it('should suspend (RUNNING → SUSPENDED)', async () => {
      scope.mount()
      await scope.run(async () => 'result')

      const result = scope.suspend()

      expect(result).toBe(true)
      expect(scope.state).toBe('SUSPENDED')
    })

    it('should resume (SUSPENDED → RUNNING)', async () => {
      scope.mount()
      await scope.run(async () => 'result')
      scope.suspend()

      const result = scope.resume()

      expect(result).toBe(true)
      expect(scope.state).toBe('RUNNING')
    })

    it('should dispose', () => {
      scope.mount()
      scope.dispose()

      expect(scope.state).toBe('DISPOSED')
      expect(scope.isAlive).toBe(false)
    })

    it('should be idempotent on dispose', () => {
      scope.mount()
      scope.dispose()
      scope.dispose()
      scope.dispose()

      expect(scope.state).toBe('DISPOSED')
    })
  })

  describe('run()', () => {
    beforeEach(() => {
      scope.mount()
    })

    it('should execute task function', async () => {
      const fn = vi.fn().mockResolvedValue('result')

      await scope.run(fn)

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should return result', async () => {
      const result = await scope.run(async () => 'my-result')

      expect(result).toBe('my-result')
    })

    it('should pass context to function', async () => {
      let receivedCtx: unknown

      await scope.run(async (ctx) => {
        receivedCtx = ctx
        return 'result'
      })

      expect(receivedCtx).toMatchObject({
        ref: expect.any(String),
        signal: expect.any(AbortSignal),
      })
    })

    it('should throw if scope disposed', async () => {
      scope.dispose()

      await expect(() => scope.run(async () => 'result')).rejects.toThrow(
        'scope "Test Scope" is disposed'
      )
    })

    it('should support deferred option', async () => {
      const result = await scope.run(async () => 'deferred', { deferred: true })

      expect(result).toBe('deferred')
    })

    it('should use worker pool when provided', async () => {
      const pool = new WorkerPool({ defaultWorkers: 1, maxWorkers: 2 })
      const scopeWithPool = new Scope({ id: 'scope', name: 'Scope' }, pool)
      scopeWithPool.mount()

      const result = await scopeWithPool.run(async () => 'pooled')

      expect(result).toBe('pooled')
      pool.dispose()
    })
  })

  describe('effect()', () => {
    beforeEach(() => {
      scope.mount()
    })

    it('should execute sync function', () => {
      const result = scope.effect(() => 42)

      expect(result).toBe(42)
    })

    it('should execute async function', async () => {
      const result = await scope.effect(async () => 'async')

      expect(result).toBe('async')
    })

    it('should throw if scope disposed', () => {
      scope.dispose()

      expect(() => scope.effect(() => 42)).toThrow(
        'scope "Test Scope" is disposed'
      )
    })
  })

  describe('task management', () => {
    beforeEach(() => {
      scope.mount()
    })

    it('should create task', () => {
      const task = scope.createTask()

      expect(task).toBeDefined()
      expect(task.scopeId).toBe('test-scope')
    })

    it('should increment task count', () => {
      scope.createTask()

      expect(scope.taskCount).toBe(1)
    })

    it('should get task by ref', () => {
      const task = scope.createTask()
      const found = scope.getTask(task.ref)

      expect(found).toBe(task)
    })

    it('should abort task', () => {
      const task = scope.createTask()

      const result = scope.abortTask(task.ref)

      expect(result).toBe(true)
      expect(task.status).toBe('aborted')
    })

    it('should abort all tasks on dispose', async () => {
      const task1 = scope.createTask()
      const task2 = scope.createTask()

      scope.dispose()

      expect(task1.status).toBe('aborted')
      expect(task2.status).toBe('aborted')
    })

    it('should throw if creating task in INIT state', () => {
      const uninitScope = new Scope({ id: 's', name: 'S' })

      expect(() => uninitScope.createTask()).toThrow('not ready')
    })
  })

  describe('isolation', () => {
    it('should not affect other scopes', () => {
      const scope1 = new Scope({ id: 's1', name: 'S1' })
      const scope2 = new Scope({ id: 's2', name: 'S2' })

      scope1.mount()
      scope2.mount()

      scope1.dispose()

      expect(scope1.isAlive).toBe(false)
      expect(scope2.isAlive).toBe(true)
    })
  })
})
