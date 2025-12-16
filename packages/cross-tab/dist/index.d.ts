import { Plugin } from '@sthira/core';

/**
 * Sync message types
 */
type SyncMessageType = 'state_update' | 'request_state' | 'state_response' | 'lock' | 'unlock';
/**
 * Sync message
 */
interface SyncMessage<T = unknown> {
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
type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
/**
 * Conflict resolver function
 */
type ConflictResolver<T> = (local: T, remote: T, timestamp: number) => T;
/**
 * Channel adapter interface
 */
interface ChannelAdapter {
    readonly name: string;
    /** Post message to other tabs */
    postMessage<T>(message: SyncMessage<T>): void;
    /** Subscribe to messages */
    subscribe<T>(callback: (message: SyncMessage<T>) => void): () => void;
    /** Close the channel */
    close(): void;
}
/**
 * Cross-tab sync state
 */
interface CrossTabState {
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
 * Cross-tab sync configuration
 */
interface SyncConfig<T = unknown> {
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
interface SyncApi {
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
    getStatus: () => {
        connected: boolean;
        tabId: string;
        lastSyncAt: number | null;
    };
}
/**
 * Create cross-tab sync plugin
 */
declare function createSyncPlugin<T extends object>(config: SyncConfig<T>): Plugin<T> & {
    api: SyncApi;
};
/**
 * Create no-op sync API (SSR safe)
 */
declare function createNoopSyncApi(): SyncApi;

/**
 * BroadcastChannel adapter
 * Uses native BroadcastChannel API for cross-tab communication
 */
declare function createBroadcastChannelAdapter(channelName: string): ChannelAdapter;
/**
 * localStorage adapter (fallback)
 * Uses storage events for cross-tab communication
 */
declare function createLocalStorageAdapter(channelName: string): ChannelAdapter;
/**
 * Get best available adapter
 */
declare function getDefaultAdapter(channelName: string): ChannelAdapter;

export { type ChannelAdapter, type ConflictResolver, type ConflictStrategy, type CrossTabState, type SyncApi, type SyncConfig, type SyncMessage, type SyncMessageType, createBroadcastChannelAdapter, createLocalStorageAdapter, createNoopSyncApi, createSyncPlugin, getDefaultAdapter };
