import type { FSMEvent, FSMState } from '../types'

/**
 * Scope Finite State Machine.
 *
 * FSM is the **sole execution gate**.
 * No execution bypass is allowed.
 *
 * States:
 * - INIT: declared, not yet active
 * - ATTACHED: ref bound into namespace
 * - RUNNING: execution permitted
 * - SUSPENDED: execution paused
 * - DISPOSING: shutdown initiated
 * - DISPOSED: terminal state
 *
 * @see {@link docs/execution-semantics.md#task-lifecycle-fsm}
 * @see {@link docs/implementation.md#scopefsm}
 */
export class ScopeFSM {
  private _state: FSMState = 'INIT'

  /**
   * Current FSM state.
   */
  get state(): FSMState {
    return this._state
  }

  /**
   * Attempt a state transition.
   *
   * @param event - The event triggering the transition
   * @returns true if transition occurred, false otherwise
   *
   * @see {@link docs/execution-semantics.md#task-lifecycle-fsm}
   */
  transition(event: FSMEvent): boolean {
    const prev = this._state

    switch (this._state) {
      case 'INIT':
        if (event === 'mounted') {
          this._state = 'ATTACHED'
        }
        break

      case 'ATTACHED':
        if (event === 'taskStarted') {
          this._state = 'RUNNING'
        }
        if (event === 'dispose') {
          this._state = 'DISPOSING'
        }
        break

      case 'RUNNING':
        if (event === 'suspend') {
          this._state = 'SUSPENDED'
        }
        if (event === 'dispose') {
          this._state = 'DISPOSING'
        }
        break

      case 'SUSPENDED':
        if (event === 'resume') {
          this._state = 'RUNNING'
        }
        if (event === 'dispose') {
          this._state = 'DISPOSING'
        }
        break

      case 'DISPOSING':
        // Auto-transition to DISPOSED
        this._state = 'DISPOSED'
        break

      case 'DISPOSED':
        // Terminal state — no transitions allowed
        break
    }

    return this._state !== prev
  }

  /**
   * Check if execution is allowed.
   *
   * Execution is permitted only in ATTACHED or RUNNING states.
   *
   * @see {@link docs/execution-semantics.md#state-semantics}
   */
  canExecute(): boolean {
    return this._state === 'ATTACHED' || this._state === 'RUNNING'
  }

  /**
   * Check if scope is still alive.
   *
   * Returns false if scope is disposing or disposed.
   *
   * @see {@link docs/execution-activation.md#authorization-logic}
   */
  isAlive(): boolean {
    return this._state !== 'DISPOSING' && this._state !== 'DISPOSED'
  }
}
