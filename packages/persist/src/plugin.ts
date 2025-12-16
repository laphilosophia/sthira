// ============================================================================
// @sthira/persist - Persistence Plugin for Sthira
// ============================================================================

import type { Plugin, Store } from '@sthira/core'
import { getIndexedDBAdapter } from './adapters/indexeddb'
import { getLocalStorageAdapter } from './adapters/localstorage'
import { createMemoryAdapter } from './adapters/memory'
import { jsonSerializer } from './serialization'
import type { PersistedData, Serializer, StorageAdapter } from './types'

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Persist plugin configuration
 */
export interface PersistConfig<T extends object = object> {
  /** Storage key */
  key: string
  /** Storage type */
  storage?: 'indexeddb' | 'localstorage' | 'memory'
  /** Custom storage adapter (overrides storage option) */
  adapter?: StorageAdapter
  /** Custom serializer (default: JSON) */
  serializer?: Serializer
  /** Schema version for migrations */
  version?: number
  /** Migration function */
  migrate?: (state: unknown, version: number) => Partial<T>
  /** Persist only specific fields */
  partialize?: (state: T) => Partial<T>
  /** Merge strategy */
  merge?: (persisted: Partial<T>, current: T) => T
  /** Debounce writes (ms) */
  debounce?: number
  /** Called when hydration completes */
  onReady?: (state: T) => void
  /** Called on error */
  onError?: (error: Error) => void
}

/**
 * Persist API exposed on store
 */
export interface PersistApi {
  /** Load state from storage */
  hydrate: () => Promise<void>
  /** Force persist current state */
  persist: () => Promise<void>
  /** Clear persisted data */
  clear: () => Promise<void>
  /** Pause auto-persist */
  pause: () => void
  /** Resume auto-persist */
  resume: () => void
  /** Get persist status */
  getStatus: () => { hydrated: boolean; persisting: boolean; lastPersistedAt: number | null }
}

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Create persistence plugin
 */
export function createPersistPlugin<T extends object>(
  config: PersistConfig<T>
): Plugin<T> & { api: PersistApi } {
  const {
    key,
    storage = 'localstorage',
    adapter: customAdapter,
    serializer = jsonSerializer,
    version = 0,
    migrate,
    partialize = (state) => state,
    merge = (persisted, current) => ({ ...current, ...persisted }),
    debounce = 100,
    onReady,
    onError,
  } = config

  // State
  let store: Store<T, object> | null = null
  let hydrated = false
  let persisting = false
  let lastPersistedAt: number | null = null
  let pendingWrites = 0
  let isPaused = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let unsubscribe: (() => void) | null = null

  // Storage key
  const storageKey = `sthira:${key}`

  // Get adapter
  const getAdapter = (): StorageAdapter => {
    if (customAdapter) return customAdapter
    switch (storage) {
      case 'indexeddb':
        return getIndexedDBAdapter({ dbName: `sthira-${key}` })
      case 'memory':
        return createMemoryAdapter()
      default:
        return getLocalStorageAdapter()
    }
  }

  const adapter = getAdapter()

  /**
   * Persist current state to storage
   */
  async function persistState(): Promise<void> {
    if (!store || isPaused || persisting) return

    persisting = true
    pendingWrites++

    try {
      const currentState = store.getState()
      const partialState = partialize(currentState)

      const data: PersistedData<Partial<T>> = {
        version,
        state: partialState,
        timestamp: Date.now(),
      }

      const encoded = serializer.encode(data)
      await adapter.setItem(storageKey, encoded)

      lastPersistedAt = Date.now()
    } catch (error) {
      onError?.(error as Error)
      console.error('[Sthira Persist] Failed to persist:', error)
    } finally {
      pendingWrites--
      persisting = false
    }
  }

  /**
   * Schedule debounced persist
   */
  function schedulePersist(): void {
    if (isPaused) return

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      persistState()
    }, debounce)
  }

  /**
   * Hydrate state from storage
   */
  async function hydrateState(): Promise<void> {
    if (!store) return

    try {
      const encoded = await adapter.getItem(storageKey)

      if (!encoded) {
        hydrated = true
        onReady?.(store.getState())
        return
      }

      const data = serializer.decode<PersistedData<Partial<T>>>(encoded)
      let restoredState = data.state

      // Migration if version mismatch
      if (data.version !== version && migrate) {
        restoredState = migrate(data.state, data.version) as Partial<T>
      }

      // Merge with current state
      const currentState = store.getState()
      const mergedState = merge(restoredState, currentState)

      // Update store silently
      store.setState(mergedState as Partial<T>, { silent: true })

      hydrated = true
      lastPersistedAt = data.timestamp

      onReady?.(store.getState())
    } catch (error) {
      onError?.(error as Error)
      console.error('[Sthira Persist] Failed to hydrate:', error)
      hydrated = true // Unblock UI
    }
  }

  // Browser event handlers
  function handleVisibilityChange(): void {
    if (document.hidden && pendingWrites > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      persistState()
    }
  }

  function handleBeforeUnload(): void {
    if (pendingWrites > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      persistState()
    }
  }

  // Public API
  const api: PersistApi = {
    hydrate: hydrateState,
    persist: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      await persistState()
    },
    clear: async () => {
      await adapter.removeItem(storageKey)
      lastPersistedAt = null
    },
    pause: () => {
      isPaused = true
    },
    resume: () => {
      isPaused = false
    },
    getStatus: () => ({ hydrated, persisting, lastPersistedAt }),
  }

  // Plugin definition
  const plugin: Plugin<T> = {
    name: 'persist',
    version: '1.0.0',

    onInit: (s: Store<T, object>) => {
      store = s

      // Subscribe to state changes
      unsubscribe = store.subscribe(() => {
        schedulePersist()
      })

      // Browser event listeners
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange)
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', handleBeforeUnload)
      }

      // Auto-hydrate
      hydrateState()
    },

    onDestroy: async () => {
      // Flush pending writes
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      if (pendingWrites > 0) {
        await persistState()
      }

      // Cleanup
      unsubscribe?.()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    },

    extend: () => ({ persist: api }),
  }

  return Object.assign(plugin, { api })
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Wait for hydration to complete
 */
export function waitForHydration(api: PersistApi, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function check(): void {
      if (api.getStatus().hydrated) {
        resolve()
        return
      }

      if (Date.now() - start > timeoutMs) {
        reject(new Error('[Sthira Persist] Hydration timeout'))
        return
      }

      setTimeout(check, 10)
    }

    check()
  })
}
