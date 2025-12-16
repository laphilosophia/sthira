import type { Store } from '@sthira/core'
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import type { EqualityFn, Selector, UseStoreReturn } from './types'

/**
 * Default shallow equality check
 */
function defaultEquality<T>(a: T, b: T): boolean {
  return Object.is(a, b)
}

/**
 * Shallow equality for objects
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null) return false
  if (typeof b !== 'object' || b === null) return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    ) {
      return false
    }
  }

  return true
}

/**
 * useStore - Subscribe to entire store state and actions
 *
 * @example
 * ```tsx
 * const { count, increment } = useStore(counterStore)
 * ```
 */
export function useStore<TState extends object, TActions extends object>(
  store: Store<TState, TActions>
): UseStoreReturn<TState, TActions> {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState // SSR fallback
  )

  // Memoize the combined return value
  return useMemo(
    () => ({
      ...state,
      ...store.actions,
      getState: store.getState,
      subscribe: store.subscribe,
    }),
    [state, store.actions, store.getState, store.subscribe]
  )
}

/**
 * useSelector - Subscribe to a selected slice of state
 *
 * @example
 * ```tsx
 * const count = useSelector(store, (state) => state.count)
 * const user = useSelector(store, (state) => state.user, shallowEqual)
 * ```
 */
export function useSelector<TState extends object, TActions extends object, TResult>(
  store: Store<TState, TActions>,
  selector: Selector<TState, TResult>,
  equalityFn: EqualityFn<TResult> = defaultEquality
): TResult {
  // Keep refs for selector and equality function to avoid re-subscriptions
  const selectorRef = useRef(selector)
  const equalityFnRef = useRef(equalityFn)

  // Update refs on each render
  selectorRef.current = selector
  equalityFnRef.current = equalityFn

  // Keep track of the previous selected value
  const prevSelectedRef = useRef<TResult | undefined>(undefined)

  // Create stable getSnapshot function
  const getSnapshot = useCallback((): TResult => {
    const state = store.getState()
    const nextSelected = selectorRef.current(state)

    // If we have a previous value and it's equal, return the previous one
    // This maintains referential equality for React's bailout optimization
    if (
      prevSelectedRef.current !== undefined &&
      equalityFnRef.current(prevSelectedRef.current, nextSelected)
    ) {
      return prevSelectedRef.current
    }

    prevSelectedRef.current = nextSelected
    return nextSelected
  }, [store])

  // Subscribe with a wrapper that checks equality
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return store.subscribe((state, prevState) => {
        const nextSelected = selectorRef.current(state)
        const prevSelected = selectorRef.current(prevState)

        // Only trigger re-render if selected value changed
        if (!equalityFnRef.current(nextSelected, prevSelected)) {
          onStoreChange()
        }
      })
    },
    [store]
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * useStoreState - Subscribe to state only (no actions)
 *
 * @example
 * ```tsx
 * const state = useStoreState(store)
 * ```
 */
export function useStoreState<TState extends object, TActions extends object>(
  store: Store<TState, TActions>
): TState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

/**
 * useStoreActions - Get actions only (no subscription)
 *
 * @example
 * ```tsx
 * const { increment, decrement } = useStoreActions(counterStore)
 * ```
 */
export function useStoreActions<TState extends object, TActions extends object>(
  store: Store<TState, TActions>
): TActions {
  // Actions are stable, no need for subscription
  return store.actions
}

/**
 * useComputed - Subscribe to computed values
 *
 * @example
 * ```tsx
 * const computed = useComputed(store)
 * console.log(computed.doubled)
 * ```
 */
export function useComputed<TState extends object, TActions extends object>(
  store: Store<TState, TActions>
): Record<string, unknown> {
  // Subscribe to state changes which invalidate computed
  useSyncExternalStore(store.subscribe, store.getState, store.getState)

  // Return computed values
  return store.getComputed()
}
