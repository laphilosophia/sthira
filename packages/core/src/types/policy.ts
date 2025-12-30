/**
 * Global authority policies.
 *
 * @see {@link docs/execution-semantics.md#authority}
 */
export interface GlobalPolicy {
  /** Maximum concurrent tasks across all scopes */
  readonly maxConcurrentTasks: number
  /** Maximum task spawns per scope */
  readonly maxTaskSpawn: number
  /** Default timeout in milliseconds */
  readonly timeout: number
  /** Default retry count */
  readonly retry: number
}

/**
 * Scope-level policy overrides.
 *
 * @see {@link docs/execution-semantics.md#scope}
 */
export interface ScopePolicy {
  /** Override retry count */
  readonly retry?: number
  /** Override timeout */
  readonly timeout?: number
}

/**
 * Authority configuration.
 */
export interface AuthorityConfig {
  /** Authority name */
  readonly name: string
  /** Global policies */
  readonly policies: GlobalPolicy
}

/**
 * Scope configuration.
 */
export interface ScopeConfig {
  /** Scope identifier */
  readonly name: string
  /** Optional policy overrides */
  readonly policies?: ScopePolicy
}
