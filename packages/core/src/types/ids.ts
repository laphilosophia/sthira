/**
 * Unique identifier for a Scope (execution namespace).
 *
 * @see {@link docs/execution-semantics.md#scope}
 */
export type ScopeID = string

/**
 * Immutable execution symbol.
 * Carries no payload, no cursor, no data.
 * Functions as a unique execution identifier.
 *
 * If a ref changes, execution context changes.
 *
 * @see {@link docs/execution-semantics.md#ref}
 */
export type Ref = string

/**
 * Unique identifier for an execution request.
 */
export type RequestID = string

/**
 * Unique identifier for a Worker.
 *
 * @see {@link docs/worker-lifecycle.md}
 */
export type WorkerID = string

/**
 * Unique identifier for a Handler.
 *
 * @see {@link docs/execution-semantics.md#handler}
 */
export type HandlerID = string

/**
 * Unique identifier for a Stream.
 *
 * @see {@link docs/execution-semantics.md#stream}
 */
export type StreamID = string
