# @Sthira/persist

Persistence plugin for Sthira with IndexedDB, localStorage, and memory adapters.

## Installation

```bash
pnpm add @Sthira/persist
```

## Quick Start

```typescript
import { createStore } from '@Sthira/core'
import { createPersistPlugin } from '@Sthira/persist'

const store = createStore({
  name: 'settings',
  state: { theme: 'dark', language: 'en' },
  plugins: [
    createPersistPlugin({
      key: 'app-settings',
      storage: 'indexeddb', // 'localstorage' | 'memory'
    }),
  ],
})

// Access persist API
await store.persist.hydrate()
store.persist.getStatus() // { hydrated: true, persisting: false }
```

## Plugin API

```typescript
interface PersistPluginConfig {
  key: string // Storage key
  storage: 'indexeddb' | 'localstorage' | 'memory'
  debounce?: number // Write debounce (ms)
  version?: number // Schema version
  migrate?: (state, version) => state
  partialize?: (state) => Partial<state>
}

// API exposed on store.persist
interface PersistApi {
  hydrate: () => Promise<void> // Load from storage
  persist: () => Promise<void> // Manual save
  clear: () => Promise<void> // Clear storage
  pause: () => void // Pause auto-persist
  resume: () => void // Resume auto-persist
  getStatus: () => { hydrated; persisting; lastPersistedAt }
}
```

## Storage Adapters

### IndexedDB (Recommended)

```typescript
import { createIndexedDBAdapter } from '@Sthira/persist'

const adapter = createIndexedDBAdapter({
  dbName: 'my-app',
  storeName: 'state',
})

createPersistPlugin({ key: 'my-store', adapter })
```

### localStorage

```typescript
import { createLocalStorageAdapter } from '@Sthira/persist'

const adapter = createLocalStorageAdapter({ prefix: 'app_' })
```

### Memory (Testing)

```typescript
import { createMemoryAdapter } from '@Sthira/persist'

const adapter = createMemoryAdapter()
```

## Migrations

```typescript
createPersistPlugin({
  key: 'settings',
  storage: 'indexeddb',
  version: 2,
  migrate: (state, version) => {
    if (version === 1) {
      return { ...state, newField: 'default' }
    }
    return state
  },
})
```

## Partialize

Persist only specific fields:

```typescript
createPersistPlugin({
  key: 'user',
  storage: 'localstorage',
  partialize: (state) => ({
    preferences: state.preferences, // Persist
    // token: state.token, // Don't persist
  }),
})
```

## Wait for Hydration

```typescript
import { waitForHydration } from '@Sthira/persist'

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    waitForHydration(store.persist).then(() => setReady(true))
  }, [])

  if (!ready) return <Loading />
  return <Main />
}
```

## License

MIT
