// ============================================================================
// @sthira/cross-tab - Cross-tab state synchronization for Sthira
// ============================================================================

// Plugin
export { createNoopSyncApi, createSyncPlugin } from './plugin'
export type { SyncApi, SyncConfig } from './plugin'

// Channels
export {
  createBroadcastChannelAdapter,
  createLocalStorageAdapter,
  getDefaultAdapter,
} from './channel'

// Types
export type {
  ChannelAdapter,
  ConflictResolver,
  ConflictStrategy,
  CrossTabState,
  SyncMessage,
  SyncMessageType,
} from './types'
