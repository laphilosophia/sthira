import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Authority } from './Authority'

/**
 * Authority Tests
 *
 * Spec: architecture-foundation.md §3 - Authority
 * Spec: execution-semantics.md §2 - Authority
 */
describe('Authority', () => {
  let authority: Authority

  beforeEach(() => {
    authority = new Authority()
  })

  afterEach(() => {
    authority.dispose()
  })

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(authority.isDisposed).toBe(false)
    })

    it('should create worker pool with default workers', () => {
      expect(authority.workerPoolSize).toBe(1)
    })

    it('should create worker pool with custom config', () => {
      const customAuthority = new Authority({
        engine: { defaultWorkers: 4, maxWorkers: 8 },
      })

      expect(customAuthority.workerPoolSize).toBe(4)
      customAuthority.dispose()
    })

    it('should have no scopes initially', () => {
      expect(authority.scopeCount).toBe(0)
    })
  })

  describe('scope management', () => {
    it('should create scope', () => {
      const scope = authority.createScope({
        id: 'test-scope',
        name: 'Test Scope',
      })

      expect(scope).toBeDefined()
      expect(scope.id).toBe('test-scope')
    })

    it('should register scope', () => {
      authority.createScope({ id: 'scope', name: 'Scope' })

      expect(authority.scopeCount).toBe(1)
      expect(authority.hasScope('scope')).toBe(true)
    })

    it('should get scope by id', () => {
      const scope = authority.createScope({ id: 'scope', name: 'Scope' })

      expect(authority.getScope('scope')).toBe(scope)
    })

    it('should return undefined for unknown scope', () => {
      expect(authority.getScope('unknown')).toBeUndefined()
    })

    it('should throw if scope id already exists', () => {
      authority.createScope({ id: 'scope', name: 'Scope' })

      expect(() =>
        authority.createScope({ id: 'scope', name: 'Duplicate' })
      ).toThrow('Scope "scope" already exists')
    })

    it('should unregister scope', () => {
      authority.createScope({ id: 'scope', name: 'Scope' })

      const result = authority.unregisterScope('scope')

      expect(result).toBe(true)
      expect(authority.scopeCount).toBe(0)
    })

    it('should get all scope ids', () => {
      authority.createScope({ id: 's1', name: 'S1' })
      authority.createScope({ id: 's2', name: 'S2' })

      const ids = authority.getScopeIds()

      expect(ids).toContain('s1')
      expect(ids).toContain('s2')
    })

    it('should scale worker pool for scope with more workers', () => {
      authority.createScope({
        id: 'heavy',
        name: 'Heavy',
        engine: { workers: 4 },
      })

      expect(authority.workerPoolSize).toBe(4)
    })

    it('should provide worker pool to scope', async () => {
      const scope = authority.createScope({ id: 'scope', name: 'Scope' })
      scope.mount()

      const result = await scope.run(async () => 'result')

      expect(result).toBe('result')
    })
  })

  describe('cross-scope communication', () => {
    it('should broadcast to subscribers', () => {
      const listener = vi.fn()

      authority.subscribe('user-updated', listener)
      authority.broadcast('user-updated', { id: 1, name: 'John' })

      expect(listener).toHaveBeenCalledWith({ id: 1, name: 'John' })
    })

    it('should support multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      authority.subscribe('event', listener1)
      authority.subscribe('event', listener2)
      authority.broadcast('event', 'data')

      expect(listener1).toHaveBeenCalledWith('data')
      expect(listener2).toHaveBeenCalledWith('data')
    })

    it('should unsubscribe', () => {
      const listener = vi.fn()

      const unsubscribe = authority.subscribe('event', listener)
      unsubscribe()
      authority.broadcast('event', 'data')

      expect(listener).not.toHaveBeenCalled()
    })

    it('should not call listeners on different channel', () => {
      const listener = vi.fn()

      authority.subscribe('channel-a', listener)
      authority.broadcast('channel-b', 'data')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('should mark as disposed', () => {
      authority.dispose()

      expect(authority.isDisposed).toBe(true)
    })

    it('should dispose all scopes', () => {
      const scope1 = authority.createScope({ id: 's1', name: 'S1' })
      const scope2 = authority.createScope({ id: 's2', name: 'S2' })
      scope1.mount()
      scope2.mount()

      authority.dispose()

      expect(scope1.isAlive).toBe(false)
      expect(scope2.isAlive).toBe(false)
    })

    it('should clear scopes', () => {
      authority.createScope({ id: 'scope', name: 'Scope' })
      authority.dispose()

      expect(authority.scopeCount).toBe(0)
    })

    it('should be idempotent', () => {
      authority.dispose()
      authority.dispose()
      authority.dispose()

      expect(authority.isDisposed).toBe(true)
    })

    it('should throw on createScope after dispose', () => {
      authority.dispose()

      expect(() =>
        authority.createScope({ id: 'scope', name: 'Scope' })
      ).toThrow('Authority is disposed')
    })
  })

  describe('worker pool metrics', () => {
    it('should report idle worker count', () => {
      expect(authority.idleWorkerCount).toBe(1)
    })

    it('should report busy worker count', () => {
      expect(authority.busyWorkerCount).toBe(0)
    })
  })
})
