import { Store } from '@sthirajs/core';
import { ReactNode } from 'react';

/**
 * Extract state type from store
 */
type ExtractState<S> = S extends Store<infer TState, object> ? TState : never;
/**
 * Extract actions type from store
 */
type ExtractActions<S> = S extends Store<object, infer TActions> ? TActions : never;
/**
 * Selector function type
 */
type Selector<TState, TResult> = (state: TState) => TResult;
/**
 * Equality function type
 */
type EqualityFn<T> = (a: T, b: T) => boolean;
/**
 * UseStore return type - state + actions
 */
type UseStoreReturn<TState extends object, TActions extends object> = TState & TActions & {
    getState: () => TState;
    subscribe: (listener: (state: TState, prevState: TState) => void) => () => void;
};
/**
 * UseSelector options
 */
interface UseSelectorOptions<T> {
    /** Custom equality function */
    equalityFn?: EqualityFn<T>;
}

/**
 * Shallow equality for objects
 */
declare function shallowEqual<T>(a: T, b: T): boolean;
/**
 * useStore - Subscribe to entire store state and actions
 *
 * @example
 * ```tsx
 * const { count, increment } = useStore(counterStore)
 * ```
 */
declare function useStore<TState extends object, TActions extends object>(store: Store<TState, TActions>): UseStoreReturn<TState, TActions>;
/**
 * useSelector - Subscribe to a selected slice of state
 *
 * @example
 * ```tsx
 * const count = useSelector(store, (state) => state.count)
 * const user = useSelector(store, (state) => state.user, shallowEqual)
 * ```
 */
declare function useSelector<TState extends object, TActions extends object, TResult>(store: Store<TState, TActions>, selector: Selector<TState, TResult>, equalityFn?: EqualityFn<TResult>): TResult;
/**
 * useStoreState - Subscribe to state only (no actions)
 *
 * @example
 * ```tsx
 * const state = useStoreState(store)
 * ```
 */
declare function useStoreState<TState extends object, TActions extends object>(store: Store<TState, TActions>): TState;
/**
 * useStoreActions - Get actions only (no subscription)
 *
 * @example
 * ```tsx
 * const { increment, decrement } = useStoreActions(counterStore)
 * ```
 */
declare function useStoreActions<TState extends object, TActions extends object>(store: Store<TState, TActions>): TActions;
/**
 * useComputed - Subscribe to computed values
 *
 * @example
 * ```tsx
 * const computed = useComputed(store)
 * console.log(computed.doubled)
 * ```
 */
declare function useComputed<TState extends object, TActions extends object>(store: Store<TState, TActions>): Record<string, unknown>;

/**
 * Provider props
 */
interface StoreProviderProps {
    /** Store instances to provide */
    stores: Store<object, object>[];
    /** Child components */
    children: ReactNode;
}
/**
 * StoreProvider - Provide stores via React context
 *
 * @example
 * ```tsx
 * <StoreProvider stores={[userStore, appStore]}>
 *   <App />
 * </StoreProvider>
 * ```
 */
declare function StoreProvider({ stores, children }: StoreProviderProps): ReactNode;
/**
 * useStoreContext - Get a store from context by name
 *
 * @example
 * ```tsx
 * const userStore = useStoreContext<UserState, UserActions>('user')
 * ```
 */
declare function useStoreContext<TState extends object, TActions extends object>(name: string): Store<TState, TActions>;
/**
 * Check if running in StoreProvider context
 */
declare function useHasStoreContext(): boolean;

export { type EqualityFn, type ExtractActions, type ExtractState, type Selector, StoreProvider, type StoreProviderProps, type UseSelectorOptions, type UseStoreReturn, shallowEqual, useComputed, useHasStoreContext, useSelector, useStore, useStoreActions, useStoreContext, useStoreState };
