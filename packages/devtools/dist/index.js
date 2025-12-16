// src/plugin.ts
function getDevToolsExtension() {
  if (typeof window === "undefined") return void 0;
  const w = window;
  return w.__REDUX_DEVTOOLS_EXTENSION__;
}
function isDevToolsAvailable() {
  return getDevToolsExtension() !== void 0;
}
function createDevToolsPlugin(config = {}) {
  const {
    maxAge = 50,
    features = {
      pause: true,
      lock: false,
      export: true,
      import: true,
      jump: true,
      skip: false,
      reorder: false,
      persist: true,
      dispatch: false,
      test: false
    }
  } = config;
  let store = null;
  let connection = null;
  let actionId = 0;
  const history = [];
  let isConnected = false;
  let isPaused = false;
  let unsubscribe = null;
  let storeName = "";
  function handleMessage(message) {
    if (!store) return;
    if (message.type === "DISPATCH" && message.payload) {
      switch (message.payload.type) {
        case "JUMP_TO_ACTION":
        case "JUMP_TO_STATE": {
          const idx = message.payload.actionId ?? message.payload.index;
          if (typeof idx === "number") api.jumpTo(idx);
          break;
        }
        case "RESET":
          api.clearHistory();
          break;
        case "COMMIT":
          connection?.init(store.getState());
          break;
        case "ROLLBACK":
          if (message.state) {
            try {
              store.setState(JSON.parse(message.state), { silent: true });
            } catch {
            }
          }
          break;
        case "IMPORT_STATE":
          if (message.payload.nextLiftedState) {
            const liftedState = message.payload.nextLiftedState;
            const state = liftedState.computedStates?.slice(-1)?.[0]?.state;
            if (state) store.setState(state, { silent: true });
          }
          break;
        case "PAUSE_RECORDING":
          isPaused = !isPaused;
          break;
      }
    }
  }
  const api = {
    connect: () => {
      if (!store) return;
      const extension = getDevToolsExtension();
      if (!extension) {
        console.warn("[Sthira DevTools] Redux DevTools Extension not found");
        return;
      }
      connection = extension.connect({ name: storeName, maxAge, features });
      connection.init(store.getState());
      connection.subscribe(handleMessage);
      unsubscribe = store.subscribe((state, prevState) => {
        if (isPaused) return;
        const entry = {
          id: ++actionId,
          type: "setState",
          timestamp: Date.now(),
          prevState,
          nextState: state
        };
        history.push(entry);
        while (history.length > maxAge) history.shift();
        connection?.send({ type: entry.type }, state);
      });
      isConnected = true;
      console.info(`[Sthira DevTools] Connected: ${storeName}`);
    },
    disconnect: () => {
      connection?.unsubscribe();
      connection = null;
      unsubscribe?.();
      isConnected = false;
    },
    logAction: (type, payload) => {
      if (!store || !isConnected || isPaused) return;
      const state = store.getState();
      const entry = {
        id: ++actionId,
        type,
        payload,
        timestamp: Date.now(),
        prevState: state,
        nextState: state
      };
      history.push(entry);
      connection?.send({ type, ...payload || {} }, state);
    },
    getHistory: () => [...history],
    clearHistory: () => {
      history.length = 0;
      actionId = 0;
      if (store) connection?.init(store.getState());
    },
    jumpTo: (targetId) => {
      const entry = history.find((e) => e.id === targetId);
      if (entry && store) {
        store.setState(entry.nextState, { silent: true });
      }
    },
    exportState: () => JSON.stringify({
      state: store?.getState(),
      history,
      timestamp: Date.now()
    }),
    importState: (json) => {
      try {
        const data = JSON.parse(json);
        if (data.state && store) store.setState(data.state);
      } catch (error) {
        console.error("[Sthira DevTools] Failed to import:", error);
      }
    },
    getStatus: () => ({ connected: isConnected })
  };
  const plugin = {
    name: "devtools",
    version: "1.0.0",
    onInit: (s) => {
      store = s;
      storeName = config.name ?? store.name;
      api.connect();
    },
    onDestroy: () => {
      api.disconnect();
    },
    extend: () => ({ devtools: api })
  };
  return Object.assign(plugin, { api });
}

// src/inspector.ts
var StoreInspector = class {
  store;
  stateHistory = [];
  maxHistory;
  constructor(store, maxHistory = 100) {
    this.store = store;
    this.maxHistory = maxHistory;
    this.startTracking();
  }
  /**
   * Start tracking state changes
   */
  startTracking() {
    this.store.subscribe((state) => {
      this.stateHistory.push({
        state: structuredClone(state),
        timestamp: Date.now()
      });
      while (this.stateHistory.length > this.maxHistory) {
        this.stateHistory.shift();
      }
    });
  }
  /**
   * Get current inspected state
   */
  inspect() {
    return {
      state: this.store.getState(),
      computed: this.store.computed,
      subscribers: 0,
      // Would need exposure from core
      actions: Object.keys(this.store.actions)
    };
  }
  /**
   * Get state history
   */
  getHistory() {
    return [...this.stateHistory];
  }
  /**
   * Get state at specific time
   */
  getStateAt(timestamp) {
    for (let i = this.stateHistory.length - 1; i >= 0; i--) {
      const entry = this.stateHistory[i];
      if (entry && entry.timestamp <= timestamp) {
        return entry.state;
      }
    }
    return void 0;
  }
  /**
   * Compare two states and get diff
   */
  diff(oldState, newState) {
    const diffs = [];
    this.diffRecursive(oldState, newState, [], diffs);
    return diffs;
  }
  /**
   * Recursive diff helper
   */
  diffRecursive(oldVal, newVal, path, diffs) {
    if (oldVal === newVal) return;
    if (typeof oldVal !== "object" || typeof newVal !== "object" || oldVal === null || newVal === null || Array.isArray(oldVal) !== Array.isArray(newVal)) {
      diffs.push({ path, oldValue: oldVal, newValue: newVal });
      return;
    }
    const oldObj = oldVal;
    const newObj = newVal;
    const allKeys = /* @__PURE__ */ new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of allKeys) {
      this.diffRecursive(oldObj[key], newObj[key], [...path, key], diffs);
    }
  }
  /**
   * Get computed values
   */
  getComputed() {
    return this.store.computed;
  }
  /**
   * Get action names
   */
  getActions() {
    return Object.keys(this.store.actions);
  }
  /**
   * Clear history
   */
  clearHistory() {
    this.stateHistory = [];
  }
  /**
   * Format state for display (JSON with indentation)
   */
  formatState(state = this.store.getState()) {
    return JSON.stringify(state, null, 2);
  }
};
function createInspector(store, maxHistory = 100) {
  return new StoreInspector(store, maxHistory);
}

export { StoreInspector, createDevToolsPlugin, createInspector, isDevToolsAvailable };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map