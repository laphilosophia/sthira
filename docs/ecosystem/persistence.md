# Persistence Plugin

Automatically save and restore state to persistent storage.

## Installation

```bash
npm install @sthirajs/persist
```

## Quick Start

```typescript
import { createStore } from '@sthirajs/core';
import { createPersistPlugin } from '@sthirajs/persist';

const settingsStore = createStore({
  name: 'settings',
  state: {
    theme: 'light',
    language: 'en',
    notifications: true,
  },
  plugins: [
    createPersistPlugin({
      key: 'app-settings-v1',
    }),
  ],
});
```

State is now automatically:

- **Saved** to localStorage on every change (debounced)
- **Restored** when the store is created

## Configuration Options

```typescript
createPersistPlugin({
  key: 'my-store', // Storage key (required)
  storage: 'localStorage', // Storage adapter (default: 'localStorage')
  version: 1, // Schema version for migrations
  debounce: 100, // Debounce save operations (ms)
  serialize: JSON.stringify, // Custom serializer
  deserialize: JSON.parse, // Custom deserializer
  migrate: (state, version) => state, // Migration function
  partialize: (state) => state, // Select which parts to persist
  onReady: () => {}, // Called after hydration
  onError: (error) => {}, // Called on storage errors
});
```

### Options Reference

| Option        | Type                                                       | Default          | Description                    |
| ------------- | ---------------------------------------------------------- | ---------------- | ------------------------------ |
| `key`         | `string`                                                   | —                | Storage key prefix (required)  |
| `storage`     | `'localStorage'` \| `'sessionStorage'` \| `StorageAdapter` | `'localStorage'` | Where to store data            |
| `version`     | `number`                                                   | `1`              | Version number for migrations  |
| `debounce`    | `number`                                                   | `100`            | Milliseconds to debounce saves |
| `serialize`   | `(state) => string`                                        | `JSON.stringify` | Serialization function         |
| `deserialize` | `(string) => state`                                        | `JSON.parse`     | Deserialization function       |
| `migrate`     | `(state, version) => state`                                | —                | Migration function             |
| `partialize`  | `(state) => partial`                                       | —                | Select fields to persist       |
| `onReady`     | `() => void`                                               | —                | Callback after hydration       |
| `onError`     | `(error) => void`                                          | —                | Error handler                  |

## Storage Adapters

### localStorage (Default)

```typescript
createPersistPlugin({
  key: 'my-key',
  storage: 'localStorage',
});
```

### sessionStorage

```typescript
createPersistPlugin({
  key: 'my-key',
  storage: 'sessionStorage',
});
```

### IndexedDB

For larger data (> 5MB) or binary data:

```typescript
import { createIndexedDBAdapter } from '@sthirajs/persist';

createPersistPlugin({
  key: 'my-key',
  storage: createIndexedDBAdapter({
    dbName: 'my-app',
    storeName: 'state',
  }),
});
```

### Custom Adapter

Implement the `StorageAdapter` interface:

```typescript
const customAdapter: StorageAdapter = {
  getItem: async (key) => {
    return await myCustomStorage.get(key);
  },
  setItem: async (key, value) => {
    await myCustomStorage.set(key, value);
  },
  removeItem: async (key) => {
    await myCustomStorage.delete(key);
  },
};

createPersistPlugin({
  key: 'my-key',
  storage: customAdapter,
});
```

## Schema Migrations

When your state shape changes between versions, use migrations:

```typescript
createPersistPlugin({
  key: 'settings',
  version: 3,
  migrate: (persistedState, persistedVersion) => {
    let state = persistedState;

    // Migrate from v1 to v2
    if (persistedVersion < 2) {
      state = {
        ...state,
        // v2 added 'fontSize' field
        fontSize: 'medium',
      };
    }

    // Migrate from v2 to v3
    if (persistedVersion < 3) {
      state = {
        ...state,
        // v3 renamed 'darkMode' to 'theme'
        theme: state.darkMode ? 'dark' : 'light',
      };
      delete state.darkMode;
    }

    return state;
  },
});
```

## Partial Persistence

Only persist specific fields:

```typescript
const userStore = createStore({
  name: 'user',
  state: {
    profile: { name: '', email: '' }, // Persist this
    sessionToken: null, // Don't persist (sensitive)
    lastActivity: null, // Don't persist (transient)
  },
  plugins: [
    createPersistPlugin({
      key: 'user',
      partialize: (state) => ({
        profile: state.profile,
        // sessionToken and lastActivity are excluded
      }),
    }),
  ],
});
```

## API Reference

The plugin extends the store with a `persist` API:

```typescript
const store = createStore({
  name: 'app',
  state: { ... },
  plugins: [createPersistPlugin({ key: 'app' })],
});

// Manual hydration (if needed)
await store.persist.hydrate();

// Force persist immediately (bypass debounce)
await store.persist.persist();

// Clear persisted data
await store.persist.clear();

// Pause auto-persistence
store.persist.pause();

// Resume auto-persistence
store.persist.resume();

// Check hydration status
const { hydrated, persisting, lastPersistedAt } = store.persist.getStatus();
```

## Handling Errors

```typescript
createPersistPlugin({
  key: 'my-key',
  onError: (error) => {
    console.error('Persistence error:', error);

    // Common errors:
    // - QuotaExceededError: Storage is full
    // - SecurityError: Access denied (private browsing)
    // - SyntaxError: Corrupted data

    if (error.name === 'QuotaExceededError') {
      // Clear old data or notify user
    }
  },
});
```

## Shorthand Syntax

For simple persistence, use the shorthand in store config:

```typescript
const store = createStore({
  name: 'my-store',
  state: { ... },
  persist: true,  // Uses store name as key
});

// Or with options
const store = createStore({
  name: 'my-store',
  state: { ... },
  persist: {
    key: 'custom-key',
    storage: 'sessionStorage',
  },
});
```

## Best Practices

1. **Version your storage keys**: Use `app-settings-v1` not just `app-settings`
2. **Always implement migrations** when changing state shape
3. **Use `partialize`** to exclude sensitive or transient data
4. **Handle errors** gracefully for private browsing mode
5. **Use IndexedDB** for data larger than 5MB

## Next Steps

- **[Cross-Tab Sync](./sync.md)**: Sync state across browser tabs
- **[DevTools](./devtools.md)**: Debug with time-travel
