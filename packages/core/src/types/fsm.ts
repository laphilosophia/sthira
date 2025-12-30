/**
 * Scope FSM states.
 *
 * @see {@link docs/execution-semantics.md#task-lifecycle-fsm}
 */
export type FSMState =
  | 'INIT'
  | 'ATTACHED'
  | 'RUNNING'
  | 'SUSPENDED'
  | 'DISPOSING'
  | 'DISPOSED'

/**
 * Events that trigger FSM transitions.
 *
 * @see {@link docs/execution-semantics.md#task-lifecycle-fsm}
 */
export type FSMEvent =
  | 'mounted'
  | 'taskStarted'
  | 'suspend'
  | 'resume'
  | 'dispose'
