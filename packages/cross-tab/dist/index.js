// src/channel.ts
function createBroadcastChannelAdapter(channelName) {
  if (typeof BroadcastChannel === "undefined") {
    throw new Error("[Sthira CrossTab] BroadcastChannel API not available");
  }
  const channel = new BroadcastChannel(channelName);
  const listeners = /* @__PURE__ */ new Set();
  channel.onmessage = (event) => {
    for (const listener of listeners) {
      try {
        listener(event.data);
      } catch (error) {
        console.error("[Sthira CrossTab] Listener error:", error);
      }
    }
  };
  return {
    name: "broadcast-channel",
    postMessage(message) {
      channel.postMessage(message);
    },
    subscribe(callback) {
      const listener = callback;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      channel.close();
      listeners.clear();
    }
  };
}
function createLocalStorageAdapter(channelName) {
  if (typeof localStorage === "undefined" || typeof window === "undefined") {
    throw new Error("[Sthira CrossTab] localStorage/window not available");
  }
  const storageKey = `sthira:cross-tab:${channelName}`;
  const listeners = /* @__PURE__ */ new Set();
  function handleStorage(event) {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const message = JSON.parse(event.newValue);
      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          console.error("[Sthira CrossTab] Listener error:", error);
        }
      }
    } catch {
    }
  }
  window.addEventListener("storage", handleStorage);
  return {
    name: "localstorage",
    postMessage(message) {
      localStorage.setItem(storageKey, JSON.stringify(message));
      localStorage.removeItem(storageKey);
    },
    subscribe(callback) {
      const listener = callback;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      window.removeEventListener("storage", handleStorage);
      listeners.clear();
    }
  };
}
function getDefaultAdapter(channelName) {
  if (typeof BroadcastChannel !== "undefined") {
    return createBroadcastChannelAdapter(channelName);
  }
  if (typeof localStorage !== "undefined" && typeof window !== "undefined") {
    return createLocalStorageAdapter(channelName);
  }
  throw new Error("[Sthira CrossTab] No available adapter (requires browser environment)");
}

// src/plugin.ts
function generateTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function createSyncPlugin(config) {
  const {
    channel,
    onConflict = "last-write-wins",
    resolver,
    debounce = 50,
    syncOnConnect = true
  } = config;
  const tabId = generateTabId();
  let store = null;
  let adapter = null;
  let stateVersion = 0;
  let isPaused = false;
  let connected = false;
  let lastSyncAt = null;
  let debounceTimer = null;
  let unsubscribeStore = null;
  let unsubscribeChannel = null;
  let isReceivingMessage = false;
  function resolveConflict(local, remote, timestamp) {
    switch (onConflict) {
      case "first-write-wins":
        return local;
      case "merge":
        return { ...local, ...remote };
      case "manual":
        return resolver ? resolver(local, remote, timestamp) : remote;
      case "last-write-wins":
      default:
        return remote;
    }
  }
  function handleMessage(message) {
    if (!store || message.tabId === tabId || message.storeName !== store.name || isPaused) return;
    switch (message.type) {
      case "state_update":
        if (message.state && message.version !== void 0 && message.version > stateVersion) {
          const resolved = resolveConflict(store.getState(), message.state, message.timestamp);
          isReceivingMessage = true;
          try {
            store.setState(resolved);
          } finally {
            isReceivingMessage = false;
          }
          stateVersion = message.version;
          lastSyncAt = Date.now();
        }
        break;
      case "request_state":
        broadcastState("state_response");
        break;
      case "state_response":
        if (message.state && message.version !== void 0) {
          if (stateVersion === 0 || message.version > stateVersion) {
            isReceivingMessage = true;
            try {
              store.setState(message.state);
            } finally {
              isReceivingMessage = false;
            }
            stateVersion = message.version;
            lastSyncAt = Date.now();
          }
        }
        break;
    }
  }
  function broadcastState(type = "state_update") {
    if (!store || !adapter || isPaused) return;
    const message = {
      type,
      storeName: store.name,
      tabId,
      timestamp: Date.now(),
      state: store.getState(),
      version: stateVersion
    };
    adapter.postMessage(message);
  }
  function scheduleBroadcast() {
    if (isPaused || isReceivingMessage) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      stateVersion++;
      broadcastState();
    }, debounce);
  }
  const api = {
    broadcast: () => {
      stateVersion++;
      broadcastState();
    },
    requestState: () => {
      if (!store || !adapter) return;
      const message = {
        type: "request_state",
        storeName: store.name,
        tabId,
        timestamp: Date.now()
      };
      adapter.postMessage(message);
    },
    pause: () => {
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
    },
    disconnect: () => {
      unsubscribeStore?.();
      unsubscribeChannel?.();
      adapter?.close();
      connected = false;
    },
    getStatus: () => ({ connected, tabId, lastSyncAt })
  };
  const plugin = {
    name: "sync",
    version: "1.0.0",
    onInit: (s) => {
      store = s;
      try {
        adapter = config.adapter ?? getDefaultAdapter(channel);
      } catch (error) {
        console.warn("[Sthira Sync] Failed to create adapter:", error);
        return;
      }
      connected = true;
      unsubscribeStore = store.subscribe(() => {
        scheduleBroadcast();
      });
      unsubscribeChannel = adapter.subscribe(handleMessage);
      if (syncOnConnect) {
        const message = {
          type: "request_state",
          storeName: store.name,
          tabId,
          timestamp: Date.now()
        };
        adapter.postMessage(message);
      }
    },
    onDestroy: () => {
      api.disconnect();
    },
    extend: () => ({ sync: api })
  };
  return Object.assign(plugin, { api });
}
function createNoopSyncApi() {
  return {
    broadcast: () => {
    },
    requestState: () => {
    },
    pause: () => {
    },
    resume: () => {
    },
    disconnect: () => {
    },
    getStatus: () => ({ connected: false, tabId: "ssr", lastSyncAt: null })
  };
}

export { createBroadcastChannelAdapter, createLocalStorageAdapter, createNoopSyncApi, createSyncPlugin, getDefaultAdapter };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map