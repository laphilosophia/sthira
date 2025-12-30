import { WorkerPool, type WorkerPoolConfig } from '../engine/WorkerPool'
import { Scope, type ScopeConfig } from '../scope/Scope'
import type { ScopeID } from '../types'

/**
 * Authority engine configuration.
 */
export interface AuthorityEngineConfig {
  /** Default number of workers */
  readonly defaultWorkers?: number
  /** Maximum number of workers */
  readonly maxWorkers?: number
  /** Worker idle timeout (ms) */
  readonly idleTimeout?: number
}

/**
 * Authority configuration.
 */
export interface AuthorityConfig {
  /** Engine configuration */
  readonly engine?: AuthorityEngineConfig
}

/**
 * Authority - Global execution governor.
 *
 * Role: **God** — System-wide rules, mediator, worker pool
 *
 * Authority:
 * - Singleton per runtime
 * - Owns WorkerPool
 * - Manages scope registry
 * - Enforces global policies
 * - Mediator for cross-scope communication
 *
 * @see {@link docs/architecture-foundation.md#authority}
 * @see {@link docs/execution-semantics.md#authority}
 */
export class Authority {
  private readonly _workerPool: WorkerPool
  private readonly _scopes = new Map<ScopeID, Scope>()
  private _disposed = false

  /**
   * Create a new Authority.
   *
   * @param config - Authority configuration
   */
  constructor(config: AuthorityConfig = {}) {
    const engineConfig = config.engine ?? {}

    const poolConfig: WorkerPoolConfig = {
      defaultWorkers: engineConfig.defaultWorkers ?? 1,
      maxWorkers: engineConfig.maxWorkers ?? (
        typeof navigator !== 'undefined'
          ? navigator.hardwareConcurrency ?? 4
          : 4
      ),
    }

    if (engineConfig.idleTimeout !== undefined) {
      (poolConfig as { idleTimeout?: number }).idleTimeout = engineConfig.idleTimeout
    }

    this._workerPool = new WorkerPool(poolConfig)
  }

  /**
   * Check if authority is disposed.
   */
  get isDisposed(): boolean {
    return this._disposed
  }

  /**
   * Number of registered scopes.
   */
  get scopeCount(): number {
    return this._scopes.size
  }

  /**
   * Worker pool size.
   */
  get workerPoolSize(): number {
    return this._workerPool.size
  }

  /**
   * Number of idle workers.
   */
  get idleWorkerCount(): number {
    return this._workerPool.idleCount
  }

  /**
   * Number of busy workers.
   */
  get busyWorkerCount(): number {
    return this._workerPool.busyCount
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCOPE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create and register a scope.
   *
   * @param config - Scope configuration
   * @returns Created scope
   * @throws If scope with same id already exists
   */
  createScope(config: ScopeConfig): Scope {
    if (this._disposed) {
      throw new Error('Authority is disposed')
    }

    if (this._scopes.has(config.id)) {
      throw new Error(`Scope "${config.id}" already exists`)
    }

    // Scale worker pool if scope requests more workers
    if (config.engine?.workers) {
      const currentSize = this._workerPool.size
      if (config.engine.workers > currentSize) {
        this._workerPool.scale(config.engine.workers)
      }
    }

    const scope = new Scope(config, this._workerPool)
    this._scopes.set(config.id, scope)

    return scope
  }

  /**
   * Get a scope by id.
   */
  getScope(id: ScopeID): Scope | undefined {
    return this._scopes.get(id)
  }

  /**
   * Check if scope exists.
   */
  hasScope(id: ScopeID): boolean {
    return this._scopes.has(id)
  }

  /**
   * Remove a scope from registry.
   *
   * Note: This does NOT dispose the scope.
   */
  unregisterScope(id: ScopeID): boolean {
    return this._scopes.delete(id)
  }

  /**
   * Get all scope ids.
   */
  getScopeIds(): ScopeID[] {
    return Array.from(this._scopes.keys())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-SCOPE COMMUNICATION (Mediator)
  // ═══════════════════════════════════════════════════════════════════════════

  private readonly _listeners = new Map<string, Set<(data: unknown) => void>>()

  /**
   * Subscribe to a broadcast channel.
   *
   * @param channel - Channel name
   * @param listener - Listener function
   * @returns Unsubscribe function
   */
  subscribe(channel: string, listener: (data: unknown) => void): () => void {
    if (!this._listeners.has(channel)) {
      this._listeners.set(channel, new Set())
    }

    this._listeners.get(channel)!.add(listener)

    return () => {
      this._listeners.get(channel)?.delete(listener)
    }
  }

  /**
   * Broadcast to all listeners on a channel.
   *
   * @param channel - Channel name
   * @param data - Data to broadcast
   */
  broadcast(channel: string, data: unknown): void {
    const listeners = this._listeners.get(channel)
    if (listeners) {
      for (const listener of listeners) {
        listener(data)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Dispose authority and all resources.
   *
   * Disposes all scopes and worker pool.
   */
  dispose(): void {
    if (this._disposed) {
      return
    }

    this._disposed = true

    // Dispose all scopes
    for (const scope of this._scopes.values()) {
      scope.dispose()
    }
    this._scopes.clear()

    // Clear listeners
    this._listeners.clear()

    // Dispose worker pool
    this._workerPool.dispose()
  }
}
