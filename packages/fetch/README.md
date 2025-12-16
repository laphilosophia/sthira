# @sthira/fetch

REST data adapter with SWR-like caching for sthira.

## Installation

```bash
pnpm add @sthira/fetch
```

## Quick Start

```typescript
import { createFetchSource, createMutation } from '@sthira/fetch'

// Fetch source with SWR
const usersSource = createFetchSource({
  key: 'users',
  url: '/api/users',
  staleTime: 5 * 60 * 1000, // 5 minutes
})

// Subscribe to data
usersSource.subscribe((result) => {
  console.log(result.data, result.status) // 'idle' | 'loading' | 'success' | 'error'
})

// Trigger fetch
await usersSource.fetch()
```

## API Reference

### `createFetchSource(config)`

Creates a cached data source:

```typescript
interface FetchSourceConfig {
  key: string // Unique cache key
  url: string // API endpoint
  method?: HttpMethod // 'GET' (default)
  headers?: HeadersInit
  staleTime?: number // Cache duration (ms)
  cacheTime?: number // Garbage collection time
  retry?: number // Retry attempts
  retryDelay?: number // Delay between retries
}

const source = createFetchSource({
  key: 'user-123',
  url: '/api/users/123',
  staleTime: 5 * 60 * 1000,
})

// API
source.fetch() // Trigger fetch
source.refetch() // Force refetch (ignore cache)
source.getState() // Get current state
source.subscribe(fn) // Subscribe to changes
source.invalidate() // Mark as stale
```

### `createMutation(config)`

Creates a mutation handler:

```typescript
const createUser = createMutation({
  url: '/api/users',
  method: 'POST',
  onSuccess: (data) => {
    usersSource.invalidate() // Refetch users list
  },
  onError: (error) => {
    console.error('Failed:', error)
  },
})

// Usage
const result = await createUser.mutate({ name: 'John' })
```

### `sthira` Global API

Simplified API for quick usage:

```typescript
import { sthira } from '@sthira/fetch'

// Query
const { data, status } = await sthira.query('/api/users')

// Mutate
await sthira.mutate('/api/users', { method: 'POST', body: { name: 'John' } })

// Invalidate
sthira.invalidate('/api/users')
```

### Cache Management

```typescript
import { getQueryCache, resetQueryCache } from '@sthira/fetch'

// Access cache
const cache = getQueryCache()
cache.get('users') // Get cached entry
cache.has('users') // Check if cached
cache.delete('users') // Remove entry
cache.clear() // Clear all

// Reset entire cache
resetQueryCache()
```

## SWR Pattern

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       ▼
┌──────────────────────────────────────┐
│  Is cached & not stale?              │
│  ├─ Yes → Return cache immediately   │
│  └─ No  → Fetch from server          │
└──────────────────────────────────────┘
       ▼
┌─────────────┐
│  Revalidate │ (background if stale)
└─────────────┘
```

## Exports

```typescript
// Fetch sources
export { createFetchSource, createMutation }

// Cache
export { QueryCache, getQueryCache, resetQueryCache }

// Global API
export { sthira }

// Types
export type { FetchSourceConfig, MutationConfig, QueryResult, ... }
```

## License

MIT
