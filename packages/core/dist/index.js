// src/computed.ts
function createMemoizedComputed(fn, getState, getComputed) {
  let cachedValue;
  let cachedState;
  let isValid = false;
  return {
    get() {
      const currentState = getState();
      if (isValid && cachedState === currentState) {
        return cachedValue;
      }
      cachedValue = fn(currentState, getComputed());
      cachedState = currentState;
      isValid = true;
      return cachedValue;
    },
    invalidate() {
      isValid = false;
      cachedValue = void 0;
      cachedState = void 0;
    },
    isValid() {
      return isValid;
    }
  };
}
var ComputedManager = class {
  computedMap = /* @__PURE__ */ new Map();
  definitions;
  getState;
  constructor(definitions, getState) {
    this.definitions = definitions ?? {};
    this.getState = getState;
    this.initialize();
  }
  /**
   * Initialize all computed values
   */
  initialize() {
    const computedProxy = this.createComputedProxy();
    for (const [key, fn] of Object.entries(this.definitions)) {
      this.computedMap.set(
        key,
        createMemoizedComputed(
          fn,
          this.getState,
          () => computedProxy
        )
      );
    }
  }
  /**
   * Create a proxy that lazily evaluates computed values
   */
  createComputedProxy() {
    return new Proxy({}, {
      get: (_, prop) => {
        return this.get(prop);
      }
    });
  }
  /**
   * Get a computed value
   */
  get(key) {
    const computed2 = this.computedMap.get(key);
    if (!computed2) {
      return void 0;
    }
    return computed2.get();
  }
  /**
   * Get all computed values
   */
  getAll() {
    const result = {};
    for (const key of this.computedMap.keys()) {
      result[key] = this.get(key);
    }
    return result;
  }
  /**
   * Invalidate all computed values
   */
  invalidateAll() {
    for (const computed2 of this.computedMap.values()) {
      computed2.invalidate();
    }
  }
  /**
   * Invalidate specific computed value
   */
  invalidate(key) {
    const computed2 = this.computedMap.get(key);
    if (computed2) {
      computed2.invalidate();
    }
  }
  /**
   * Check if computed value exists
   */
  has(key) {
    return this.computedMap.has(key);
  }
  /**
   * Get computed keys
   */
  keys() {
    return Array.from(this.computedMap.keys());
  }
};

// src/events.ts
function createEventBus() {
  const handlers = /* @__PURE__ */ new Map();
  const onceHandlers = /* @__PURE__ */ new WeakSet();
  return {
    /**
     * Emit an event
     */
    emit(type, payload, options) {
      const event = {
        type,
        payload,
        timestamp: Date.now(),
        source: options?.source ?? "user",
        priority: options?.priority ?? "normal",
        meta: options?.meta
      };
      const typeHandlers = handlers.get(type);
      if (!typeHandlers) return;
      for (const handler of typeHandlers) {
        try {
          handler(event);
          if (onceHandlers.has(handler)) {
            typeHandlers.delete(handler);
            onceHandlers.delete(handler);
          }
        } catch (error) {
          console.error(`[Sthira] Error in event handler for "${type}":`, error);
        }
      }
    },
    /**
     * Subscribe to an event type
     */
    on(type, handler) {
      if (!handlers.has(type)) {
        handlers.set(type, /* @__PURE__ */ new Set());
      }
      handlers.get(type).add(handler);
      return () => {
        handlers.get(type)?.delete(handler);
      };
    },
    /**
     * Subscribe to an event type (once)
     */
    once(type, handler) {
      const wrappedHandler = handler;
      onceHandlers.add(wrappedHandler);
      return this.on(type, handler);
    },
    /**
     * Unsubscribe from an event type
     */
    off(type, handler) {
      if (!handler) {
        handlers.delete(type);
        return;
      }
      handlers.get(type)?.delete(handler);
    }
  };
}
var StoreEvents = {
  STATE_CHANGE: "state:change",
  STATE_RESET: "state:reset",
  COMPUTED_INVALIDATE: "computed:invalidate",
  ERROR: "error",
  DESTROY: "destroy"
};

// src/interceptors.ts
var InterceptorsManager = class {
  interceptors;
  constructor(interceptors) {
    this.interceptors = interceptors ?? {};
  }
  /**
   * Execute beforeSet interceptor
   * Returns transformed value or original if no transform
   */
  beforeSet(path, value, prevState) {
    if (!this.interceptors.beforeSet) {
      return value;
    }
    try {
      const result = this.interceptors.beforeSet(path, value, prevState);
      return result ?? value;
    } catch (error) {
      this.handleError(error, {
        action: "beforeSet",
        state: prevState,
        error
      });
      return value;
    }
  }
  /**
   * Execute afterSet interceptor
   */
  afterSet(path, value, newState) {
    if (!this.interceptors.afterSet) {
      return;
    }
    try {
      this.interceptors.afterSet(path, value, newState);
    } catch (error) {
      this.handleError(error, {
        action: "afterSet",
        state: newState,
        error
      });
    }
  }
  /**
   * Handle error through interceptor or console
   */
  handleError(error, context) {
    if (this.interceptors.onError) {
      try {
        this.interceptors.onError(error, context);
      } catch (e) {
        console.error("[Sthira] Error in onError interceptor:", e);
      }
    } else {
      console.error("[Sthira] Error:", error, context);
    }
  }
  /**
   * Check if any interceptors are defined
   */
  hasInterceptors() {
    return !!(this.interceptors.beforeSet || this.interceptors.afterSet || this.interceptors.onError);
  }
  /**
   * Update interceptors
   */
  setInterceptors(interceptors) {
    this.interceptors = interceptors;
  }
};

// src/plugins/resolver.ts
function createLazyPersistPlugin(config) {
  let hydrated = false;
  const persisting = false;
  const lastPersistedAt = null;
  let realApi = null;
  const api = {
    hydrate: async () => {
      if (realApi) await realApi.hydrate();
    },
    persist: async () => {
      if (realApi) await realApi.persist();
    },
    clear: async () => {
      if (realApi) await realApi.clear();
    },
    pause: () => {
      if (realApi) realApi.pause();
    },
    resume: () => {
      if (realApi) realApi.resume();
    },
    getStatus: () => realApi?.getStatus() ?? { hydrated, persisting, lastPersistedAt }
  };
  const plugin = {
    name: "persist",
    version: "1.0.0",
    onInit: async (store) => {
      try {
        const dynamicImport = new Function("m", "return import(m)");
        const { createPersistPlugin } = await dynamicImport("@sthirajs/persist");
        const pluginInstance = createPersistPlugin({
          key: config.key,
          storage: config.storage,
          version: config.version,
          debounce: config.debounce,
          onReady: config.onReady,
          onError: config.onError
        });
        realApi = pluginInstance.api;
        await pluginInstance.onInit?.(store);
        hydrated = true;
      } catch {
        console.warn("[Sthira] @sthirajs/persist not installed");
      }
    },
    onDestroy: async () => {
      if (realApi) await realApi.persist();
    },
    extend: () => ({ persist: api })
  };
  return Object.assign(plugin, { api });
}
function createLazySyncPlugin(config) {
  let connected = false;
  const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  let realApi = null;
  const api = {
    broadcast: () => realApi?.broadcast(),
    disconnect: () => {
      realApi?.disconnect();
      connected = false;
    },
    getStatus: () => realApi?.getStatus() ?? { connected, tabId, lastSyncAt: null }
  };
  const plugin = {
    name: "sync",
    version: "1.0.0",
    onInit: async (store) => {
      try {
        const dynamicImport = new Function("m", "return import(m)");
        const { createSyncPlugin } = await dynamicImport("@sthirajs/cross-tab");
        const pluginInstance = createSyncPlugin({
          channel: config.channel,
          onConflict: config.onConflict,
          debounce: config.debounce
        });
        realApi = pluginInstance.api;
        await pluginInstance.onInit?.(store);
        connected = true;
      } catch {
        console.warn("[Sthira] @sthirajs/cross-tab not installed");
      }
    },
    onDestroy: () => {
      api.disconnect();
    },
    extend: () => ({ sync: api })
  };
  return Object.assign(plugin, { api });
}
function createLazyDevToolsPlugin(config, storeName) {
  let realApi = null;
  const api = {
    export: () => {
      if (!realApi) return "{}";
      if (realApi.exportState) return realApi.exportState();
      return realApi.export();
    },
    import: (json) => {
      if (!realApi) return;
      if (realApi.importState) realApi.importState(json);
      else realApi.import(json);
    }
  };
  const plugin = {
    name: "devtools",
    version: "1.0.0",
    onInit: async (store) => {
      try {
        const dynamicImport = new Function("m", "return import(m)");
        const { createDevToolsPlugin } = await dynamicImport("@sthirajs/devtools");
        const pluginInstance = createDevToolsPlugin({
          name: config.name ?? storeName,
          maxAge: config.maxAge
        });
        realApi = pluginInstance.api;
        await pluginInstance.onInit?.(store);
      } catch {
        if (typeof window !== "undefined") {
          const win = window;
          win.__STHIRA_STORES__ = win.__STHIRA_STORES__ ?? {};
          win.__STHIRA_STORES__[store.name] = store;
        }
      }
    },
    onDestroy: () => {
      realApi?.disconnect?.();
    },
    extend: () => ({ devtools: api })
  };
  return Object.assign(plugin, { api });
}
function normalizePersistConfig(config, storeName) {
  if (!config) return void 0;
  if (config === true) return { key: storeName };
  return config;
}
function normalizeSyncConfig(config, storeName) {
  if (!config) return void 0;
  if (config === true) return { channel: storeName };
  if (typeof config === "string") return { channel: config };
  return config;
}
function normalizeDevToolsConfig(config) {
  if (!config) return void 0;
  if (config === true) return {};
  return config;
}
function resolvePlugins(config, _store) {
  const result = {
    plugins: config.plugins ?? []
  };
  const persistConfig = normalizePersistConfig(config.persist, config.name);
  if (persistConfig) {
    const p = createLazyPersistPlugin(persistConfig);
    result.persist = { plugin: p, api: p.api };
  }
  const syncConfig = normalizeSyncConfig(config.sync, config.name);
  if (syncConfig) {
    const p = createLazySyncPlugin(syncConfig);
    result.sync = { plugin: p, api: p.api };
  }
  const devtoolsConfig = normalizeDevToolsConfig(config.devtools);
  if (devtoolsConfig) {
    const p = createLazyDevToolsPlugin(devtoolsConfig, config.name);
    result.devtools = { plugin: p, api: p.api };
  }
  return result;
}
function getAllPlugins(resolved) {
  const plugins = [...resolved.plugins];
  if (resolved.persist) plugins.push(resolved.persist.plugin);
  if (resolved.sync) plugins.push(resolved.sync.plugin);
  if (resolved.devtools) plugins.push(resolved.devtools.plugin);
  return plugins;
}

// src/proxy.ts
var PROXY_TARGET = /* @__PURE__ */ Symbol("proxy_target");
var PROXY_RAW = /* @__PURE__ */ Symbol("proxy_raw");
function isPlainObject(value) {
  return typeof value === "object" && value !== null && Object.prototype.toString.call(value) === "[object Object]";
}
function isReactive(value) {
  return isPlainObject(value) || Array.isArray(value);
}
function toRaw(proxy) {
  const raw = proxy?.[PROXY_RAW];
  return raw ? toRaw(raw) : proxy;
}
function isProxy(value) {
  return !!(value && value[PROXY_TARGET]);
}
function createReactiveProxy(target, config = {}) {
  const { deep = true, onChange } = config;
  if (isProxy(target)) {
    return target;
  }
  const proxyCache = /* @__PURE__ */ new WeakMap();
  function createProxy(obj) {
    const cached = proxyCache.get(obj);
    if (cached) return cached;
    const proxy = new Proxy(obj, {
      get(target2, prop, receiver) {
        if (prop === PROXY_RAW) return target2;
        if (prop === PROXY_TARGET) return true;
        const value = Reflect.get(target2, prop, receiver);
        if (deep && isReactive(value) && typeof prop !== "symbol") {
          return createProxy(value);
        }
        return value;
      },
      set(target2, prop, value, receiver) {
        const oldValue = Reflect.get(target2, prop, receiver);
        if (Object.is(oldValue, value)) {
          return true;
        }
        const result = Reflect.set(target2, prop, value, receiver);
        if (result && onChange) {
          onChange();
        }
        return result;
      },
      deleteProperty(target2, prop) {
        const hadKey = Reflect.has(target2, prop);
        const result = Reflect.deleteProperty(target2, prop);
        if (result && hadKey && onChange) {
          onChange();
        }
        return result;
      }
    });
    proxyCache.set(obj, proxy);
    return proxy;
  }
  return createProxy(target);
}
var SubscriptionManager = class {
  listeners = /* @__PURE__ */ new Set();
  batchedNotifications = [];
  isBatching = false;
  notifyScheduled = false;
  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /**
   * Notify all listeners of state change
   */
  notify(state, prevState) {
    if (this.isBatching) {
      this.batchedNotifications.push({ state, prevState });
      this.scheduleNotify();
      return;
    }
    this.notifyListeners(state, prevState);
  }
  /**
   * Start batching notifications
   */
  startBatch() {
    this.isBatching = true;
  }
  /**
   * End batching and flush notifications
   */
  endBatch() {
    this.isBatching = false;
    this.flushBatch();
  }
  /**
   * Schedule notification in next microtask
   */
  scheduleNotify() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      if (!this.isBatching) {
        this.flushBatch();
      }
    });
  }
  /**
   * Flush batched notifications
   */
  flushBatch() {
    if (this.batchedNotifications.length === 0) return;
    const last = this.batchedNotifications[this.batchedNotifications.length - 1];
    const first = this.batchedNotifications[0];
    if (last && first) {
      this.notifyListeners(last.state, first.prevState);
    }
    this.batchedNotifications = [];
  }
  /**
   * Actually notify listeners
   */
  notifyListeners(state, prevState) {
    for (const listener of this.listeners) {
      try {
        listener(state, prevState);
      } catch (error) {
        console.error("[Sthira] Error in listener:", error);
      }
    }
  }
  /**
   * Get listener count
   */
  get size() {
    return this.listeners.size;
  }
  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
    this.batchedNotifications = [];
  }
};

// src/scheduler.ts
var TaskScheduler = class {
  frameBudgetMs;
  taskQueue = [];
  isProcessing = false;
  frameDeadline = 0;
  constructor(frameBudgetMs = 5) {
    this.frameBudgetMs = frameBudgetMs;
  }
  /**
   * Schedule a task with priority
   */
  schedule(task, priority = "normal") {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        resolve,
        reject,
        priority
      });
      this.taskQueue.sort((a, b) => {
        const order = { high: 0, normal: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });
      this.requestProcessing();
    });
  }
  /**
   * Request processing time
   */
  requestProcessing() {
    if (this.isProcessing) return;
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame((timestamp) => {
        this.frameDeadline = timestamp + this.frameBudgetMs;
        this.processQueue();
      });
    } else {
      setTimeout(() => this.processQueue(), 0);
    }
  }
  /**
   * Process queue while respecting frame budget
   */
  async processQueue() {
    this.isProcessing = true;
    while (this.taskQueue.length > 0) {
      if (this.shouldYield()) {
        this.isProcessing = false;
        this.requestProcessing();
        return;
      }
      const item = this.taskQueue.shift();
      if (!item) break;
      try {
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
    this.isProcessing = false;
  }
  /**
   * Check if we should yield to browser
   */
  shouldYield() {
    if (typeof performance === "undefined") return false;
    return performance.now() >= this.frameDeadline;
  }
  /**
   * Yield to main thread
   */
  async yieldToMain() {
    const g = globalThis;
    if (g.scheduler?.yield) {
      return g.scheduler.yield();
    }
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  /**
   * Process array in chunks
   */
  async chunked(items, fn, options = {}) {
    const { chunkSize = 100, yieldEvery = true } = options;
    const results = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await this.schedule(() => chunk.map(fn), "normal");
      results.push(...chunkResults);
      if (yieldEvery && i + chunkSize < items.length) {
        await this.yieldToMain();
      }
    }
    return results;
  }
};
function createPerformanceUtils(config) {
  if (!config) return void 0;
  const options = typeof config === "string" ? getPresetOptions(config) : config;
  if (!options.scheduler && !options.batching) {
    return void 0;
  }
  const scheduler = new TaskScheduler();
  return {
    schedule: scheduler.schedule.bind(scheduler),
    yieldToMain: scheduler.yieldToMain.bind(scheduler),
    chunked: scheduler.chunked.bind(scheduler)
  };
}
function getPresetOptions(preset) {
  switch (preset) {
    case "minimal":
      return {};
    case "balanced":
      return { scheduler: true, batching: true };
    case "heavy":
      return { scheduler: true, batching: true, workers: true };
    default:
      return {};
  }
}

// src/schema.ts
var SchemaValidator = class {
  constructor(schema) {
    this.schema = schema;
  }
  /**
   * Validate data against schema
   */
  validate(data) {
    if (!this.schema) {
      return data;
    }
    return this.schema.parse(data);
  }
  /**
   * Safe validation that returns result object
   */
  safeParse(data) {
    if (!this.schema) {
      return { success: true, data };
    }
    const result = this.schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }
  /**
   * Validate partial data (for updates)
   */
  validatePartial(data) {
    if (!this.schema) {
      return data;
    }
    if ("partial" in this.schema && typeof this.schema.partial === "function") {
      const partialSchema = this.schema.partial();
      return partialSchema.parse(data);
    }
    return data;
  }
  /**
   * Safe partial validation
   */
  safeParsePartial(data) {
    try {
      const validated = this.validatePartial(data);
      return { success: true, data: validated };
    } catch (error) {
      return { success: false, error };
    }
  }
  /**
   * Get the underlying schema
   */
  getSchema() {
    return this.schema;
  }
};
function createSchemaValidator(schema) {
  return new SchemaValidator(schema);
}

// src/store.ts
var createStore = ((configOrNothing) => {
  if (configOrNothing === void 0) {
    return (config) => createStoreImpl(
      config
    );
  }
  return createStoreImpl(configOrNothing);
});
function createStoreImpl(config) {
  const {
    name,
    schema,
    state: initialStateOrFactory,
    computed: computedDefs,
    actions: actionsFactory,
    interceptors,
    performance: performance2
  } = config;
  const initialState = typeof initialStateOrFactory === "function" ? initialStateOrFactory() : initialStateOrFactory;
  const validator = new SchemaValidator(schema);
  const validatedInitialState = validator.validate(initialState);
  const subscriptionManager = new SubscriptionManager();
  const interceptorsManager = new InterceptorsManager(interceptors);
  const eventBus = createEventBus();
  const perfUtils = createPerformanceUtils(performance2);
  let currentState = { ...validatedInitialState };
  const computedManager = new ComputedManager(
    computedDefs,
    () => currentState
  );
  const getState = () => currentState;
  const setState = (partial, options = {}) => {
    const { skipInterceptors = false, silent = false } = options;
    let newPartial = typeof partial === "function" ? partial(currentState) : partial;
    if (!skipInterceptors) {
      newPartial = interceptorsManager.beforeSet(null, newPartial, currentState);
    }
    try {
      validator.validatePartial(newPartial);
    } catch (error) {
      interceptorsManager.handleError(error, {
        action: "setState",
        state: currentState,
        error
      });
      return;
    }
    const prevState = currentState;
    currentState = { ...currentState, ...newPartial };
    computedManager.invalidateAll();
    if (!silent) {
      subscriptionManager.notify(currentState, prevState);
    }
    if (!skipInterceptors) {
      interceptorsManager.afterSet(null, newPartial, currentState);
    }
    eventBus.emit(StoreEvents.STATE_CHANGE, {
      current: currentState,
      previous: prevState,
      partial: newPartial
    });
  };
  const subscribe = (listener) => {
    return subscriptionManager.subscribe(listener);
  };
  const getComputed = () => computedManager.getAll();
  const actions = actionsFactory ? actionsFactory(setState, getState) : {};
  const store = {
    name,
    getState,
    setState,
    subscribe,
    getComputed,
    actions,
    destroy: async () => {
    },
    // Placeholder, replaced below
    events: eventBus,
    perf: perfUtils
  };
  const resolvedPlugins = resolvePlugins(config);
  const allPlugins = getAllPlugins(resolvedPlugins);
  store.destroy = async () => {
    for (const plugin of allPlugins) {
      await plugin.onDestroy?.(store);
    }
    subscriptionManager.clear();
    eventBus.emit(StoreEvents.DESTROY, { name });
  };
  for (const plugin of allPlugins) {
    const extensions = plugin.extend?.(store);
    if (extensions) {
      Object.assign(store, extensions);
    }
  }
  for (const plugin of allPlugins) {
    plugin.onInit?.(store);
  }
  return { ...store, ...actions };
}
function createSelector(selector, equalityFn = Object.is) {
  let lastState;
  let lastResult;
  return (state) => {
    if (lastState === state) {
      return lastResult;
    }
    const result = selector(state);
    if (lastResult !== void 0 && equalityFn(lastResult, result)) {
      return lastResult;
    }
    lastState = state;
    lastResult = result;
    return result;
  };
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

// src/types.ts
var ASYNC_TRANSITIONS = {
  idle: ["loading"],
  loading: ["success", "error"],
  success: ["loading", "stale"],
  error: ["loading", "idle"],
  stale: ["loading", "success"]
};

// src/fsm.ts
function createAsyncState() {
  return {
    status: "idle",
    data: void 0,
    error: void 0,
    dataUpdatedAt: null,
    errorUpdatedAt: null,
    isFetching: false,
    isRefetching: false,
    fetchCount: 0
  };
}
var AsyncStateMachine = class {
  state;
  listeners = /* @__PURE__ */ new Set();
  constructor(initialState) {
    this.state = {
      ...createAsyncState(),
      ...initialState
    };
  }
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  /**
   * Check if transition is valid
   */
  canTransition(to) {
    const allowed = ASYNC_TRANSITIONS[this.state.status];
    return allowed?.includes(to) ?? false;
  }
  /**
   * Transition to a new status
   */
  transition(to, payload) {
    if (!this.canTransition(to)) {
      console.warn(`[Sthira FSM] Invalid transition: ${this.state.status} -> ${to}`);
      return false;
    }
    this.state;
    this.state = {
      ...this.state,
      ...payload,
      status: to
    };
    this.notifyListeners();
    return true;
  }
  /**
   * Set loading state
   */
  setLoading() {
    const isRefetching = this.state.data !== void 0;
    this.transition("loading", {
      isFetching: true,
      isRefetching,
      fetchCount: this.state.fetchCount + 1
    });
  }
  /**
   * Set success state
   */
  setSuccess(data) {
    this.transition("success", {
      data,
      error: void 0,
      dataUpdatedAt: Date.now(),
      isFetching: false,
      isRefetching: false
    });
  }
  /**
   * Set error state
   */
  setError(error) {
    this.transition("error", {
      error,
      errorUpdatedAt: Date.now(),
      isFetching: false,
      isRefetching: false
    });
  }
  /**
   * Set stale state
   */
  setStale() {
    if (this.state.status === "success") {
      this.transition("stale");
    }
  }
  /**
   * Reset to idle
   */
  reset() {
    this.state = createAsyncState();
    this.notifyListeners();
  }
  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Notify all listeners
   */
  notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
  // ============================================================================
  // Derived State (TanStack Query-like)
  // ============================================================================
  /**
   * Is loading (no data yet)
   */
  get isLoading() {
    return this.state.status === "loading" && this.state.data === void 0;
  }
  /**
   * Is loading with error (no data, but has error)
   */
  get isLoadingError() {
    return this.state.status === "error" && this.state.data === void 0;
  }
  /**
   * Is success
   */
  get isSuccess() {
    return this.state.status === "success";
  }
  /**
   * Is error
   */
  get isError() {
    return this.state.status === "error";
  }
  /**
   * Is stale
   */
  get isStale() {
    return this.state.status === "stale";
  }
  /**
   * Is fetching (includes refetching)
   */
  get isFetching() {
    return this.state.isFetching;
  }
  /**
   * Is refetching (fetching with existing data)
   */
  get isRefetching() {
    return this.state.isRefetching;
  }
  /**
   * Has data
   */
  get hasData() {
    return this.state.data !== void 0;
  }
};
function isDataStale(dataUpdatedAt, staleTime) {
  if (dataUpdatedAt === null) return true;
  return Date.now() - dataUpdatedAt > staleTime;
}

// src/signals/batch.ts
var pendingSignals = /* @__PURE__ */ new Set();
var batchDepth = 0;
var flushScheduled = false;
function addPendingSignal(signal2) {
  pendingSignals.add(signal2);
}
function scheduleBatchFlush() {
  if (flushScheduled || batchDepth > 0) {
    return;
  }
  flushScheduled = true;
  queueMicrotask(flushBatch);
}
function flushBatch() {
  flushScheduled = false;
  if (pendingSignals.size === 0) {
    return;
  }
  const signals = pendingSignals;
  pendingSignals = /* @__PURE__ */ new Set();
  for (const signal2 of signals) {
    signal2._notify();
  }
}
function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pendingSignals.size > 0) {
      flushBatch();
    }
  }
}
function isBatching() {
  return batchDepth > 0;
}

// src/signals/context.ts
var currentSubscriber = null;
var subscriberStack = [];
function startTracking(subscriber) {
  subscriberStack.push(currentSubscriber);
  currentSubscriber = subscriber;
  subscriber.dependencies.clear();
}
function endTracking() {
  currentSubscriber = subscriberStack.pop() ?? null;
}
function getCurrentSubscriber() {
  return currentSubscriber;
}
function isTracking() {
  return currentSubscriber !== null;
}
function untracked(fn) {
  const prev = currentSubscriber;
  currentSubscriber = null;
  try {
    return fn();
  } finally {
    currentSubscriber = prev;
  }
}

// src/signals/signal.ts
var SignalImpl = class {
  value;
  subscribers = /* @__PURE__ */ new Set();
  valueSubscribers = /* @__PURE__ */ new Set();
  constructor(initialValue) {
    this.value = initialValue;
  }
  /**
   * Get current value.
   * If called within a reactive context, automatically registers dependency.
   */
  get() {
    const subscriber = getCurrentSubscriber();
    if (subscriber) {
      this.subscribers.add(subscriber);
      subscriber.dependencies.add(this);
    }
    return this.value;
  }
  /**
   * Get value without tracking (for debugging/logging)
   */
  peek() {
    return this.value;
  }
  /**
   * Set new value and notify subscribers
   */
  set(newValue) {
    if (Object.is(this.value, newValue)) {
      return;
    }
    this.value = newValue;
    for (const subscriber of this.subscribers) {
      subscriber.invalidate();
    }
    addPendingSignal(this);
    scheduleBatchFlush();
  }
  /**
   * Update value using a function
   */
  update(fn) {
    this.set(fn(this.value));
  }
  /**
   * Subscribe to value changes (for external use)
   */
  subscribe(fn) {
    this.valueSubscribers.add(fn);
    return () => {
      this.valueSubscribers.delete(fn);
    };
  }
  /**
   * Notify value subscribers that value has changed.
   * Called by the batch system.
   * Reactive subscribers (computed/effects) are already invalidated synchronously in set().
   * @internal
   */
  _notify() {
    for (const fn of this.valueSubscribers) {
      try {
        fn(this.value);
      } catch (error) {
        console.error("[Sthira Signal] Error in subscriber:", error);
      }
    }
  }
  /**
   * Remove a subscriber
   * @internal
   */
  _removeSubscriber(subscriber) {
    this.subscribers.delete(subscriber);
  }
};
function signal(initialValue) {
  return new SignalImpl(initialValue);
}
function isSignal(value) {
  return value instanceof SignalImpl;
}

// src/signals/computed.ts
var ComputedImpl = class {
  _dirty = true;
  cachedValue;
  fn;
  // Subscriber interface
  dependencies = /* @__PURE__ */ new Set();
  // Signals that depend on this computed
  subscribers = /* @__PURE__ */ new Set();
  valueSubscribers = /* @__PURE__ */ new Set();
  constructor(fn) {
    this.fn = fn;
  }
  /**
   * Check if value needs recomputation
   */
  get dirty() {
    return this._dirty;
  }
  /**
   * Get computed value.
   * Recomputes if dirty, otherwise returns cached.
   * Tracks dependency if in reactive context.
   */
  get() {
    const subscriber = getCurrentSubscriber();
    if (subscriber) {
      this.subscribers.add(subscriber);
      subscriber.dependencies.add(this);
    }
    if (this._dirty) {
      startTracking(this);
      try {
        this.cachedValue = this.fn();
        this._dirty = false;
      } finally {
        endTracking();
      }
    }
    return this.cachedValue;
  }
  /**
   * Peek value without tracking
   */
  peek() {
    return this._dirty ? this.fn() : this.cachedValue;
  }
  /**
   * Subscribe to value changes
   */
  subscribe(fn) {
    this.valueSubscribers.add(fn);
    return () => {
      this.valueSubscribers.delete(fn);
    };
  }
  /**
   * Subscriber interface - called when a dependency changes
   */
  invalidate() {
    const wasDirty = this._dirty;
    this._dirty = true;
    for (const subscriber of this.subscribers) {
      subscriber.invalidate();
    }
    if (!wasDirty) {
      addPendingSignal(this);
      scheduleBatchFlush();
    }
  }
  /**
   * Notify value subscribers (called by batch system).
   * Downstream computed/effects are already invalidated synchronously in invalidate().
   * @internal
   */
  _notify() {
    for (const fn of this.valueSubscribers) {
      try {
        fn(this.get());
      } catch (error) {
        console.error("[Sthira Computed] Error in subscriber:", error);
      }
    }
  }
  /**
   * Remove a subscriber
   * @internal
   */
  _removeSubscriber(subscriber) {
    this.subscribers.delete(subscriber);
  }
};
function computed(fn) {
  return new ComputedImpl(fn);
}
function isComputed(value) {
  return value instanceof ComputedImpl;
}

// src/signals/effect.ts
var EffectImpl = class {
  fn;
  cleanup = void 0;
  disposed = false;
  // Subscriber interface
  dependencies = /* @__PURE__ */ new Set();
  constructor(fn) {
    this.fn = fn;
    this.run();
  }
  /**
   * Run the effect function
   */
  run() {
    if (this.disposed) {
      return;
    }
    this.runCleanup();
    this.clearDependencies();
    startTracking(this);
    try {
      this.cleanup = this.fn();
    } finally {
      endTracking();
    }
  }
  /**
   * Clear dependencies from previous run
   */
  clearDependencies() {
    for (const dep of this.dependencies) {
      dep._removeSubscriber?.(this);
    }
    this.dependencies.clear();
  }
  /**
   * Run cleanup function if any
   */
  runCleanup() {
    if (typeof this.cleanup === "function") {
      try {
        this.cleanup();
      } catch (error) {
        console.error("[Sthira Effect] Error in cleanup:", error);
      }
      this.cleanup = void 0;
    }
  }
  /**
   * Subscriber interface - called when a dependency changes.
   * Schedules re-run in next microtask to avoid infinite loops.
   */
  invalidate() {
    if (this.disposed) {
      return;
    }
    queueMicrotask(() => this.run());
  }
  /**
   * Dispose the effect - stop watching and cleanup
   */
  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.runCleanup();
    this.clearDependencies();
  }
};
function effect(fn) {
  const effectInstance = new EffectImpl(fn);
  return () => effectInstance.dispose();
}

export { ASYNC_TRANSITIONS, AsyncStateMachine, ComputedManager, InterceptorsManager, SchemaValidator, StoreEvents, SubscriptionManager, TaskScheduler, batch, computed, createAsyncState, createEventBus, createPerformanceUtils, createReactiveProxy, createSchemaValidator, createSelector, createStore, effect, isBatching, isComputed, isDataStale, isProxy, isSignal, isTracking, shallowEqual, signal, toRaw, untracked };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map