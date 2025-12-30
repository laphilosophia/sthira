import { beforeEach, describe, expect, it } from 'vitest'
import { Task } from './Task'
import { TaskTable } from './TaskTable'

/**
 * TaskTable Tests
 *
 * Spec: implementation.md §3.2 - TaskTable
 */
describe('TaskTable', () => {
  let table: TaskTable

  beforeEach(() => {
    table = new TaskTable()
  })

  describe('register/unregister', () => {
    it('should register task', () => {
      const task = new Task('scope-1')
      table.register(task)

      expect(table.has(task.ref)).toBe(true)
    })

    it('should increment size on register', () => {
      table.register(new Task('scope-1'))
      table.register(new Task('scope-1'))

      expect(table.size).toBe(2)
    })

    it('should unregister task', () => {
      const task = new Task('scope-1')
      table.register(task)
      table.unregister(task.ref)

      expect(table.has(task.ref)).toBe(false)
    })

    it('should decrement size on unregister', () => {
      const task = new Task('scope-1')
      table.register(task)
      table.unregister(task.ref)

      expect(table.size).toBe(0)
    })
  })

  describe('get', () => {
    it('should return registered task', () => {
      const task = new Task('scope-1')
      table.register(task)

      expect(table.get(task.ref)).toBe(task)
    })

    it('should return undefined for unknown ref', () => {
      expect(table.get('unknown-ref')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered task', () => {
      const task = new Task('scope-1')
      table.register(task)

      expect(table.has(task.ref)).toBe(true)
    })

    it('should return false for unknown ref', () => {
      expect(table.has('unknown-ref')).toBe(false)
    })
  })

  describe('abortAll', () => {
    // Spec: algorithm.md §7 - Disposal aborts all tasks
    it('should abort all tasks for scope', () => {
      const task1 = new Task('scope-1')
      const task2 = new Task('scope-1')
      const task3 = new Task('scope-2')

      table.register(task1)
      table.register(task2)
      table.register(task3)

      table.abortAll('scope-1')

      expect(task1.status).toBe('aborted')
      expect(task2.status).toBe('aborted')
      expect(task3.status).toBe('pending') // Different scope
    })

    it('should not abort tasks from other scopes', () => {
      const task = new Task('other-scope')
      table.register(task)

      table.abortAll('scope-1')

      expect(task.status).toBe('pending')
    })
  })

  describe('getActiveCount', () => {
    it('should return count of active tasks', () => {
      const task1 = new Task('scope-1')
      const task2 = new Task('scope-1')
      const task3 = new Task('scope-2')

      table.register(task1)
      table.register(task2)
      table.register(task3)

      expect(table.getActiveCount('scope-1')).toBe(2)
    })

    it('should not count aborted tasks', () => {
      const task1 = new Task('scope-1')
      const task2 = new Task('scope-1')

      table.register(task1)
      table.register(task2)

      task1.abort()

      expect(table.getActiveCount('scope-1')).toBe(1)
    })

    it('should return 0 for empty scope', () => {
      expect(table.getActiveCount('unknown-scope')).toBe(0)
    })
  })

  describe('getByScope', () => {
    it('should return all tasks for scope', () => {
      const task1 = new Task('scope-1')
      const task2 = new Task('scope-1')
      const task3 = new Task('scope-2')

      table.register(task1)
      table.register(task2)
      table.register(task3)

      const tasks = table.getByScope('scope-1')

      expect(tasks).toHaveLength(2)
      expect(tasks).toContain(task1)
      expect(tasks).toContain(task2)
    })

    it('should return empty array for unknown scope', () => {
      expect(table.getByScope('unknown')).toEqual([])
    })
  })

  describe('clear', () => {
    it('should remove all tasks', () => {
      table.register(new Task('scope-1'))
      table.register(new Task('scope-2'))

      table.clear()

      expect(table.size).toBe(0)
    })
  })
})
