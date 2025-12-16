# Chunked Plugin

Virtual pagination and memory-efficient handling for large arrays.

## Installation

```bash
npm install @sthirajs/chunked
```

## The Problem

Large arrays in state cause two major issues:

1. **Memory**: 100,000 items × 1KB each = 100MB of memory
2. **Rendering**: React must diff and render all items

```typescript
// ❌ This will freeze your browser
const store = createStore({
  state: {
    items: new Array(100000).fill(...) // 100K items in memory
  },
});
```

## The Solution

Keep only what's needed in memory. Load and unload chunks on demand:

```typescript
import { createChunkedStore } from '@sthirajs/chunked';

const listStore = createChunkedStore({
  name: 'large-list',
  chunkSize: 50, // Items per chunk
  maxChunksInMemory: 5, // Max 5 chunks (250 items) in memory

  // Async loader for chunks
  loadChunk: async (chunkIndex) => {
    const offset = chunkIndex * 50;
    const response = await fetch(`/api/items?offset=${offset}&limit=50`);
    return response.json();
  },
});
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Virtual List                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │  0  │ │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │   │
│  │     │ │     │ │█████│ │█████│ │█████│ │     │ │     │   │
│  │ --- │ │ --- │ │LOAD │ │LOAD │ │LOAD │ │ --- │ │ --- │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                     ▲                                        │
│                     │ Viewport (visible area)               │
└─────────────────────────────────────────────────────────────┘

Only chunks 2, 3, 4 are loaded in memory.
Chunks 0, 1, 5, 6 are unloaded (LRU eviction).
```

## Configuration

```typescript
createChunkedStore({
  name: 'my-list',

  // Chunk settings
  chunkSize: 50,              // Items per chunk
  maxChunksInMemory: 10,      // Max chunks in memory (LRU eviction)

  // Data loading
  loadChunk: async (index) => { ... },  // Load chunk from source
  totalItems: 10000,          // Total item count (optional)

  // Storage adapter for evicted chunks (optional)
  storage: createIndexedDBAdapter({ dbName: 'list-cache' }),

  // Events
  onChunkLoad: (index, items) => { ... },
  onChunkEvict: (index) => { ... },
});
```

### Options Reference

| Option              | Type                      | Default | Description                                   |
| ------------------- | ------------------------- | ------- | --------------------------------------------- |
| `chunkSize`         | `number`                  | `50`    | Items per chunk                               |
| `maxChunksInMemory` | `number`                  | `10`    | Max chunks before LRU eviction                |
| `loadChunk`         | `(index) => Promise<T[]>` | —       | Async chunk loader                            |
| `totalItems`        | `number`                  | —       | Total item count (enables accurate scrollbar) |
| `storage`           | `StorageAdapter`          | —       | Storage for evicted chunks                    |

## Basic Usage

### Getting Items

```typescript
// Get a specific item (loads chunk if needed)
const item = await listStore.getItem(150);

// Get multiple items
const items = await listStore.getItems(100, 200);

// Get currently loaded range
const { startIndex, endIndex, items } = listStore.getLoadedRange();
```

### Loading Chunks

```typescript
// Load chunk for item index 150 (loads chunk 3 if chunkSize=50)
await listStore.loadChunkForIndex(150);

// Load specific chunk by index
await listStore.loadChunk(3);

// Preload adjacent chunks for smooth scrolling
await listStore.preloadAround(150, { before: 1, after: 2 });
```

### Windowing

```typescript
// Set visible range (for virtual scroll integration)
listStore.setVisibleRange(100, 150);

// Store automatically:
// 1. Loads required chunks
// 2. Evicts chunks outside the window
// 3. Preloads adjacent chunks
```

## React Integration

### With Virtual Scroll Libraries

Works with `react-window`, `react-virtualized`, or any virtual scroll library:

```tsx
import { FixedSizeList } from 'react-window';
import { useChunkedStore } from '@sthirajs/chunked';

function VirtualList() {
  const { items, loadedRange, setVisibleRange } = useChunkedStore(listStore);

  return (
    <FixedSizeList
      height={600}
      width={400}
      itemCount={10000}
      itemSize={50}
      onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
        setVisibleRange(visibleStartIndex, visibleStopIndex);
      }}
    >
      {({ index, style }) => {
        const item = items[index];

        if (!item) {
          return <div style={style}>Loading...</div>;
        }

        return <div style={style}>{item.name}</div>;
      }}
    </FixedSizeList>
  );
}
```

### Simple Hook Usage

```tsx
import { useChunkedStore } from '@sthirajs/chunked';

function ItemList() {
  const {
    items, // Currently loaded items
    totalCount, // Total items
    loadMore, // Load next chunk
    isLoading, // Loading state
  } = useChunkedStore(listStore);

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}

      {items.length < totalCount && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Storage Integration

Evicted chunks can be stored in IndexedDB for fast retrieval:

```typescript
import { createChunkedStore, createIndexedDBAdapter } from '@sthirajs/chunked';

const listStore = createChunkedStore({
  name: 'large-list',
  chunkSize: 50,
  maxChunksInMemory: 5,

  // Evicted chunks go to IndexedDB
  storage: createIndexedDBAdapter({
    dbName: 'my-app',
    storeName: 'list-chunks',
  }),

  loadChunk: async (index) => {
    // First check storage, then fetch from API
    const cached = await storage.getChunk(index);
    if (cached) return cached;

    const response = await fetch(`/api/items?chunk=${index}`);
    return response.json();
  },
});
```

## API Reference

```typescript
const store = createChunkedStore({ ... });

// Item access
await store.getItem(index);             // Get single item
await store.getItems(start, end);       // Get range of items

// Chunk management
await store.loadChunk(chunkIndex);      // Load specific chunk
await store.loadChunkForIndex(itemIndex); // Load chunk containing item
await store.preloadAround(index, { before: 1, after: 2 });

// Viewport management
store.setVisibleRange(start, end);      // Set visible window
store.getLoadedRange();                 // Get currently loaded range

// Cache control
store.evictChunk(chunkIndex);           // Manually evict chunk
store.clearCache();                     // Clear all cached chunks

// Metadata
store.getTotalCount();                  // Total item count
store.getChunkCount();                  // Number of chunks
store.getLoadedChunks();                // Array of loaded chunk indices
```

## Performance Tips

### Right-Size Your Chunks

```typescript
// Too small: Too many network requests
chunkSize: 10,  // ❌ 100 requests for 1000 items

// Too large: Long load times, memory waste
chunkSize: 1000,  // ❌ 10 seconds to load first chunk

// Just right: Balance between requests and load time
chunkSize: 50,  // ✅ 20 requests, ~100ms each
```

### Preload for Smooth Scrolling

```typescript
// Preload 2 chunks before and after visible area
store.setVisibleRange(100, 150, {
  preloadBefore: 2,
  preloadAfter: 2,
});
```

### Use Skeleton Loading

```tsx
function ItemRow({ item, isLoading }) {
  if (isLoading) {
    return <Skeleton height={50} />; // Better UX than "Loading..."
  }
  return <div>{item.name}</div>;
}
```

## Common Patterns

### Infinite Scroll

```tsx
function InfiniteList() {
  const { items, loadMore, hasMore, isLoading } = useChunkedStore(listStore);
  const observerRef = useRef<IntersectionObserver>();
  const lastItemRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMore],
  );

  return (
    <div>
      {items.map((item, index) => (
        <div key={item.id} ref={index === items.length - 1 ? lastItemRef : null}>
          {item.name}
        </div>
      ))}
      {isLoading && <Spinner />}
    </div>
  );
}
```

### Search with Chunking

```tsx
function SearchableList() {
  const [query, setQuery] = useState('');

  const store = useMemo(
    () =>
      createChunkedStore({
        name: 'search-results',
        chunkSize: 50,
        loadChunk: async (index) => {
          const response = await fetch(`/api/search?q=${query}&offset=${index * 50}&limit=50`);
          return response.json();
        },
      }),
    [query],
  );

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
      <ChunkedList store={store} />
    </div>
  );
}
```

## Next Steps

- **[Performance](./perf.md)**: Monitor performance
- **[Persistence](./persistence.md)**: Save state to storage
