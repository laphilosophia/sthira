# Performance Plugin

Monitor and optimize state management performance.

## Installation

```bash
npm install @sthirajs/perf
```

## Quick Start

```typescript
import { createStore } from '@sthirajs/core';
import { createPerfPlugin } from '@sthirajs/perf';

const dataStore = createStore({
  name: 'data',
  state: { items: [] },
  plugins: [
    createPerfPlugin({
      logSlowActions: true,
      slowThresholdMs: 16, // Flag actions taking > 1 frame (16ms)
    }),
  ],
});
```

## Features

### Slow Action Detection

Automatically detect and log actions that take too long:

```
⚠️ [Sthira Perf] Slow action detected:
   Store: data
   Action: processLargeDataset
   Duration: 145ms (threshold: 16ms)
   State size: 2.3 MB
```

### Memory Monitoring

Track state memory usage over time:

```typescript
const perf = createPerfPlugin({
  trackMemory: true,
  memoryWarningThreshold: 10 * 1024 * 1024, // 10 MB
});
```

### Performance Metrics

Collect detailed metrics for analysis:

```typescript
// Get current metrics
const metrics = store.perf.getMetrics();

console.log(metrics);
// {
//   actionCount: 156,
//   averageActionTime: 2.3,
//   slowActionCount: 3,
//   stateSize: 1024000,
//   memoryWarnings: 0,
//   lastActionTime: 1.2,
// }
```

## Configuration

```typescript
createPerfPlugin({
  // Slow action detection
  logSlowActions: true, // Log slow actions to console
  slowThresholdMs: 16, // Threshold in milliseconds

  // Memory monitoring
  trackMemory: true, // Track state size
  memoryWarningThreshold: 5 * 1024 * 1024, // 5 MB warning

  // Callbacks
  onSlowAction: (info) => {
    analytics.track('slow_action', info);
  },
  onMemoryWarning: (info) => {
    console.warn('Memory warning:', info);
  },

  // Sampling (for high-frequency stores)
  sampleRate: 1.0, // 1.0 = every action, 0.1 = 10% of actions
});
```

### Options Reference

| Option                   | Type             | Default   | Description                      |
| ------------------------ | ---------------- | --------- | -------------------------------- |
| `logSlowActions`         | `boolean`        | `true`    | Log slow actions to console      |
| `slowThresholdMs`        | `number`         | `16`      | Slow action threshold (ms)       |
| `trackMemory`            | `boolean`        | `false`   | Track state memory usage         |
| `memoryWarningThreshold` | `number`         | `5242880` | Memory warning threshold (bytes) |
| `onSlowAction`           | `(info) => void` | —         | Callback for slow actions        |
| `onMemoryWarning`        | `(info) => void` | —         | Callback for memory warnings     |
| `sampleRate`             | `number`         | `1.0`     | Sampling rate (0.0 - 1.0)        |

## Batcher

Batch multiple rapid state updates for better performance:

```typescript
import { createBatcher } from '@sthirajs/perf';

const batcher = createBatcher({
  wait: 16, // Batch window (ms)
  maxWait: 100, // Force flush after this time
});

// Instead of multiple rapid updates...
for (const item of items) {
  // ❌ This triggers 1000 re-renders
  store.actions.addItem(item);
}

// Use batching
batcher.batch(() => {
  for (const item of items) {
    // ✅ This triggers 1 re-render
    store.actions.addItem(item);
  }
});
```

### React Integration

```tsx
import { useBatcher } from '@sthirajs/perf';

function BulkEditor() {
  const batcher = useBatcher({ wait: 50 });

  const handleBulkUpdate = (items: Item[]) => {
    batcher.batch(() => {
      items.forEach((item) => {
        store.actions.updateItem(item);
      });
    });
  };

  return <button onClick={() => handleBulkUpdate(data)}>Update All</button>;
}
```

## Scheduler

Schedule heavy computations to avoid blocking the main thread:

```typescript
import { createScheduler } from '@sthirajs/perf';

const scheduler = createScheduler();

// Schedule work during idle time
scheduler.scheduleIdle(async () => {
  // Heavy computation that won't block UI
  const processed = await processLargeDataset(data);
  store.actions.setProcessedData(processed);
});

// Schedule work for next frame
scheduler.scheduleFrame(() => {
  // Visual updates
  store.actions.updateUI(newState);
});
```

## Memory Estimation

Estimate the size of your state:

```typescript
import { estimateSize } from '@sthirajs/perf';

const state = store.getState();
const sizeInBytes = estimateSize(state);

console.log(`State size: ${(sizeInBytes / 1024).toFixed(2)} KB`);
```

## API Reference

The plugin extends the store with a `perf` API:

```typescript
const store = createStore({
  name: 'app',
  state: { ... },
  plugins: [createPerfPlugin()],
});

// Get performance metrics
const metrics = store.perf.getMetrics();

// Reset metrics
store.perf.resetMetrics();

// Get action timing history
const history = store.perf.getActionHistory();
// [
//   { action: 'addItem', duration: 2.3, timestamp: 1702..., stateSize: 1024 },
//   { action: 'removeItem', duration: 1.1, timestamp: 1702..., stateSize: 980 },
// ]
```

## Performance Patterns

### Avoid Large Arrays in State

```typescript
// ❌ Bad: 10,000 items in state
const store = createStore({
  state: { items: new Array(10000).fill(...) },
});

// ✅ Good: Paginate or virtualize
const store = createStore({
  state: {
    visibleItems: [],  // Only visible items
    totalCount: 10000,
    page: 0,
  },
});
```

### Use Selectors for Derived Data

```typescript
// ❌ Bad: Computing in render
function TodoList() {
  const { items } = useStore(todoStore);
  const activeItems = items.filter((t) => !t.done); // Runs every render
  return <List items={activeItems} />;
}

// ✅ Good: Memoized selector
const selectActiveItems = (state) => state.items.filter((t) => !t.done);

function TodoList() {
  const activeItems = useSelector(todoStore, selectActiveItems, shallowEqual);
  return <List items={activeItems} />;
}
```

### Batch Rapid Updates

```typescript
// ❌ Bad: Multiple updates in rapid succession
websocket.on('message', (data) => {
  store.actions.addMessage(data); // 60 updates/second = jank
});

// ✅ Good: Batch updates
const messageBuffer = [];
websocket.on('message', (data) => {
  messageBuffer.push(data);
});

setInterval(() => {
  if (messageBuffer.length > 0) {
    store.actions.addMessages([...messageBuffer]);
    messageBuffer.length = 0;
  }
}, 100);
```

## Production Monitoring

Send metrics to your analytics service:

```typescript
createPerfPlugin({
  onSlowAction: (info) => {
    analytics.track('sthira_slow_action', {
      store: info.store,
      action: info.action,
      duration: info.duration,
      stateSize: info.stateSize,
    });
  },
  onMemoryWarning: (info) => {
    analytics.track('sthira_memory_warning', {
      store: info.store,
      stateSize: info.stateSize,
      threshold: info.threshold,
    });
  },
});
```

## Best Practices

1. **Set appropriate thresholds**: 16ms for UI-critical stores, higher for background stores
2. **Use sampling** for high-frequency stores to reduce overhead
3. **Batch rapid updates** to prevent render storms
4. **Monitor in production** to catch performance regressions
5. **Profile with DevTools** for detailed analysis

## Next Steps

- **[Chunked](./chunked.md)**: Handle large arrays efficiently
- **[DevTools](./devtools.md)**: Debug with time-travel
