# @Sthira/perf

Performance utilities for Sthira: batching, scheduling, and memory monitoring.

## Installation

```bash
pnpm add @Sthira/perf
```

## Quick Start

```typescript
import { createBatcher, getScheduler, MemoryMonitor } from '@Sthira/perf'

// Batch rapid state updates
const batcher = createBatcher(store, { maxWait: 16 })
batcher.set({ a: 1 })
batcher.set({ b: 2 })
// Single update: { a: 1, b: 2 }
```

## API Reference

### `createBatcher(store, options)`

Batch multiple state updates into one:

```typescript
interface BatchOptions {
  maxWait?: number // Max wait time (ms), default: 16
  maxSize?: number // Max batch size, default: 100
  merger?: MergerFn // Custom merger function
}

const batcher = createBatcher(store, { maxWait: 16 })

batcher.set({ count: 1 })
batcher.set({ count: 2 })
batcher.set({ count: 3 })
// Batched into single update after 16ms

batcher.flush() // Force flush immediately
```

### `TaskScheduler`

Priority-based task scheduling:

```typescript
import { TaskScheduler, getScheduler } from '@Sthira/perf'

const scheduler = getScheduler()

// Schedule with priority
scheduler.schedule({
  id: 'render',
  priority: 'high', // 'critical' | 'high' | 'normal' | 'low' | 'idle'
  task: () => updateUI(),
})

scheduler.schedule({
  id: 'analytics',
  priority: 'idle',
  task: () => sendAnalytics(),
})

// High priority runs first
```

### `chunked(array, chunkSize, processor)`

Process large arrays in chunks to avoid blocking:

```typescript
import { chunked } from '@Sthira/perf'

const items = Array.from({ length: 10000 }, (_, i) => i)

await chunked(items, 100, async (chunk) => {
  for (const item of chunk) {
    processItem(item)
  }
})
// Yields to main thread between chunks
```

### `yieldToMain()`

Yield control to main thread:

```typescript
import { yieldToMain } from '@Sthira/perf'

async function heavyTask() {
  for (let i = 0; i < 1000; i++) {
    if (i % 100 === 0) await yieldToMain()
    processItem(i)
  }
}
```

### `MemoryMonitor`

Monitor memory pressure:

```typescript
import { MemoryMonitor, getMemoryMonitor } from '@Sthira/perf'

const monitor = getMemoryMonitor()

monitor.subscribe((pressure) => {
  if (pressure === 'critical') {
    // Clear caches, reduce memory
    cache.clear()
  }
})

// Manual check
const pressure = monitor.getPressure() // 'normal' | 'moderate' | 'critical'
const info = monitor.getInfo() // { usedJSHeapSize, totalJSHeapSize, ... }
```

### `createDebounced(fn, delay)`

Debounce function calls:

```typescript
import { createDebounced } from '@Sthira/perf'

const debouncedSearch = createDebounced((query: string) => api.search(query), 300)

// Only last call executes after 300ms
debouncedSearch('a')
debouncedSearch('ab')
debouncedSearch('abc') // ← This one runs

// Cancel pending
debouncedSearch.cancel()
```

### `createPausable(fn)`

Create pausable async operations:

```typescript
import { createPausable } from '@Sthira/perf'

const pausable = createPausable(async () => {
  for (const item of items) {
    await processItem(item)
  }
})

pausable.start()
pausable.pause() // Pause execution
pausable.resume() // Resume
pausable.cancel() // Cancel entirely
```

## React Integration

```typescript
import { createReactBatcher } from '@Sthira/perf'

// Uses React's scheduler for optimal batching
const batcher = createReactBatcher(store)
```

## Exports

```typescript
// Batching
export { createBatcher, createReactBatcher, defaultMerger, deepMerger }

// Scheduler
export { TaskScheduler, getScheduler, chunked, yieldToMain }

// Memory
export { MemoryMonitor, getMemoryMonitor, getMemoryInfo, getMemoryPressure }

// Utilities
export { createDebounced, createPausable }

// Types
export type { BatchOptions, TaskPriority, MemoryPressure, ... }
```

## License

MIT
