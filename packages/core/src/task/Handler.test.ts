import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Handler } from './Handler'

/**
 * Handler Tests
 *
 * Spec: execution-semantics.md §6 - Handler
 * Spec: failure-taxonomy.md §5 - Handler Failures
 */
describe('Handler', () => {
  let handler: Handler

  beforeEach(() => {
    handler = new Handler('test-ref')
  })

  describe('initialization', () => {
    it('should generate unique handler id', () => {
      const handler2 = new Handler('test-ref')

      expect(handler.id).toBeDefined()
      expect(handler.id).not.toBe(handler2.id)
    })

    it('should bind to task ref', () => {
      expect(handler.taskRef).toBe('test-ref')
    })

    it('should start in pending status', () => {
      expect(handler.status).toBe('pending')
    })

    it('should have no error initially', () => {
      expect(handler.error).toBeNull()
    })

    it('should be pending initially', () => {
      expect(handler.isPending).toBe(true)
    })
  })

  describe('setFunction', () => {
    it('should set handler function', () => {
      const fn = vi.fn()
      handler.setFunction(fn)

      // No error thrown
      expect(handler.status).toBe('pending')
    })

    it('should throw if function already set', () => {
      handler.setFunction(vi.fn())

      expect(() => handler.setFunction(vi.fn())).toThrow(
        'Handler function already set'
      )
    })
  })

  describe('execute', () => {
    // Spec: execution-semantics.md §6 - Handler executes
    it('should execute handler function', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)
      handler.setFunction(fn)

      await handler.execute()

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should transition to running during execution', async () => {
      let statusDuringExecution: string | undefined

      handler.setFunction(async () => {
        statusDuringExecution = handler.status
      })

      await handler.execute()

      expect(statusDuringExecution).toBe('running')
    })

    it('should transition to completed on success', async () => {
      handler.setFunction(async () => { })

      await handler.execute()

      expect(handler.status).toBe('completed')
      expect(handler.isCompleted).toBe(true)
    })

    // Spec: failure-taxonomy.md §5 - Handler failure propagates
    it('should transition to failed on error', async () => {
      const error = new Error('Handler crashed')
      handler.setFunction(async () => {
        throw error
      })

      await expect(handler.execute()).rejects.toThrow('Handler crashed')

      expect(handler.status).toBe('failed')
    })

    it('should capture error on failure', async () => {
      const error = new Error('Handler crashed')
      handler.setFunction(async () => {
        throw error
      })

      await expect(handler.execute()).rejects.toThrow()

      expect(handler.error).toBe(error)
    })

    it('should throw if no function set', async () => {
      await expect(handler.execute()).rejects.toThrow(
        'Handler function not set'
      )
    })

    it('should throw if already executed', async () => {
      handler.setFunction(async () => { })
      await handler.execute()

      await expect(handler.execute()).rejects.toThrow(
        'Cannot execute handler: status is completed'
      )
    })

    it('should not be pending after execution', async () => {
      handler.setFunction(async () => { })
      await handler.execute()

      expect(handler.isPending).toBe(false)
    })
  })

  describe('cancel', () => {
    // Spec: algorithm.md §7 - Disposal cancels handlers
    it('should cancel pending handler', () => {
      handler.setFunction(async () => { })
      handler.cancel()

      expect(handler.status).toBe('cancelled')
    })

    it('should prevent execution of cancelled handler', async () => {
      handler.setFunction(async () => { })
      handler.cancel()

      await expect(handler.execute()).rejects.toThrow(
        'Cannot execute handler: status is cancelled'
      )
    })

    it('should be idempotent', () => {
      handler.setFunction(async () => { })
      handler.cancel()
      handler.cancel()
      handler.cancel()

      expect(handler.status).toBe('cancelled')
    })

    it('should not affect completed handler', async () => {
      handler.setFunction(async () => { })
      await handler.execute()

      handler.cancel()

      expect(handler.status).toBe('completed')
    })

    it('should not affect failed handler', async () => {
      handler.setFunction(async () => {
        throw new Error('fail')
      })

      await expect(handler.execute()).rejects.toThrow()

      handler.cancel()

      expect(handler.status).toBe('failed')
    })
  })
})
