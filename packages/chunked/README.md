# @sthira/chunked

Size-aware virtual store with LRU caching for large datasets.

## Installation

```bash
pnpm add @sthira/chunked
```

## Quick Start

```typescript
import { createChunkedStore } from '@sthira/chunked'

const store = createChunkedStore({
  name: 'large-dataset',
  chunkSize: 1000, // Items per chunk
  maxChunks: 10, // Max chunks in memory
})

// Load data
await store.setChunk('page-1', largeArray.slice(0, 1000))
await store.setChunk('page-2', largeArray.slice(1000, 2000))

// Get data (auto-loads from cache or storage)
const chunk = await store.getChunk('page-1')
```

## API Reference

### `createChunkedStore(config)`

```typescript
interface ChunkedStoreConfig<T> {
  name: string // Store identifier
  chunkSize: number // Items per chunk
  maxChunks?: number // Max chunks in memory (LRU eviction)
  tiers?: TierConfig[] // Memory tier configuration
  onEvict?: (key: string, chunk: T[]) => void
}

const store = createChunkedStore<User>({
  name: 'users',
  chunkSize: 500,
  maxChunks: 20,
})

// API
await store.setChunk(key, data) // Set chunk
await store.getChunk(key) // Get chunk (loads if evicted)
store.hasChunk(key) // Check if in memory
store.deleteChunk(key) // Remove chunk
store.clear() // Clear all chunks
store.getKeys() // Get all chunk keys
store.getStats() // { totalChunks, memoryUsage, ... }
```

### `LRUCache`

Standalone LRU cache:

```typescript
import { LRUCache } from '@sthira/chunked'

const cache = new LRUCache<string, User[]>({
  maxSize: 10,
  onEvict: (key, value) => {
    console.log(`Evicted: ${key}`)
  },
})

cache.set('users-1', users)
cache.get('users-1') // Moves to front (most recently used)
cache.has('users-1')
cache.delete('users-1')
cache.clear()
```

### Memory Tiers

Configure different storage tiers based on access patterns:

```typescript
const store = createChunkedStore({
  name: 'products',
  chunkSize: 100,
  tiers: [
    { name: 'hot', maxSize: 5 }, // Frequently accessed
    { name: 'warm', maxSize: 10 }, // Occasionally accessed
    { name: 'cold', maxSize: 50 }, // Rarely accessed
  ],
})

// Chunks automatically move between tiers based on access
```

## Use Cases

### Large Tables

```typescript
// Virtual scrolling with chunked data
const tableStore = createChunkedStore<Row>({
  name: 'table-data',
  chunkSize: 50, // 50 rows per chunk
  maxChunks: 10, // 500 rows in memory max
})

// Load visible chunks
async function loadVisibleRows(startRow: number, endRow: number) {
  const startChunk = Math.floor(startRow / 50)
  const endChunk = Math.floor(endRow / 50)

  for (let i = startChunk; i <= endChunk; i++) {
    if (!tableStore.hasChunk(`chunk-${i}`)) {
      const data = await fetchRows(i * 50, 50)
      await tableStore.setChunk(`chunk-${i}`, data)
    }
  }
}
```

### Paginated Data

```typescript
const paginatedStore = createChunkedStore({
  name: 'search-results',
  chunkSize: 20, // 20 items per page
  maxChunks: 5, // Keep 5 pages in memory
})

async function loadPage(page: number) {
  const key = `page-${page}`
  if (!paginatedStore.hasChunk(key)) {
    const data = await api.search({ page, limit: 20 })
    await paginatedStore.setChunk(key, data)
  }
  return paginatedStore.getChunk(key)
}
```

### Time-Series Data

```typescript
const timeSeriesStore = createChunkedStore({
  name: 'metrics',
  chunkSize: 1000, // 1000 data points per chunk
  maxChunks: 24, // 24 hours in memory
  onEvict: (key, data) => {
    // Persist to IndexedDB on eviction
    persistToStorage(key, data)
  },
})
```

## Exports

```typescript
// Store
export { createChunkedStore }

// LRU Cache
export { LRUCache }

// Types
export type { ChunkedStoreConfig, Chunk, ChunkMeta, TierConfig, ... }
```

## License

MIT
