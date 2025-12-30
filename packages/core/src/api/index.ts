import { Authority, type AuthorityConfig } from '../core/Authority'
import { Scope, type ScopeConfig } from '../scope/Scope'
import type { TaskContext, TaskRunOptions } from '../task/Task'

/**
 * Create an Authority instance.
 *
 * Authority is the global execution governor (God role).
 *
 * @param config - Authority configuration
 * @returns Authority instance
 *
 * @example
 * ```typescript
 * const authority = createAuthority({
 *   engine: { defaultWorkers: 1, maxWorkers: 4 }
 * })
 * ```
 *
 * @see {@link docs/architecture-foundation.md#authority}
 */
export function createAuthority(config: AuthorityConfig = {}): Authority {
  return new Authority(config)
}

/**
 * Create a Scope within an Authority.
 *
 * Higher-order function that binds to an Authority.
 *
 * @param authority - Authority to create scope in
 * @returns Scope factory function
 *
 * @example
 * ```typescript
 * const createScopeIn = createScope(authority)
 *
 * const dashboard = createScopeIn({
 *   id: 'dashboard',
 *   name: 'Dashboard',
 *   engine: { workers: 4 }
 * })
 * dashboard.mount()
 * ```
 *
 * @see {@link docs/architecture-foundation.md#scope}
 */
export function createScope(authority: Authority): (config: ScopeConfig) => Scope {
  return (config: ScopeConfig) => {
    const scope = authority.createScope(config)
    return scope
  }
}

/**
 * Create a Task factory for a Scope.
 *
 * Higher-order function that binds to a Scope.
 *
 * @param scope - Scope to create tasks in
 * @returns Task execution functions
 *
 * @example
 * ```typescript
 * const task = createTask(scope)
 *
 * // Light execution
 * const value = task.effect(() => computedValue)
 *
 * // Heavy execution
 * const result = await task.run(async (ctx) => {
 *   return processData(ctx.signal)
 * })
 * ```
 *
 * @see {@link docs/engine-semantics.md#dual-execution-api}
 */
export function createTask(scope: Scope): TaskFactory {
  return {
    effect: <T>(fn: () => T | Promise<T>) => scope.effect(fn),
    run: <T>(
      fn: (ctx: TaskContext) => Promise<T>,
      options?: TaskRunOptions
    ) => scope.run(fn, options),
  }
}

/**
 * Task factory interface.
 */
export interface TaskFactory {
  /**
   * Light path execution — direct, no worker overhead.
   */
  effect: <T>(fn: () => T | Promise<T>) => T | Promise<T>

  /**
   * Heavy path execution — uses WorkerPool.
   */
  run: <T>(
    fn: (ctx: TaskContext) => Promise<T>,
    options?: TaskRunOptions
  ) => Promise<T>
}

// Re-export types for convenience
export type { AuthorityConfig } from '../core/Authority'
export type { ScopeConfig, ScopeEngineConfig } from '../scope/Scope'
export type { TaskContext, TaskRunOptions } from '../task/Task'

