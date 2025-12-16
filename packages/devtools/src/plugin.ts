// ============================================================================
// @sthirajs/devtools - DevTools Plugin for Sthira
// ============================================================================

import type { Plugin, Store } from '@sthirajs/core';
import type {
  ActionLogEntry,
  DevToolsConnection,
  DevToolsExtension,
  DevToolsFeatures,
  DevToolsMessage,
} from './types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * DevTools configuration
 */
export interface DevToolsConfig {
  /** Instance name in DevTools */
  name?: string;
  /** Max action history */
  maxAge?: number;
  /** Enable features */
  features?: DevToolsFeatures;
}

/**
 * DevTools API exposed on store
 */
export interface DevToolsApi {
  /** Connect to DevTools */
  connect: () => void;
  /** Disconnect from DevTools */
  disconnect: () => void;
  /** Log an action */
  logAction: (type: string, payload?: unknown) => void;
  /** Get action history */
  getHistory: () => ActionLogEntry[];
  /** Clear history */
  clearHistory: () => void;
  /** Jump to state at action */
  jumpTo: (actionId: number) => void;
  /** Export state as JSON */
  exportState: () => string;
  /** Import state from JSON */
  importState: (json: string) => void;
  /** Get status */
  getStatus: () => { connected: boolean };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get Redux DevTools Extension if available
 */
function getDevToolsExtension(): DevToolsExtension | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension };
  return w.__REDUX_DEVTOOLS_EXTENSION__;
}

/**
 * Check if Redux DevTools Extension is available
 */
export function isDevToolsAvailable(): boolean {
  return getDevToolsExtension() !== undefined;
}

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Create DevTools plugin
 */
export function createDevToolsPlugin<T extends object>(
  config: DevToolsConfig = {},
): Plugin<T> & { api: DevToolsApi } {
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
      test: false,
    },
  } = config;

  let store: Store<T, object> | null = null;
  let connection: DevToolsConnection | null = null;
  let actionId = 0;
  const history: ActionLogEntry[] = [];
  let isConnected = false;
  let isPaused = false;
  let unsubscribe: (() => void) | null = null;
  let storeName = '';

  /**
   * Handle DevTools messages
   */
  function handleMessage(message: DevToolsMessage): void {
    if (!store) return;
    if (message.type === 'DISPATCH' && message.payload) {
      switch (message.payload.type) {
        case 'JUMP_TO_ACTION':
        case 'JUMP_TO_STATE': {
          const idx = message.payload.actionId ?? message.payload.index;
          if (typeof idx === 'number') api.jumpTo(idx);
          break;
        }
        case 'RESET':
          api.clearHistory();
          break;
        case 'COMMIT':
          connection?.init(store.getState());
          break;
        case 'ROLLBACK':
          if (message.state) {
            try {
              store.setState(JSON.parse(message.state) as Partial<T>, { silent: true });
            } catch {
              /* ignore */
            }
          }
          break;
        case 'IMPORT_STATE':
          if (message.payload.nextLiftedState) {
            const liftedState = message.payload.nextLiftedState as {
              computedStates?: { state: unknown }[];
            };
            const state = liftedState.computedStates?.slice(-1)?.[0]?.state;
            if (state) store.setState(state as Partial<T>, { silent: true });
          }
          break;
        case 'PAUSE_RECORDING':
          isPaused = !isPaused;
          break;
      }
    }
  }

  // Public API
  const api: DevToolsApi = {
    connect: () => {
      if (!store) return;
      const extension = getDevToolsExtension();
      if (!extension) {
        console.warn('[Sthira DevTools] Redux DevTools Extension not found');
        return;
      }

      connection = extension.connect({ name: storeName, maxAge, features });
      connection.init(store.getState());
      connection.subscribe(handleMessage);

      unsubscribe = store.subscribe((state, prevState) => {
        if (isPaused) return;
        const entry: ActionLogEntry = {
          id: ++actionId,
          type: 'setState',
          timestamp: Date.now(),
          prevState,
          nextState: state,
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

    logAction: (type: string, payload?: unknown) => {
      if (!store || !isConnected || isPaused) return;
      const state = store.getState();
      const entry: ActionLogEntry = {
        id: ++actionId,
        type,
        payload,
        timestamp: Date.now(),
        prevState: state,
        nextState: state,
      };
      history.push(entry);
      connection?.send({ type, ...((payload as object) || {}) }, state);
    },

    getHistory: () => [...history],

    clearHistory: () => {
      history.length = 0;
      actionId = 0;
      if (store) connection?.init(store.getState());
    },

    jumpTo: (targetId: number) => {
      const entry = history.find((e) => e.id === targetId);
      if (entry && store) {
        store.setState(entry.nextState as Partial<T>, { silent: true });
      }
    },

    exportState: () =>
      JSON.stringify({
        state: store?.getState(),
        history,
        timestamp: Date.now(),
      }),

    importState: (json: string) => {
      try {
        const data = JSON.parse(json);
        if (data.state && store) store.setState(data.state as Partial<T>);
      } catch (error) {
        console.error('[Sthira DevTools] Failed to import:', error);
      }
    },

    getStatus: () => ({ connected: isConnected }),
  };

  // Plugin definition
  const plugin: Plugin<T> = {
    name: 'devtools',
    version: '1.0.0',

    onInit: (s: Store<T, object>) => {
      store = s;
      storeName = config.name ?? store.name;
      api.connect();
    },

    onDestroy: () => {
      api.disconnect();
    },

    extend: () => ({ devtools: api }),
  };

  return Object.assign(plugin, { api });
}
