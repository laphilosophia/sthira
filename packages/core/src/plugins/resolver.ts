// ============================================================================
// @sthira/core - Plugin Resolver
// ============================================================================

/* eslint-disable @typescript-eslint/ban-ts-comment */

import type {
  DevToolsApi,
  DevToolsPluginConfig,
  PersistApi,
  PersistPluginConfig,
  Plugin,
  Store,
  StoreConfig,
  SyncApi,
  SyncPluginConfig,
} from '../types'

// ============================================================================
// Types
// ============================================================================

export interface ResolvedPlugins {
  persist?: { plugin: Plugin<object>; api: PersistApi }
  sync?: { plugin: Plugin<object>; api: SyncApi }
  devtools?: { plugin: Plugin<object>; api: DevToolsApi }
  plugins: Plugin<object>[]
}

// ============================================================================
// Lazy Plugin Factories
// ============================================================================

function createLazyPersistPlugin<T extends object>(
  config: PersistPluginConfig
): Plugin<T> & { api: PersistApi } {
  let hydrated = false
  let persisting = false
  let lastPersistedAt: number | null = null
  let realApi: PersistApi | null = null

  const api: PersistApi = {
    hydrate: async () => {
      if (realApi) await realApi.hydrate()
    },
    persist: async () => {
      if (realApi) await realApi.persist()
    },
    clear: async () => {
      if (realApi) await realApi.clear()
    },
    pause: () => {
      if (realApi) realApi.pause()
    },
    resume: () => {
      if (realApi) realApi.resume()
    },
    getStatus: () => realApi?.getStatus() ?? { hydrated, persisting, lastPersistedAt },
  }

  const plugin: Plugin<T> = {
    name: 'persist',
    version: '1.0.0',
    onInit: async (store: Store<T, object>) => {
      try {
        // @ts-expect-error - Optional dependency
        const { createPersistPlugin } = await import('@sthira/persist')
        const pluginInstance = createPersistPlugin({
          key: config.key,
          storage: config.storage,
          version: config.version,
          debounce: config.debounce,
          onReady: config.onReady,
          onError: config.onError,
        })
        realApi = pluginInstance.api
        await pluginInstance.onInit?.(store)
        hydrated = true
      } catch {
        console.warn('[Sthira] @sthira/persist not installed')
      }
    },
    onDestroy: async () => {
      if (realApi) await realApi.persist()
    },
    extend: () => ({ persist: api }),
  }

  return Object.assign(plugin, { api })
}

function createLazySyncPlugin<T extends object>(
  config: SyncPluginConfig
): Plugin<T> & { api: SyncApi } {
  let connected = false
  const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  let realApi: SyncApi | null = null

  const api: SyncApi = {
    broadcast: () => realApi?.broadcast(),
    disconnect: () => {
      realApi?.disconnect()
      connected = false
    },
    getStatus: () => realApi?.getStatus() ?? { connected, tabId, lastSyncAt: null },
  }

  const plugin: Plugin<T> = {
    name: 'sync',
    version: '1.0.0',
    onInit: async (store: Store<T, object>) => {
      try {
        // @ts-expect-error - Optional dependency
        const { createSyncPlugin } = await import('@sthira/cross-tab')
        const pluginInstance = createSyncPlugin({
          channel: config.channel,
          onConflict: config.onConflict,
          debounce: config.debounce,
        })
        realApi = pluginInstance.api
        await pluginInstance.onInit?.(store)
        connected = true
      } catch {
        console.warn('[Sthira] @sthira/cross-tab not installed')
      }
    },
    onDestroy: () => {
      api.disconnect()
    },
    extend: () => ({ sync: api }),
  }

  return Object.assign(plugin, { api })
}

function createLazyDevToolsPlugin<T extends object>(
  config: DevToolsPluginConfig,
  storeName: string
): Plugin<T> & { api: DevToolsApi } {
  let realApi: DevToolsApi | null = null

  const api: DevToolsApi = {
    export: () => {
      if (!realApi) return '{}'
      if (realApi.exportState) return realApi.exportState()
      return realApi.export()
    },
    import: (json) => {
      if (!realApi) return
      if (realApi.importState) realApi.importState(json)
      else realApi.import(json)
    },
  }

  const plugin: Plugin<T> = {
    name: 'devtools',
    version: '1.0.0',
    onInit: async (store: Store<T, object>) => {
      try {
        // @ts-expect-error - Optional dependency
        const { createDevToolsPlugin } = await import('@sthira/devtools')
        const pluginInstance = createDevToolsPlugin({
          name: config.name ?? storeName,
          maxAge: config.maxAge,
        })
        realApi = pluginInstance.api
        await pluginInstance.onInit?.(store)
      } catch {
        // Fallback: expose store on window
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any
          win.__STHIRA_STORES__ = win.__STHIRA_STORES__ ?? {}
          win.__STHIRA_STORES__[store.name] = store
        }
      }
    },
    onDestroy: () => {
      realApi?.disconnect?.()
    },
    extend: () => ({ devtools: api }),
  }

  return Object.assign(plugin, { api })
}

// ============================================================================
// Resolver
// ============================================================================

function normalizePersistConfig(
  config: boolean | PersistPluginConfig | undefined,
  storeName: string
): PersistPluginConfig | undefined {
  if (!config) return undefined
  if (config === true) return { key: storeName }
  return config
}

function normalizeSyncConfig(
  config: boolean | string | SyncPluginConfig | undefined,
  storeName: string
): SyncPluginConfig | undefined {
  if (!config) return undefined
  if (config === true) return { channel: storeName }
  if (typeof config === 'string') return { channel: config }
  return config
}

function normalizeDevToolsConfig(
  config: boolean | DevToolsPluginConfig | undefined
): DevToolsPluginConfig | undefined {
  if (!config) return undefined
  if (config === true) return {}
  return config
}

/**
 * Resolve declarative plugin config (sync function)
 */
export function resolvePlugins<T extends object, A extends object>(
  config: StoreConfig<T, A>,
  _store: Store<T, A>
): ResolvedPlugins {
  const result: ResolvedPlugins = {
    plugins: (config.plugins ?? []) as Plugin<object>[],
  }

  const persistConfig = normalizePersistConfig(config.persist, config.name)
  if (persistConfig) {
    const p = createLazyPersistPlugin(persistConfig)
    result.persist = { plugin: p as Plugin<object>, api: p.api }
  }

  const syncConfig = normalizeSyncConfig(config.sync, config.name)
  if (syncConfig) {
    const p = createLazySyncPlugin(syncConfig)
    result.sync = { plugin: p as Plugin<object>, api: p.api }
  }

  const devtoolsConfig = normalizeDevToolsConfig(config.devtools)
  if (devtoolsConfig) {
    const p = createLazyDevToolsPlugin(devtoolsConfig, config.name)
    result.devtools = { plugin: p as Plugin<object>, api: p.api }
  }

  return result
}

/**
 * Get all plugins
 */
export function getAllPlugins(resolved: ResolvedPlugins): Plugin<object>[] {
  const plugins = [...resolved.plugins]
  if (resolved.persist) plugins.push(resolved.persist.plugin)
  if (resolved.sync) plugins.push(resolved.sync.plugin)
  if (resolved.devtools) plugins.push(resolved.devtools.plugin)
  return plugins
}
