import type { IndexedDBOptions, StorageAdapter } from '../types'

/**
 * IndexedDB storage adapter
 * Best for large data, async, binary-native
 */
export function createIndexedDBAdapter(options: IndexedDBOptions = {}): StorageAdapter {
  const { dbName = 'sthira', storeName = 'persist', dbVersion = 1 } = options

  let db: IDBDatabase | null = null
  let dbPromise: Promise<IDBDatabase> | null = null

  async function getDB(): Promise<IDBDatabase> {
    if (db) return db
    if (dbPromise) return dbPromise

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName)
        }
      }
    })

    return dbPromise
  }

  return {
    name: 'indexeddb',

    isAvailable(): boolean {
      return typeof indexedDB !== 'undefined'
    },

    async getItem(key: string): Promise<Uint8Array | null> {
      const database = await getDB()

      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.get(key)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const result = request.result
          if (result === undefined) {
            resolve(null)
          } else if (result instanceof Uint8Array) {
            resolve(result)
          } else if (result instanceof ArrayBuffer) {
            resolve(new Uint8Array(result))
          } else {
            // Legacy string data - convert
            resolve(new TextEncoder().encode(JSON.stringify(result)))
          }
        }
      })
    },

    async setItem(key: string, value: Uint8Array): Promise<void> {
      const database = await getDB()

      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.put(value, key)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    },

    async removeItem(key: string): Promise<void> {
      const database = await getDB()

      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.delete(key)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    },

    async clear(prefix?: string): Promise<void> {
      const database = await getDB()

      if (!prefix) {
        return new Promise((resolve, reject) => {
          const tx = database.transaction(storeName, 'readwrite')
          const store = tx.objectStore(storeName)
          const request = store.clear()

          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve()
        })
      }

      // Clear by prefix
      const keys = await this.keys(prefix)
      const tx = database.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)

      for (const key of keys) {
        store.delete(key)
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },

    async keys(prefix?: string): Promise<string[]> {
      const database = await getDB()

      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.getAllKeys()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          let keys = request.result as string[]
          if (prefix) {
            keys = keys.filter((k) => k.startsWith(prefix))
          }
          resolve(keys)
        }
      })
    },

    async getSize(): Promise<number> {
      const database = await getDB()

      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.getAll()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          let totalSize = 0
          for (const value of request.result) {
            if (value instanceof Uint8Array) {
              totalSize += value.byteLength
            } else if (value instanceof ArrayBuffer) {
              totalSize += value.byteLength
            }
          }
          resolve(totalSize)
        }
      })
    },
  }
}

// Default instance
let defaultAdapter: StorageAdapter | null = null

export function getIndexedDBAdapter(options?: IndexedDBOptions): StorageAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createIndexedDBAdapter(options)
  }
  return defaultAdapter
}
