import type { Store } from '@sthira/core';
import { createContext, useContext, type ReactNode } from 'react';

/**
 * Store context for dependency injection
 */
const StoreContext = createContext<Map<string, Store<object, object>> | null>(null);

/**
 * Provider props
 */
export interface StoreProviderProps {
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
export function StoreProvider({ stores, children }: StoreProviderProps): ReactNode {
  // Create a map of stores by name
  const storeMap = new Map<string, Store<object, object>>();
  for (const store of stores) {
    storeMap.set(store.name, store);
  }

  return <StoreContext.Provider value={storeMap}>{children}</StoreContext.Provider>;
}

/**
 * useStoreContext - Get a store from context by name
 *
 * @example
 * ```tsx
 * const userStore = useStoreContext<UserState, UserActions>('user')
 * ```
 */
export function useStoreContext<TState extends object, TActions extends object>(
  name: string,
): Store<TState, TActions> {
  const storeMap = useContext(StoreContext);

  if (!storeMap) {
    throw new Error(
      `[Sthira] useStoreContext must be used within a StoreProvider. ` +
        `Make sure to wrap your app with <StoreProvider stores={[...]}>.`,
    );
  }

  const store = storeMap.get(name);

  if (!store) {
    throw new Error(
      `[Sthira] Store "${name}" not found in context. ` +
        `Available stores: ${Array.from(storeMap.keys()).join(', ')}`,
    );
  }

  return store as Store<TState, TActions>;
}

/**
 * Check if running in StoreProvider context
 */
export function useHasStoreContext(): boolean {
  const storeMap = useContext(StoreContext);
  return storeMap !== null;
}
