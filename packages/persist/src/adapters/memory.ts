import type { StorageAdapter } from '../types'

/**
 * In-memory storage adapter
 * Useful for testing and SSR
 */
export function createMemoryAdapter(): StorageAdapter {
  const storage = new Map<string, Uint8Array>()

  return {
    name: 'memory',

    isAvailable(): boolean {
      return true
    },

    async getItem(key: string): Promise<Uint8Array | null> {
      return storage.get(key) ?? null
    },

    async setItem(key: string, value: Uint8Array): Promise<void> {
      storage.set(key, value)
    },

    async removeItem(key: string): Promise<void> {
      storage.delete(key)
    },

    async clear(prefix?: string): Promise<void> {
      if (!prefix) {
        storage.clear()
        return
      }

      for (const key of storage.keys()) {
        if (key.startsWith(prefix)) {
          storage.delete(key)
        }
      }
    },

    async keys(prefix?: string): Promise<string[]> {
      const allKeys = Array.from(storage.keys())
      if (!prefix) return allKeys
      return allKeys.filter((k) => k.startsWith(prefix))
    },

    async getSize(): Promise<number> {
      let totalSize = 0
      for (const value of storage.values()) {
        totalSize += value.byteLength
      }
      return totalSize
    },
  }
}
