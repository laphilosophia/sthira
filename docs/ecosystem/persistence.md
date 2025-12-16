# Persistence Plugin

Persist your state to storage (localStorage, sessionStorage, IndexedDB, etc.) automatically.

## Installation

```bash
npm install @sthira/persist
```

## Basic Usage

The `createPersistPlugin` automates saving and loading state.

```typescript
import { createStore } from '@sthira/core';
import { createPersistPlugin } from '@sthira/persist';

const settingsStore = createStore({
  name: 'settings', // Name is REQUIRED for storage key
  state: { theme: 'light', notifications: true },
  plugins: [
    createPersistPlugin({
      key: 'settings_v1', // Storage key prefix
      storage: 'localStorage', // 'localStorage' | 'sessionStorage' | CustomAdapter
    }),
  ],
});
```

## Advanced: Migration

Sthira supports schema migration for persistence.

```typescript
createPersistPlugin({
  key: 'settings',
  version: 2,
  migrate: (oldState, oldVersion) => {
    if (oldVersion === 1) {
      return { ...oldState, newField: 'default' };
    }
    return oldState;
  },
});
```
