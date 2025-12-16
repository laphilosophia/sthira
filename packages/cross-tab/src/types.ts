// ============================================================================
// Cross-Tab Sync Types
// ============================================================================

/**
 * Sync message types
 */
export type SyncMessageType =
  | 'state_update'
  | 'request_state'
  | 'state_response'
  | 'lock'
  | 'unlock';

/**
 * Sync message
 */
export interface SyncMessage<T = unknown> {
  type: SyncMessageType;
  storeName: string;
  tabId: string;
  timestamp: number;
  state?: T;
  version?: number;
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';

/**
 * Conflict resolver function
 */
export type ConflictResolver<T> = (local: T, remote: T, timestamp: number) => T;

/**
 * Channel adapter interface
 */
export interface ChannelAdapter {
  readonly name: string;

  /** Post message to other tabs */
  postMessage<T>(message: SyncMessage<T>): void;

  /** Subscribe to messages */
  subscribe<T>(callback: (message: SyncMessage<T>) => void): () => void;

  /** Close the channel */
  close(): void;
}

/**
 * Cross-tab sync configuration
 */
export interface CrossTabConfig<T> {
  /** Channel name (default: store name) */
  channelName?: string;

  /** Conflict resolution strategy */
  strategy?: ConflictStrategy;

  /** Custom conflict resolver (for 'manual' strategy) */
  resolver?: ConflictResolver<T>;

  /** Debounce time for broadcasts (ms) */
  debounceMs?: number;

  /** Request state from other tabs on connect */
  syncOnConnect?: boolean;

  /** Custom channel adapter */
  adapter?: ChannelAdapter;
}

/**
 * Cross-tab sync state
 */
export interface CrossTabState {
  /** Current tab ID */
  tabId: string;

  /** Whether leader (first tab) */
  isLeader: boolean;

  /** Number of connected tabs */
  connectedTabs: number;

  /** Last sync timestamp */
  lastSyncAt: number | null;
}

/**
 * Cross-tab sync API
 */
export interface CrossTabApi {
  /** Get sync state */
  getState(): CrossTabState;

  /** Broadcast current state to all tabs */
  broadcast(): void;

  /** Request state from other tabs */
  requestState(): void;

  /** Pause syncing */
  pause(): void;

  /** Resume syncing */
  resume(): void;

  /** Disconnect and cleanup */
  disconnect(): void;
}
