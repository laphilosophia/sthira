import type { LocalStorageOptions, StorageAdapter } from '../types';

/**
 * localStorage storage adapter
 * Simple, synchronous, limited to ~5MB, string-only (we convert to/from base64)
 */
export function createLocalStorageAdapter(options: LocalStorageOptions = {}): StorageAdapter {
  const { prefix = 'sthira:' } = options;

  function getKey(key: string): string {
    return `${prefix}${key}`;
  }

  return {
    name: 'localstorage',

    isAvailable(): boolean {
      try {
        const test = '__sthira_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    },

    async getItem(key: string): Promise<Uint8Array | null> {
      try {
        const data = localStorage.getItem(getKey(key));
        if (data === null) return null;

        // Decode base64 to Uint8Array
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch {
        return null;
      }
    },

    async setItem(key: string, value: Uint8Array): Promise<void> {
      // Encode Uint8Array to base64
      const binary = String.fromCharCode(...value);
      const base64 = btoa(binary);
      localStorage.setItem(getKey(key), base64);
    },

    async removeItem(key: string): Promise<void> {
      localStorage.removeItem(getKey(key));
    },

    async clear(keyPrefix?: string): Promise<void> {
      const fullPrefix = keyPrefix ? `${prefix}${keyPrefix}` : prefix;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    },

    async keys(keyPrefix?: string): Promise<string[]> {
      const fullPrefix = keyPrefix ? `${prefix}${keyPrefix}` : prefix;
      const result: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          // Remove prefix from returned keys
          result.push(key.slice(prefix.length));
        }
      }

      return result;
    },

    async getSize(): Promise<number> {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            // Base64 string length
            totalSize += value.length;
          }
        }
      }
      return totalSize;
    },
  };
}

// Default instance
let defaultAdapter: StorageAdapter | null = null;

export function getLocalStorageAdapter(options?: LocalStorageOptions): StorageAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createLocalStorageAdapter(options);
  }
  return defaultAdapter;
}
