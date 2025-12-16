import { createContext, useSyncExternalStore, useMemo, useRef, useCallback, useContext } from 'react';
import { jsx } from 'react/jsx-runtime';

// src/hooks.ts
function defaultEquality(a, b) {
  return Object.is(a, b);
}
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null) return false;
  if (typeof b !== "object" || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}
function useStore(store) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
    // SSR fallback
  );
  return useMemo(
    () => ({
      ...state,
      ...store.actions,
      getState: store.getState,
      subscribe: store.subscribe
    }),
    [state, store.actions, store.getState, store.subscribe]
  );
}
function useSelector(store, selector, equalityFn = defaultEquality) {
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;
  const prevSelectedRef = useRef(void 0);
  const getSnapshot = useCallback(() => {
    const state = store.getState();
    const nextSelected = selectorRef.current(state);
    if (prevSelectedRef.current !== void 0 && equalityFnRef.current(prevSelectedRef.current, nextSelected)) {
      return prevSelectedRef.current;
    }
    prevSelectedRef.current = nextSelected;
    return nextSelected;
  }, [store]);
  const subscribe = useCallback(
    (onStoreChange) => {
      return store.subscribe((state, prevState) => {
        const nextSelected = selectorRef.current(state);
        const prevSelected = selectorRef.current(prevState);
        if (!equalityFnRef.current(nextSelected, prevSelected)) {
          onStoreChange();
        }
      });
    },
    [store]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
function useStoreState(store) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
function useStoreActions(store) {
  return store.actions;
}
function useComputed(store) {
  useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return store.getComputed();
}
var StoreContext = createContext(null);
function StoreProvider({ stores, children }) {
  const storeMap = /* @__PURE__ */ new Map();
  for (const store of stores) {
    storeMap.set(store.name, store);
  }
  return /* @__PURE__ */ jsx(StoreContext.Provider, { value: storeMap, children });
}
function useStoreContext(name) {
  const storeMap = useContext(StoreContext);
  if (!storeMap) {
    throw new Error(
      `[Sthira] useStoreContext must be used within a StoreProvider. Make sure to wrap your app with <StoreProvider stores={[...]}>.`
    );
  }
  const store = storeMap.get(name);
  if (!store) {
    throw new Error(
      `[Sthira] Store "${name}" not found in context. Available stores: ${Array.from(storeMap.keys()).join(", ")}`
    );
  }
  return store;
}
function useHasStoreContext() {
  const storeMap = useContext(StoreContext);
  return storeMap !== null;
}

export { StoreProvider, shallowEqual, useComputed, useHasStoreContext, useSelector, useStore, useStoreActions, useStoreContext, useStoreState };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map