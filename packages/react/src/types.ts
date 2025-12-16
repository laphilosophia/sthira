import type { Store } from '@sthira/core'

/**
 * Extract state type from store
 */
export type ExtractState<S> = S extends Store<infer TState, object> ? TState : never

/**
 * Extract actions type from store
 */
export type ExtractActions<S> = S extends Store<object, infer TActions> ? TActions : never

/**
 * Selector function type
 */
export type Selector<TState, TResult> = (state: TState) => TResult

/**
 * Equality function type
 */
export type EqualityFn<T> = (a: T, b: T) => boolean

/**
 * UseStore return type - state + actions
 */
export type UseStoreReturn<TState extends object, TActions extends object> = TState &
  TActions & {
    getState: () => TState
    subscribe: (listener: (state: TState, prevState: TState) => void) => () => void
  }

/**
 * UseSelector options
 */
export interface UseSelectorOptions<T> {
  /** Custom equality function */
  equalityFn?: EqualityFn<T>
}
