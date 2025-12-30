import { beforeEach, describe, expect, it } from 'vitest'
import { ScopeFSM } from './ScopeFSM'

/**
 * ScopeFSM Tests
 *
 * Spec: execution-semantics.md §4 - Task Lifecycle FSM
 * Spec: implementation.md §4 - ScopeFSM
 */
describe('ScopeFSM', () => {
  let fsm: ScopeFSM

  beforeEach(() => {
    fsm = new ScopeFSM()
  })

  describe('initial state', () => {
    it('should start in INIT state', () => {
      expect(fsm.state).toBe('INIT')
    })
  })

  describe('transition', () => {
    // Spec: execution-semantics.md §4 - INIT → ATTACHED on mounted
    it('should transition from INIT to ATTACHED on mounted event', () => {
      const result = fsm.transition('mounted')

      expect(result).toBe(true)
      expect(fsm.state).toBe('ATTACHED')
    })

    // Spec: execution-semantics.md §4 - ATTACHED → RUNNING on taskStarted
    it('should transition from ATTACHED to RUNNING on taskStarted event', () => {
      fsm.transition('mounted')
      const result = fsm.transition('taskStarted')

      expect(result).toBe(true)
      expect(fsm.state).toBe('RUNNING')
    })

    // Spec: execution-semantics.md §4 - RUNNING → SUSPENDED on suspend
    it('should transition from RUNNING to SUSPENDED on suspend event', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      const result = fsm.transition('suspend')

      expect(result).toBe(true)
      expect(fsm.state).toBe('SUSPENDED')
    })

    // Spec: execution-semantics.md §4 - SUSPENDED → RUNNING on resume
    it('should transition from SUSPENDED to RUNNING on resume event', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      fsm.transition('suspend')
      const result = fsm.transition('resume')

      expect(result).toBe(true)
      expect(fsm.state).toBe('RUNNING')
    })

    // Spec: execution-semantics.md §4 - any → DISPOSING on dispose
    it('should transition to DISPOSING from ATTACHED on dispose', () => {
      fsm.transition('mounted')
      const result = fsm.transition('dispose')

      expect(result).toBe(true)
      expect(fsm.state).toBe('DISPOSING')
    })

    it('should transition to DISPOSING from RUNNING on dispose', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      const result = fsm.transition('dispose')

      expect(result).toBe(true)
      expect(fsm.state).toBe('DISPOSING')
    })

    it('should transition to DISPOSING from SUSPENDED on dispose', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      fsm.transition('suspend')
      const result = fsm.transition('dispose')

      expect(result).toBe(true)
      expect(fsm.state).toBe('DISPOSING')
    })

    // Spec: execution-semantics.md §4 - DISPOSING auto-transitions to DISPOSED
    it('should auto-transition from DISPOSING to DISPOSED', () => {
      fsm.transition('mounted')
      fsm.transition('dispose')

      // DISPOSING auto-transitions on next transition call
      const result = fsm.transition('dispose')

      expect(result).toBe(true)
      expect(fsm.state).toBe('DISPOSED')
    })

    // Spec: execution-semantics.md §4 - DISPOSED is terminal
    it('should reject all transitions from DISPOSED state', () => {
      fsm.transition('mounted')
      fsm.transition('dispose')
      fsm.transition('dispose') // DISPOSING → DISPOSED

      expect(fsm.state).toBe('DISPOSED')

      // All events should be rejected
      expect(fsm.transition('mounted')).toBe(false)
      expect(fsm.transition('taskStarted')).toBe(false)
      expect(fsm.transition('suspend')).toBe(false)
      expect(fsm.transition('resume')).toBe(false)
      expect(fsm.transition('dispose')).toBe(false)

      expect(fsm.state).toBe('DISPOSED')
    })

    it('should return false for invalid transitions', () => {
      // INIT state should only accept 'mounted'
      expect(fsm.transition('taskStarted')).toBe(false)
      expect(fsm.transition('suspend')).toBe(false)
      expect(fsm.transition('resume')).toBe(false)
      expect(fsm.state).toBe('INIT')
    })
  })

  describe('canExecute', () => {
    // Spec: execution-semantics.md §4 - Execution permitted in ATTACHED/RUNNING
    it('should return false in INIT state', () => {
      expect(fsm.canExecute()).toBe(false)
    })

    it('should return true in ATTACHED state', () => {
      fsm.transition('mounted')
      expect(fsm.canExecute()).toBe(true)
    })

    it('should return true in RUNNING state', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      expect(fsm.canExecute()).toBe(true)
    })

    it('should return false in SUSPENDED state', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      fsm.transition('suspend')
      expect(fsm.canExecute()).toBe(false)
    })

    it('should return false in DISPOSING state', () => {
      fsm.transition('mounted')
      fsm.transition('dispose')
      expect(fsm.canExecute()).toBe(false)
    })

    it('should return false in DISPOSED state', () => {
      fsm.transition('mounted')
      fsm.transition('dispose')
      fsm.transition('dispose')
      expect(fsm.canExecute()).toBe(false)
    })
  })

  describe('isAlive', () => {
    // Spec: execution-activation.md §5 - Boundary alive check
    it('should return true in INIT state', () => {
      expect(fsm.isAlive()).toBe(true)
    })

    it('should return true in ATTACHED state', () => {
      fsm.transition('mounted')
      expect(fsm.isAlive()).toBe(true)
    })

    it('should return true in RUNNING state', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      expect(fsm.isAlive()).toBe(true)
    })

    it('should return true in SUSPENDED state', () => {
      fsm.transition('mounted')
      fsm.transition('taskStarted')
      fsm.transition('suspend')
      expect(fsm.isAlive()).toBe(true)
    })

    it('should return false in DISPOSING state', () => {
      fsm.transition('mounted')
      fsm.transition('dispose')
      expect(fsm.isAlive()).toBe(false)
    })

    it('should return false in DISPOSED state', () => {
      fsm.transition('mounted')
      fsm.transition('dispose')
      fsm.transition('dispose')
      expect(fsm.isAlive()).toBe(false)
    })
  })
})
