// src/adapters/indexeddb.ts
function createIndexedDBAdapter(options = {}) {
  const { dbName = "sthira", storeName = "persist", dbVersion = 1 } = options;
  let db = null;
  let dbPromise = null;
  async function getDB() {
    if (db) return db;
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      };
    });
    return dbPromise;
  }
  return {
    name: "indexeddb",
    isAvailable() {
      return typeof indexedDB !== "undefined";
    },
    async getItem(key) {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (result === void 0) {
            resolve(null);
          } else if (result instanceof Uint8Array) {
            resolve(result);
          } else if (result instanceof ArrayBuffer) {
            resolve(new Uint8Array(result));
          } else {
            resolve(new TextEncoder().encode(JSON.stringify(result)));
          }
        };
      });
    },
    async setItem(key, value) {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async removeItem(key) {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async clear(prefix) {
      const database = await getDB();
      if (!prefix) {
        return new Promise((resolve, reject) => {
          const tx2 = database.transaction(storeName, "readwrite");
          const store2 = tx2.objectStore(storeName);
          const request = store2.clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      }
      const keys = await this.keys(prefix);
      const tx = database.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      for (const key of keys) {
        store.delete(key);
      }
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async keys(prefix) {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          let keys = request.result;
          if (prefix) {
            keys = keys.filter((k) => k.startsWith(prefix));
          }
          resolve(keys);
        };
      });
    },
    async getSize() {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          let totalSize = 0;
          for (const value of request.result) {
            if (value instanceof Uint8Array) {
              totalSize += value.byteLength;
            } else if (value instanceof ArrayBuffer) {
              totalSize += value.byteLength;
            }
          }
          resolve(totalSize);
        };
      });
    }
  };
}
var defaultAdapter = null;
function getIndexedDBAdapter(options) {
  if (!defaultAdapter) {
    defaultAdapter = createIndexedDBAdapter(options);
  }
  return defaultAdapter;
}

// src/adapters/localstorage.ts
function createLocalStorageAdapter(options = {}) {
  const { prefix = "sthira:" } = options;
  function getKey(key) {
    return `${prefix}${key}`;
  }
  return {
    name: "localstorage",
    isAvailable() {
      try {
        const test = "__sthira_test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      try {
        const data = localStorage.getItem(getKey(key));
        if (data === null) return null;
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      const binary = String.fromCharCode(...value);
      const base64 = btoa(binary);
      localStorage.setItem(getKey(key), base64);
    },
    async removeItem(key) {
      localStorage.removeItem(getKey(key));
    },
    async clear(keyPrefix) {
      const fullPrefix = keyPrefix ? `${prefix}${keyPrefix}` : prefix;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    },
    async keys(keyPrefix) {
      const fullPrefix = keyPrefix ? `${prefix}${keyPrefix}` : prefix;
      const result = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          result.push(key.slice(prefix.length));
        }
      }
      return result;
    },
    async getSize() {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        }
      }
      return totalSize;
    }
  };
}
var defaultAdapter2 = null;
function getLocalStorageAdapter(options) {
  if (!defaultAdapter2) {
    defaultAdapter2 = createLocalStorageAdapter(options);
  }
  return defaultAdapter2;
}

// src/adapters/memory.ts
function createMemoryAdapter() {
  const storage = /* @__PURE__ */ new Map();
  return {
    name: "memory",
    isAvailable() {
      return true;
    },
    async getItem(key) {
      return storage.get(key) ?? null;
    },
    async setItem(key, value) {
      storage.set(key, value);
    },
    async removeItem(key) {
      storage.delete(key);
    },
    async clear(prefix) {
      if (!prefix) {
        storage.clear();
        return;
      }
      for (const key of storage.keys()) {
        if (key.startsWith(prefix)) {
          storage.delete(key);
        }
      }
    },
    async keys(prefix) {
      const allKeys = Array.from(storage.keys());
      if (!prefix) return allKeys;
      return allKeys.filter((k) => k.startsWith(prefix));
    },
    async getSize() {
      let totalSize = 0;
      for (const value of storage.values()) {
        totalSize += value.byteLength;
      }
      return totalSize;
    }
  };
}

// src/serialization.ts
var jsonSerializer = {
  format: "json",
  encode(data) {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
  },
  decode(buffer) {
    const json = new TextDecoder().decode(buffer);
    return JSON.parse(json);
  }
};
var msgpackModule = null;
var msgpackSerializer = {
  format: "msgpack",
  encode(data) {
    if (!msgpackModule) {
      throw new Error(
        "[Sthira] MessagePack not loaded. Call loadMsgpack() first or use jsonSerializer."
      );
    }
    return msgpackModule.encode(data);
  },
  decode(buffer) {
    if (!msgpackModule) {
      throw new Error(
        "[Sthira] MessagePack not loaded. Call loadMsgpack() first or use jsonSerializer."
      );
    }
    return msgpackModule.decode(buffer);
  }
};
async function loadMsgpack() {
  if (msgpackModule) return;
  try {
    const mod = await import('@msgpack/msgpack');
    msgpackModule = {
      encode: mod.encode,
      decode: mod.decode
    };
  } catch {
    throw new Error(
      "[Sthira] Failed to load @msgpack/msgpack. Install it with: pnpm add @msgpack/msgpack"
    );
  }
}
function isMsgpackAvailable() {
  return msgpackModule !== null;
}
function getSerializer(format) {
  switch (format) {
    case "msgpack":
      return msgpackSerializer;
    case "json":
    default:
      return jsonSerializer;
  }
}
function createSerializer(encode, decode, format = "json") {
  return { format, encode, decode };
}

// src/plugin.ts
function createPersistPlugin(config) {
  const {
    key,
    storage = "localstorage",
    adapter: customAdapter,
    serializer = jsonSerializer,
    version = 0,
    migrate,
    partialize = (state) => state,
    merge = (persisted, current) => ({ ...current, ...persisted }),
    debounce = 100,
    onReady,
    onError
  } = config;
  let store = null;
  let hydrated = false;
  let persisting = false;
  let lastPersistedAt = null;
  let pendingWrites = 0;
  let isPaused = false;
  let debounceTimer = null;
  let unsubscribe = null;
  const storageKey = `sthira:${key}`;
  const getAdapter = () => {
    if (customAdapter) return customAdapter;
    switch (storage) {
      case "indexeddb":
        return getIndexedDBAdapter({ dbName: `sthira-${key}` });
      case "memory":
        return createMemoryAdapter();
      default:
        return getLocalStorageAdapter();
    }
  };
  const adapter = getAdapter();
  async function persistState() {
    if (!store || isPaused || persisting) return;
    persisting = true;
    pendingWrites++;
    try {
      const currentState = store.getState();
      const partialState = partialize(currentState);
      const data = {
        version,
        state: partialState,
        timestamp: Date.now()
      };
      const encoded = serializer.encode(data);
      await adapter.setItem(storageKey, encoded);
      lastPersistedAt = Date.now();
    } catch (error) {
      onError?.(error);
      console.error("[Sthira Persist] Failed to persist:", error);
    } finally {
      pendingWrites--;
      persisting = false;
    }
  }
  function schedulePersist() {
    if (isPaused) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      persistState();
    }, debounce);
  }
  async function hydrateState() {
    if (!store) return;
    try {
      const encoded = await adapter.getItem(storageKey);
      if (!encoded) {
        hydrated = true;
        onReady?.(store.getState());
        return;
      }
      const data = serializer.decode(encoded);
      let restoredState = data.state;
      if (data.version !== version && migrate) {
        restoredState = migrate(data.state, data.version);
      }
      const currentState = store.getState();
      const mergedState = merge(restoredState, currentState);
      store.setState(mergedState, { silent: true });
      hydrated = true;
      lastPersistedAt = data.timestamp;
      onReady?.(store.getState());
    } catch (error) {
      onError?.(error);
      console.error("[Sthira Persist] Failed to hydrate:", error);
      hydrated = true;
    }
  }
  function handleVisibilityChange() {
    if (document.hidden && pendingWrites > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      persistState();
    }
  }
  function handleBeforeUnload() {
    if (pendingWrites > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      persistState();
    }
  }
  const api = {
    hydrate: hydrateState,
    persist: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await persistState();
    },
    clear: async () => {
      await adapter.removeItem(storageKey);
      lastPersistedAt = null;
    },
    pause: () => {
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
    },
    getStatus: () => ({ hydrated, persisting, lastPersistedAt })
  };
  const plugin = {
    name: "persist",
    version: "1.0.0",
    onInit: (s) => {
      store = s;
      unsubscribe = store.subscribe(() => {
        schedulePersist();
      });
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", handleBeforeUnload);
      }
      hydrateState();
    },
    onDestroy: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (pendingWrites > 0) {
        await persistState();
      }
      unsubscribe?.();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    },
    extend: () => ({ persist: api })
  };
  return Object.assign(plugin, { api });
}
function waitForHydration(api, timeoutMs = 5e3) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (api.getStatus().hydrated) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("[Sthira Persist] Hydration timeout"));
        return;
      }
      setTimeout(check, 10);
    }
    check();
  });
}

export { createIndexedDBAdapter, createLocalStorageAdapter, createMemoryAdapter, createPersistPlugin, createSerializer, getIndexedDBAdapter, getLocalStorageAdapter, getSerializer, isMsgpackAvailable, jsonSerializer, loadMsgpack, msgpackSerializer, waitForHydration };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map