# Cross-Tab Sync Plugin

Synchronize state instantly across multiple browser tabs and windows.

## Installation

```bash
npm install @sthirajs/cross-tab
```

## Quick Start

```typescript
import { createStore } from '@sthirajs/core';
import { createSyncPlugin } from '@sthirajs/cross-tab';

const authStore = createStore({
  name: 'auth',
  state: {
    user: null,
    token: null,
    isLoggedIn: false,
  },
  plugins: [
    createSyncPlugin({
      channel: 'auth-sync',
    }),
  ],
});
```

Now when a user logs in on **Tab A**, all other tabs instantly receive the update — no page refresh needed.

## How It Works

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│   Tab A     │     │  BroadcastChannel   │     │   Tab B     │
│             │     │   (auth-sync)       │     │             │
│ login(user) │────▶│                     │────▶│ state.user  │
│             │     │                     │     │  = user     │
└─────────────┘     └─────────────────────┘     └─────────────┘
```

1. **Action in Tab A**: You call `authStore.actions.login(user)`
2. **Broadcast**: The plugin broadcasts the new state via `BroadcastChannel`
3. **Receive in Tab B**: Other tabs receive the message and update their state
4. **React Components Re-render**: UI updates automatically

## Configuration Options

```typescript
createSyncPlugin({
  channel: 'my-channel', // Channel name (default: store name)
  debounce: 50, // Debounce broadcasts (ms)
  onConflict: (local, remote) => remote, // Conflict resolution
  filter: (state) => state, // Filter what gets synced
});
```

### Options Reference

| Option       | Type                       | Default    | Description                         |
| ------------ | -------------------------- | ---------- | ----------------------------------- |
| `channel`    | `string`                   | Store name | BroadcastChannel name               |
| `debounce`   | `number`                   | `50`       | Milliseconds to debounce broadcasts |
| `onConflict` | `(local, remote) => state` | Use remote | Conflict resolution strategy        |
| `filter`     | `(state) => partial`       | —          | Filter which fields to sync         |

## Use Cases

### Authentication State

Keep login state consistent across tabs:

```typescript
const authStore = createStore({
  name: 'auth',
  state: { user: null, token: null },
  actions: (set) => ({
    login: (user, token) => set({ user, token }),
    logout: () => set({ user: null, token: null }),
  }),
  plugins: [createSyncPlugin()],
});

// When user logs out in Tab A, all tabs log out instantly
```

### Shopping Cart

Sync cart items in real-time:

```typescript
const cartStore = createStore({
  name: 'cart',
  state: { items: [], total: 0 },
  plugins: [createSyncPlugin()],
});

// Add item in Tab A, see it appear in Tab B
```

### User Preferences

Sync theme, language, and other preferences:

```typescript
const preferencesStore = createStore({
  name: 'preferences',
  state: { theme: 'light', fontSize: 'medium' },
  plugins: [createSyncPlugin()],
});

// Change theme in Tab A, all tabs update
```

## Conflict Resolution

When two tabs update state simultaneously, use `onConflict`:

```typescript
createSyncPlugin({
  onConflict: (localState, remoteState) => {
    // Strategy 1: Remote wins (default)
    return remoteState;

    // Strategy 2: Local wins
    return localState;

    // Strategy 3: Merge
    return {
      ...localState,
      ...remoteState,
      lastModified: Math.max(localState.lastModified, remoteState.lastModified),
    };

    // Strategy 4: Timestamp-based
    return localState.updatedAt > remoteState.updatedAt ? localState : remoteState;
  },
});
```

## Selective Sync

Only sync specific fields:

```typescript
const userStore = createStore({
  name: 'user',
  state: {
    profile: { name: '', avatar: '' }, // Sync this
    ui: { sidebarOpen: false }, // Don't sync (tab-specific)
  },
  plugins: [
    createSyncPlugin({
      filter: (state) => ({
        profile: state.profile,
        // ui is excluded from sync
      }),
    }),
  ],
});
```

## API Reference

The plugin extends the store with a `sync` API:

```typescript
const store = createStore({
  name: 'app',
  state: { ... },
  plugins: [createSyncPlugin()],
});

// Force broadcast current state
store.sync.broadcast();

// Disconnect from channel
store.sync.disconnect();

// Check sync status
const { connected, tabId, lastSyncAt } = store.sync.getStatus();
```

## Shorthand Syntax

```typescript
const store = createStore({
  name: 'my-store',
  state: { ... },
  sync: true,  // Uses store name as channel
});

// Or with options
const store = createStore({
  name: 'my-store',
  state: { ... },
  sync: {
    channel: 'custom-channel',
    debounce: 100,
  },
});
```

## Combining with Persistence

Cross-tab sync works seamlessly with persistence:

```typescript
const store = createStore({
  name: 'app',
  state: { ... },
  persist: true,  // Save to localStorage
  sync: true,     // Sync across tabs
});
```

**Order of operations**:

1. Store created with initial state
2. Persistence plugin hydrates from storage
3. Sync plugin connects to channel
4. On state change: save to storage + broadcast to tabs

## Browser Support

Cross-tab sync uses the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel):

| Browser | Support  |
| ------- | -------- |
| Chrome  | ✅ 54+   |
| Firefox | ✅ 38+   |
| Safari  | ✅ 15.4+ |
| Edge    | ✅ 79+   |
| IE      | ❌       |

For Safari < 15.4, the plugin gracefully falls back to no-op.

## Best Practices

1. **Use specific channel names**: Avoid conflicts with other apps
2. **Implement conflict resolution** for collaborative features
3. **Filter large data**: Don't sync megabytes of data
4. **Combine with persistence** for complete data durability
5. **Consider debounce** for frequently-updated state

## Next Steps

- **[Persistence](./persistence.md)**: Save state to storage
- **[DevTools](./devtools.md)**: Debug with time-travel
