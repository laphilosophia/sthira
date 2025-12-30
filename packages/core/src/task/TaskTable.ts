import type { Ref, ScopeID } from '../types'
import { Task } from './Task'

/**
 * TaskTable - Registry of active tasks.
 *
 * Manages task lifecycle across scopes.
 *
 * @see {@link docs/implementation.md#tasktable}
 */
export class TaskTable {
  private readonly _tasks = new Map<Ref, Task>()

  /**
   * Number of registered tasks.
   */
  get size(): number {
    return this._tasks.size
  }

  /**
   * Register a task.
   *
   * @param task - Task to register
   */
  register(task: Task): void {
    this._tasks.set(task.ref, task)
  }

  /**
   * Unregister a task.
   *
   * @param ref - Ref of task to unregister
   */
  unregister(ref: Ref): void {
    this._tasks.delete(ref)
  }

  /**
   * Get a task by ref.
   *
   * @param ref - Ref to look up
   * @returns Task if found, undefined otherwise
   */
  get(ref: Ref): Task | undefined {
    return this._tasks.get(ref)
  }

  /**
   * Check if task exists.
   *
   * @param ref - Ref to check
   */
  has(ref: Ref): boolean {
    return this._tasks.has(ref)
  }

  /**
   * Abort all tasks for a scope.
   *
   * @param scopeId - Scope to abort tasks for
   *
   * @see {@link docs/algorithm.md#disposal-algorithm}
   */
  abortAll(scopeId: ScopeID): void {
    for (const task of this._tasks.values()) {
      if (task.scopeId === scopeId) {
        task.abort()
      }
    }
  }

  /**
   * Get count of active tasks for a scope.
   *
   * @param scopeId - Scope to count tasks for
   */
  getActiveCount(scopeId: ScopeID): number {
    let count = 0
    for (const task of this._tasks.values()) {
      if (task.scopeId === scopeId && task.isActive) {
        count++
      }
    }
    return count
  }

  /**
   * Get all tasks for a scope.
   *
   * @param scopeId - Scope to get tasks for
   */
  getByScope(scopeId: ScopeID): Task[] {
    const tasks: Task[] = []
    for (const task of this._tasks.values()) {
      if (task.scopeId === scopeId) {
        tasks.push(task)
      }
    }
    return tasks
  }

  /**
   * Clear all tasks.
   */
  clear(): void {
    this._tasks.clear()
  }
}
