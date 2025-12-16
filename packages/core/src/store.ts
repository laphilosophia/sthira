import { ComputedManager } from './computed'
import { createEventBus, StoreEvents } from './events'
import { InterceptorsManager } from './interceptors'
import { getAllPlugins, resolvePlugins } from './plugins'
import { SubscriptionManager } from './proxy'
import { createPerformanceUtils } from './scheduler'
import { SchemaValidator } from './schema'
import type {
  ComputedDefinitions,
  DevToolsApi,
  DevToolsPluginConfig,
  GetState,
  Listener,
  PersistApi,
  PersistPluginConfig,
  SetState,
  Store,
  StoreConfig,
  SyncApi,
  SyncPluginConfig,
  Unsubscribe,
} from './types'

// ============================================================================
// Conditional Return Type
// ============================================================================

/**
 * Infer return type based on config
 */
type StoreReturn<
  TState extends object,
  TActions extends object,
  TConfig extends StoreConfig<TState, TActions>
> = Store<TState, TActions> &
  TActions &
  (TConfig['persist'] extends PersistPluginConfig | true ? { persist: PersistApi } : object) &
  (TConfig['sync'] extends SyncPluginConfig | string | true ? { sync: SyncApi } : object) &
  (TConfig['devtools'] extends DevToolsPluginConfig | true ? { devtools: DevToolsApi } : object)

// ============================================================================
// Store Factory
// ============================================================================

/**
 * Create a new store with v2 plugin architecture
 */
export function createStore<
  TState extends object,
  TActions extends object = object,
  TConfig extends StoreConfig<TState, TActions> = StoreConfig<TState, TActions>
>(config: TConfig): StoreReturn<TState, TActions, TConfig> {
  const {
    name,
    schema,
    state: initialStateOrFactory,
    computed: computedDefs,
    actions: actionsFactory,
    interceptors,
    performance,
  } = config

  // Initialize state
  const initialState =
    typeof initialStateOrFactory === 'function'
      ? (initialStateOrFactory as () => TState)()
      : initialStateOrFactory

  // Validate initial state (schema is now optional)
  const validator = new SchemaValidator(schema)
  const validatedInitialState = validator.validate(initialState)

  // Create managers
  const subscriptionManager = new SubscriptionManager<TState>()
  const interceptorsManager = new InterceptorsManager<TState>(interceptors)
  const eventBus = createEventBus()
  const perfUtils = createPerformanceUtils(performance)

  // Internal state
  let currentState: TState = { ...validatedInitialState }

  // Computed manager
  const computedManager = new ComputedManager<TState>(
    computedDefs as ComputedDefinitions<TState>,
    () => currentState
  )

  /**
   * Get current state
   */
  const getState: GetState<TState> = () => currentState

  /**
   * Set state
   */
  const setState: SetState<TState> = (partial, options = {}) => {
    const { skipInterceptors = false, silent = false } = options

    // Calculate new partial
    let newPartial: Partial<TState> =
      typeof partial === 'function' ? partial(currentState) : partial

    // Apply beforeSet interceptor
    if (!skipInterceptors) {
      newPartial = interceptorsManager.beforeSet(null, newPartial, currentState)
    }

    // Validate partial
    try {
      validator.validatePartial(newPartial)
    } catch (error) {
      interceptorsManager.handleError(error as Error, {
        action: 'setState',
        state: currentState,
        error: error as Error,
      })
      return
    }

    // Store previous state
    const prevState = currentState

    // Merge state
    currentState = { ...currentState, ...newPartial }

    // Invalidate computed values
    computedManager.invalidateAll()

    // Notify subscribers
    if (!silent) {
      subscriptionManager.notify(currentState, prevState)
    }

    // Apply afterSet interceptor
    if (!skipInterceptors) {
      interceptorsManager.afterSet(null, newPartial, currentState)
    }

    // Emit state change event
    eventBus.emit(StoreEvents.STATE_CHANGE, {
      current: currentState,
      previous: prevState,
      partial: newPartial,
    })
  }

  /**
   * Subscribe to state changes
   */
  const subscribe = (listener: Listener<TState>): Unsubscribe => {
    return subscriptionManager.subscribe(listener)
  }

  /**
   * Get computed values
   */
  const getComputed = () => computedManager.getAll()

  // Create actions
  const actions = actionsFactory ? actionsFactory(setState, getState) : ({} as TActions)

  // Base store (created before plugins for circular reference)
  const store: Store<TState, TActions> = {
    name,
    getState,
    setState,
    subscribe,
    getComputed,
    actions,
    destroy: async () => {}, // Placeholder, replaced below
    events: eventBus,
    perf: perfUtils,
  }

  // Resolve v2 declarative plugins
  const resolvedPlugins = resolvePlugins(config, store)
  const allPlugins = getAllPlugins(resolvedPlugins)

  /**
   * Destroy store
   */
  store.destroy = async () => {
    // Call plugin onDestroy
    for (const plugin of allPlugins) {
      await plugin.onDestroy?.(store)
    }

    // Clear subscribers
    subscriptionManager.clear()

    // Emit destroy event
    eventBus.emit(StoreEvents.DESTROY, { name })
  }

  // Apply plugin extensions
  for (const plugin of allPlugins) {
    const extensions = plugin.extend?.(store)
    if (extensions) {
      Object.assign(store, extensions)
    }
  }

  // Initialize plugins
  for (const plugin of allPlugins) {
    plugin.onInit?.(store)
  }

  // Return store with actions spread for convenience
  return { ...store, ...actions } as StoreReturn<TState, TActions, TConfig>
}

/**
 * Create a selector function with memoization
 */
export function createSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn: (a: TResult, b: TResult) => boolean = Object.is
): (state: TState) => TResult {
  let lastState: TState | undefined
  let lastResult: TResult | undefined

  return (state: TState): TResult => {
    if (lastState === state) {
      return lastResult as TResult
    }

    const result = selector(state)

    if (lastResult !== undefined && equalityFn(lastResult, result)) {
      return lastResult
    }

    lastState = state
    lastResult = result
    return result
  }
}

/**
 * Shallow equality check for objects
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
