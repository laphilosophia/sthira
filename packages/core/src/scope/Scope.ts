import type { WorkerPool } from '../engine/WorkerPool'
import { Task, type TaskContext, type TaskRunOptions } from '../task/Task'
import { TaskTable } from '../task/TaskTable'
import type { FSMState, Ref, ScopeID } from '../types'
import { ScopeFSM } from './ScopeFSM'

/**
 * Scope engine configuration.
 */
export interface ScopeEngineConfig {
  /** Number of workers for this scope (overrides Authority default) */
  readonly workers?: number
}

/**
 * Scope configuration.
 */
export interface ScopeConfig {
  /** Unique scope identifier */
  readonly id: ScopeID
  /** Human-readable name */
  readonly name: string
  /** Engine configuration */
  readonly engine?: ScopeEngineConfig
}

/**
 * Scope - Execution lane with FSM lifecycle.
 *
 * Role: **Imperative** - Lane control, FSM, disposal, worker override
 *
 * Scope:
 * - Owns FSM lifecycle
 * - Coordinates tasks within the lane
 * - Overrides engine config from Authority
 * - Isolated from other scopes
 *
 * @see {@link docs/architecture-foundation.md#scope}
 * @see {@link docs/execution-semantics.md#scope}
 */
export class Scope {
  readonly id: ScopeID
  readonly name: string

  private readonly _fsm = new ScopeFSM()
  private readonly _tasks = new TaskTable()
  private readonly _workerPool: WorkerPool | null
  private readonly _workerCount: number | undefined

  /**
   * Create a new Scope.
   *
   * @param config - Scope configuration
   * @param workerPool - WorkerPool from Authority (optional)
   */
  constructor(config: ScopeConfig, workerPool?: WorkerPool) {
    this.id = config.id
    this.name = config.name
    this._workerPool = workerPool ?? null
    this._workerCount = config.engine?.workers
  }

  /**
   * Current FSM state.
   */
  get state(): FSMState {
    return this._fsm.state
  }

  /**
   * Number of active tasks.
   */
  get taskCount(): number {
    return this._tasks.size
  }

  /**
   * Check if scope is alive.
   */
  get isAlive(): boolean {
    return this._fsm.isAlive()
  }

  /**
   * Check if execution is permitted.
   */
  get canExecute(): boolean {
    return this._fsm.canExecute()
  }

  /**
   * Worker count for this scope.
   */
  get workerCount(): number | undefined {
    return this._workerCount
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Mount the scope (INIT → ATTACHED).
   *
   * Call this when the component/page mounts.
   */
  mount(): boolean {
    return this._fsm.transition('mounted')
  }

  /**
   * Suspend the scope (RUNNING → SUSPENDED).
   *
   * Call this when the component becomes invisible.
   */
  suspend(): boolean {
    return this._fsm.transition('suspend')
  }

  /**
   * Resume the scope (SUSPENDED → RUNNING).
   *
   * Call this when the component becomes visible again.
   */
  resume(): boolean {
    return this._fsm.transition('resume')
  }

  /**
   * Dispose the scope.
   *
   * Aborts all tasks, transitions to DISPOSED.
   * Call this when the component/page unmounts.
   */
  dispose(): void {
    if (!this._fsm.isAlive()) {
      return
    }

    // Abort all active tasks
    this._tasks.abortAll(this.id)

    // Transition to DISPOSING → DISPOSED
    this._fsm.transition('dispose')
    this._fsm.transition('dispose') // Auto-transition to DISPOSED
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new task in this scope.
   *
   * @param ref - Optional custom ref
   * @returns Task instance
   * @throws If scope is not alive or cannot execute
   */
  createTask<T>(ref?: Ref): Task<T> {
    if (!this._fsm.isAlive()) {
      throw new Error(`Cannot create task: scope "${this.name}" is disposed`)
    }

    if (!this._fsm.canExecute()) {
      throw new Error(`Cannot create task: scope "${this.name}" is not ready`)
    }

    const task = new Task<T>(this.id, this._workerPool ?? undefined, ref)
    this._tasks.register(task)

    // Transition to RUNNING if first task
    if (this._fsm.state === 'ATTACHED') {
      this._fsm.transition('taskStarted')
    }

    return task
  }

  /**
   * Run a task function in this scope.
   *
   * Convenience method that creates a task, runs it, and returns result.
   *
   * @param fn - Task function
   * @param options - Task run options
   * @returns Promise resolving with result
   */
  async run<T>(
    fn: (ctx: TaskContext) => Promise<T>,
    options?: TaskRunOptions
  ): Promise<T> {
    const task = this.createTask<T>()

    try {
      return await task.run(fn, options)
    } finally {
      this._tasks.unregister(task.ref)
    }
  }

  /**
   * Execute a light effect in this scope.
   *
   * @param fn - Effect function
   * @returns Result
   */
  effect<T>(fn: () => T): T
  effect<T>(fn: () => Promise<T>): Promise<T>
  effect<T>(fn: () => T | Promise<T>): T | Promise<T> {
    if (!this._fsm.isAlive()) {
      throw new Error(`Cannot execute effect: scope "${this.name}" is disposed`)
    }

    // Effects don't need full task, just direct execution
    return fn()
  }

  /**
   * Get a task by ref.
   */
  getTask(ref: Ref): Task | undefined {
    return this._tasks.get(ref)
  }

  /**
   * Abort a specific task.
   */
  abortTask(ref: Ref): boolean {
    const task = this._tasks.get(ref)
    if (task) {
      task.abort()
      this._tasks.unregister(ref)
      return true
    }
    return false
  }

  /**
   * Abort all tasks in this scope.
   */
  abortAll(): void {
    this._tasks.abortAll(this.id)
  }
}
