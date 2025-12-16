'use strict';

var react = require('react');
var jsxRuntime = require('react/jsx-runtime');

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
  const state = react.useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
    // SSR fallback
  );
  return react.useMemo(
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
  const selectorRef = react.useRef(selector);
  const equalityFnRef = react.useRef(equalityFn);
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;
  const prevSelectedRef = react.useRef(void 0);
  const getSnapshot = react.useCallback(() => {
    const state = store.getState();
    const nextSelected = selectorRef.current(state);
    if (prevSelectedRef.current !== void 0 && equalityFnRef.current(prevSelectedRef.current, nextSelected)) {
      return prevSelectedRef.current;
    }
    prevSelectedRef.current = nextSelected;
    return nextSelected;
  }, [store]);
  const subscribe = react.useCallback(
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
  return react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
function useStoreState(store) {
  return react.useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
function useStoreActions(store) {
  return store.actions;
}
function useComputed(store) {
  react.useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return store.getComputed();
}
var StoreContext = react.createContext(null);
function StoreProvider({ stores, children }) {
  const storeMap = /* @__PURE__ */ new Map();
  for (const store of stores) {
    storeMap.set(store.name, store);
  }
  return /* @__PURE__ */ jsxRuntime.jsx(StoreContext.Provider, { value: storeMap, children });
}
function useStoreContext(name) {
  const storeMap = react.useContext(StoreContext);
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
  const storeMap = react.useContext(StoreContext);
  return storeMap !== null;
}

exports.StoreProvider = StoreProvider;
exports.shallowEqual = shallowEqual;
exports.useComputed = useComputed;
exports.useHasStoreContext = useHasStoreContext;
exports.useSelector = useSelector;
exports.useStore = useStore;
exports.useStoreActions = useStoreActions;
exports.useStoreContext = useStoreContext;
exports.useStoreState = useStoreState;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map