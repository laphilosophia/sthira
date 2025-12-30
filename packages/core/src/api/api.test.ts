import { afterEach, describe, expect, it } from 'vitest'
import { createAuthority, createScope, createTask } from './index'

/**
 * Public API Tests
 *
 * Spec: api-contract.md
 */
describe('Public API', () => {
  describe('createAuthority', () => {
    it('should create Authority with default config', () => {
      const authority = createAuthority()

      expect(authority).toBeDefined()
      expect(authority.isDisposed).toBe(false)

      authority.dispose()
    })

    it('should create Authority with custom config', () => {
      const authority = createAuthority({
        engine: { defaultWorkers: 2, maxWorkers: 8 },
      })

      expect(authority.workerPoolSize).toBe(2)

      authority.dispose()
    })
  })

  describe('createScope', () => {
    let authority: ReturnType<typeof createAuthority>

    afterEach(() => {
      authority?.dispose()
    })

    it('should create scope factory', () => {
      authority = createAuthority()
      const scopeFactory = createScope(authority)

      expect(typeof scopeFactory).toBe('function')
    })

    it('should create scope via factory', () => {
      authority = createAuthority()
      const scopeFactory = createScope(authority)

      const scope = scopeFactory({
        id: 'test',
        name: 'Test Scope',
      })

      expect(scope.id).toBe('test')
      expect(scope.name).toBe('Test Scope')
    })
  })

  describe('createTask', () => {
    let authority: ReturnType<typeof createAuthority>

    afterEach(() => {
      authority?.dispose()
    })

    it('should create task factory', () => {
      authority = createAuthority()
      const scope = createScope(authority)({
        id: 'scope',
        name: 'Scope',
      })
      scope.mount()

      const task = createTask(scope)

      expect(task.effect).toBeDefined()
      expect(task.run).toBeDefined()
    })

    it('should execute effect via factory', () => {
      authority = createAuthority()
      const scope = createScope(authority)({
        id: 'scope',
        name: 'Scope',
      })
      scope.mount()
      const task = createTask(scope)

      const result = task.effect(() => 42)

      expect(result).toBe(42)
    })

    it('should execute run via factory', async () => {
      authority = createAuthority()
      const scope = createScope(authority)({
        id: 'scope',
        name: 'Scope',
      })
      scope.mount()
      const task = createTask(scope)

      const result = await task.run(async () => 'result')

      expect(result).toBe('result')
    })
  })

  describe('full workflow', () => {
    it('should work end-to-end', async () => {
      // Setup
      const authority = createAuthority({
        engine: { defaultWorkers: 1, maxWorkers: 4 },
      })

      const dashboard = createScope(authority)({
        id: 'dashboard',
        name: 'Dashboard',
        engine: { workers: 2 },
      })
      dashboard.mount()

      const task = createTask(dashboard)

      // Light execution
      const computed = task.effect(() => 1 + 1)
      expect(computed).toBe(2)

      // Heavy execution
      const result = await task.run(async (ctx) => {
        expect(ctx.signal).toBeInstanceOf(AbortSignal)
        return 'processed'
      })
      expect(result).toBe('processed')

      // Cleanup
      authority.dispose()
      expect(authority.isDisposed).toBe(true)
    })
  })
})
