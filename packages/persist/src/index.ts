// ============================================================================
// @sthira/persist - Persistence layer for Sthira
// ============================================================================

// Plugin
export { createPersistPlugin, waitForHydration } from './plugin'
export type { PersistApi, PersistConfig } from './plugin'

// Serialization
export {
  createSerializer,
  getSerializer,
  isMsgpackAvailable,
  jsonSerializer,
  loadMsgpack,
  msgpackSerializer,
} from './serialization'

// Adapters
export { createIndexedDBAdapter, getIndexedDBAdapter } from './adapters/indexeddb'
export { createLocalStorageAdapter, getLocalStorageAdapter } from './adapters/localstorage'
export { createMemoryAdapter } from './adapters/memory'

// Types
export type {
  IndexedDBOptions,
  LocalStorageOptions,
  PersistedData,
  SerializationFormat,
  Serializer,
  StorageAdapter,
} from './types'
