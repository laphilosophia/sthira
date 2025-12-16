import type { ChannelAdapter, SyncMessage } from './types';

/**
 * BroadcastChannel adapter
 * Uses native BroadcastChannel API for cross-tab communication
 */
export function createBroadcastChannelAdapter(channelName: string): ChannelAdapter {
  if (typeof BroadcastChannel === 'undefined') {
    throw new Error('[Sthira CrossTab] BroadcastChannel API not available');
  }

  const channel = new BroadcastChannel(channelName);
  const listeners = new Set<(message: SyncMessage) => void>();

  // Listen for messages
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    for (const listener of listeners) {
      try {
        listener(event.data);
      } catch (error) {
        console.error('[Sthira CrossTab] Listener error:', error);
      }
    }
  };

  return {
    name: 'broadcast-channel',

    postMessage<T>(message: SyncMessage<T>): void {
      channel.postMessage(message);
    },

    subscribe<T>(callback: (message: SyncMessage<T>) => void): () => void {
      const listener = callback as (message: SyncMessage) => void;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    close(): void {
      channel.close();
      listeners.clear();
    },
  };
}

/**
 * localStorage adapter (fallback)
 * Uses storage events for cross-tab communication
 */
export function createLocalStorageAdapter(channelName: string): ChannelAdapter {
  if (typeof localStorage === 'undefined' || typeof window === 'undefined') {
    throw new Error('[Sthira CrossTab] localStorage/window not available');
  }

  const storageKey = `sthira:cross-tab:${channelName}`;
  const listeners = new Set<(message: SyncMessage) => void>();

  // Listen for storage events
  function handleStorage(event: StorageEvent): void {
    if (event.key !== storageKey || !event.newValue) return;

    try {
      const message = JSON.parse(event.newValue) as SyncMessage;
      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          console.error('[Sthira CrossTab] Listener error:', error);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  window.addEventListener('storage', handleStorage);

  return {
    name: 'localstorage',

    postMessage<T>(message: SyncMessage<T>): void {
      localStorage.setItem(storageKey, JSON.stringify(message));
      // Immediately remove to allow same-message re-broadcast
      localStorage.removeItem(storageKey);
    },

    subscribe<T>(callback: (message: SyncMessage<T>) => void): () => void {
      const listener = callback as (message: SyncMessage) => void;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    close(): void {
      window.removeEventListener('storage', handleStorage);
      listeners.clear();
    },
  };
}

/**
 * Get best available adapter
 */
export function getDefaultAdapter(channelName: string): ChannelAdapter {
  // Prefer BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    return createBroadcastChannelAdapter(channelName);
  }

  // Fallback to localStorage
  if (typeof localStorage !== 'undefined' && typeof window !== 'undefined') {
    return createLocalStorageAdapter(channelName);
  }

  throw new Error('[Sthira CrossTab] No available adapter (requires browser environment)');
}
