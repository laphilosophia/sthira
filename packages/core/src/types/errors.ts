/**
 * Base error class for Sthira runtime errors.
 *
 * @see {@link docs/failure-taxonomy.md}
 */
export class SthiraError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SthiraError'
  }
}

/**
 * Thrown when a scope is not found in the registry.
 *
 * @see {@link docs/failure-taxonomy.md#lifecycle-failures}
 */
export class ScopeNotFoundError extends SthiraError {
  readonly scopeId: string

  constructor(scopeId: string) {
    super(`Scope "${scopeId}" not found. Ensure createScope was called first.`)
    this.name = 'ScopeNotFoundError'
    this.scopeId = scopeId
  }
}

/**
 * Thrown when attempting execution on a disposed or inactive scope.
 *
 * @see {@link docs/failure-taxonomy.md#lifecycle-failures}
 */
export class ScopeInactiveError extends SthiraError {
  readonly scopeId: string

  constructor(scopeId: string) {
    super(`Scope "${scopeId}" is disposed or inactive.`)
    this.name = 'ScopeInactiveError'
    this.scopeId = scopeId
  }
}

/**
 * Thrown when execution is rejected due to policy limits.
 *
 * @see {@link docs/failure-taxonomy.md#policy-failures}
 */
export class ExecutionRejectedError extends SthiraError {
  readonly reason: string

  constructor(reason: string) {
    super(`Execution rejected: ${reason}`)
    this.name = 'ExecutionRejectedError'
    this.reason = reason
  }
}

/**
 * Thrown when execution times out.
 *
 * @see {@link docs/failure-taxonomy.md#policy-failures}
 */
export class ExecutionTimeoutError extends SthiraError {
  readonly timeout: number

  constructor(timeout: number) {
    super(`Execution timed out after ${timeout}ms`)
    this.name = 'ExecutionTimeoutError'
    this.timeout = timeout
  }
}

/**
 * Thrown when Authority is not initialized.
 *
 * @see {@link docs/failure-taxonomy.md#developer-errors}
 */
export class AuthorityNotInitializedError extends SthiraError {
  constructor() {
    super('Authority not initialized. Call createAuthority first.')
    this.name = 'AuthorityNotInitializedError'
  }
}

/**
 * Thrown when attempting to create duplicate Authority.
 *
 * @see {@link docs/failure-taxonomy.md#developer-errors}
 */
export class AuthorityAlreadyExistsError extends SthiraError {
  constructor() {
    super(
      'Authority already exists. Only one Authority per runtime is allowed.'
    )
    this.name = 'AuthorityAlreadyExistsError'
  }
}
