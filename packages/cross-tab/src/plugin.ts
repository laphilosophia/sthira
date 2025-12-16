// ============================================================================
// @sthira/cross-tab - Cross-Tab Sync Plugin for Sthira
// ============================================================================

import type { Plugin, Store } from '@sthira/core';
import { getDefaultAdapter } from './channel';
import type { ChannelAdapter, ConflictStrategy, SyncMessage } from './types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Cross-tab sync configuration
 */
export interface SyncConfig<T = unknown> {
  /** Channel name */
  channel: string;
  /** Conflict resolution strategy */
  onConflict?: ConflictStrategy;
  /** Custom conflict resolver */
  resolver?: (local: T, remote: T, timestamp: number) => T;
  /** Debounce broadcasts (ms) */
  debounce?: number;
  /** Request state from other tabs on connect */
  syncOnConnect?: boolean;
  /** Custom channel adapter */
  adapter?: ChannelAdapter;
}

/**
 * Sync API exposed on store
 */
export interface SyncApi {
  /** Broadcast current state to all tabs */
  broadcast: () => void;
  /** Request state from other tabs */
  requestState: () => void;
  /** Pause syncing */
  pause: () => void;
  /** Resume syncing */
  resume: () => void;
  /** Disconnect and cleanup */
  disconnect: () => void;
  /** Get sync status */
  getStatus: () => { connected: boolean; tabId: string; lastSyncAt: number | null };
}

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Generate random tab ID
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create cross-tab sync plugin
 */
export function createSyncPlugin<T extends object>(
  config: SyncConfig<T>,
): Plugin<T> & { api: SyncApi } {
  const {
    channel,
    onConflict = 'last-write-wins',
    resolver,
    debounce = 50,
    syncOnConnect = true,
  } = config;

  const tabId = generateTabId();
  let store: Store<T, object> | null = null;
  let adapter: ChannelAdapter | null = null;
  let stateVersion = 0;
  let isPaused = false;
  let connected = false;
  let lastSyncAt: number | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeStore: (() => void) | null = null;
  let unsubscribeChannel: (() => void) | null = null;

  /**
   * Resolve conflict between local and remote state
   */
  function resolveConflict(local: T, remote: T, timestamp: number): T {
    switch (onConflict) {
      case 'first-write-wins':
        return local;
      case 'merge':
        return { ...local, ...remote };
      case 'manual':
        return resolver ? resolver(local, remote, timestamp) : remote;
      case 'last-write-wins':
      default:
        return remote;
    }
  }

  /**
   * Handle incoming messages
   */
  function handleMessage(message: SyncMessage<T>): void {
    if (!store || message.tabId === tabId || message.storeName !== store.name || isPaused) return;

    switch (message.type) {
      case 'state_update':
        if (message.state && message.version !== undefined && message.version > stateVersion) {
          const resolved = resolveConflict(store.getState(), message.state, message.timestamp);
          store.setState(resolved as Partial<T>, { silent: true });
          stateVersion = message.version;
          lastSyncAt = Date.now();
        }
        break;

      case 'request_state':
        broadcastState('state_response');
        break;

      case 'state_response':
        if (message.state && message.version !== undefined) {
          if (stateVersion === 0 || message.version > stateVersion) {
            store.setState(message.state as Partial<T>, { silent: true });
            stateVersion = message.version;
            lastSyncAt = Date.now();
          }
        }
        break;
    }
  }

  /**
   * Broadcast state to other tabs
   */
  function broadcastState(type: 'state_update' | 'state_response' = 'state_update'): void {
    if (!store || !adapter || isPaused) return;

    const message: SyncMessage<T> = {
      type,
      storeName: store.name,
      tabId,
      timestamp: Date.now(),
      state: store.getState(),
      version: stateVersion,
    };

    adapter.postMessage(message);
  }

  /**
   * Schedule debounced broadcast
   */
  function scheduleBroadcast(): void {
    if (isPaused) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      stateVersion++;
      broadcastState();
    }, debounce);
  }

  // Public API
  const api: SyncApi = {
    broadcast: () => {
      stateVersion++;
      broadcastState();
    },
    requestState: () => {
      if (!store || !adapter) return;
      const message: SyncMessage = {
        type: 'request_state',
        storeName: store.name,
        tabId,
        timestamp: Date.now(),
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
    getStatus: () => ({ connected, tabId, lastSyncAt }),
  };

  // Plugin definition
  const plugin: Plugin<T> = {
    name: 'sync',
    version: '1.0.0',

    onInit: (s: Store<T, object>) => {
      store = s;

      try {
        adapter = config.adapter ?? getDefaultAdapter(channel);
      } catch (error) {
        console.warn('[Sthira Sync] Failed to create adapter:', error);
        return;
      }

      connected = true;

      // Subscribe to store changes
      unsubscribeStore = store.subscribe(() => {
        scheduleBroadcast();
      });

      // Subscribe to channel messages
      unsubscribeChannel = adapter.subscribe(handleMessage);

      // Request state from other tabs on connect
      if (syncOnConnect) {
        const message: SyncMessage = {
          type: 'request_state',
          storeName: store.name,
          tabId,
          timestamp: Date.now(),
        };
        adapter.postMessage(message);
      }
    },

    onDestroy: () => {
      api.disconnect();
    },

    extend: () => ({ sync: api }),
  };

  return Object.assign(plugin, { api });
}

// ============================================================================
// No-op API for SSR
// ============================================================================

/**
 * Create no-op sync API (SSR safe)
 */
export function createNoopSyncApi(): SyncApi {
  return {
    broadcast: () => {},
    requestState: () => {},
    pause: () => {},
    resume: () => {},
    disconnect: () => {},
    getStatus: () => ({ connected: false, tabId: 'ssr', lastSyncAt: null }),
  };
}
