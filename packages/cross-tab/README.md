# @sthira/cross-tab

Cross-tab synchronization plugin for sthira using BroadcastChannel.

## Installation

```bash
pnpm add @sthira/cross-tab
```

## Quick Start

```typescript
import { createStore } from '@sthira/core';
import { createSyncPlugin } from '@sthira/cross-tab';

const store = createStore({
  name: 'app',
  state: { user: null, data: [] },
  plugins: [createSyncPlugin({ channel: 'my-app' })],
});

// State changes automatically sync across tabs
store.setState({ user: { id: 1, name: 'John' } });
// Other tabs receive this update instantly
```

## Plugin API

```typescript
interface SyncPluginConfig {
  channel: string; // BroadcastChannel name
  throttle?: number; // Sync throttle (ms)
}

// API exposed on store.sync
interface SyncApi {
  broadcast: () => void; // Force broadcast current state
  disconnect: () => void; // Stop syncing
  getStatus: () => {
    tabId: string; // Current tab identifier
    connected: boolean; // Sync active
    lastSyncAt: number | null; // Last sync timestamp
  };
}
```

## Use Cases

- **Shopping cart** - Items added in one tab appear in all tabs
- **Auth state** - Login/logout syncs across tabs
- **User preferences** - Theme/language changes sync instantly
- **Real-time data** - Updates propagate to all tabs

## Tab Leader Election

```typescript
// Only leader tab performs expensive operations
store.sync.getStatus().isLeader; // true for one tab only
```

## License

MIT
