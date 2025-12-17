# @sthirajs/fetch

REST data adapter with SWR-like caching for sthira.

## Installation

```bash
pnpm add @sthirajs/fetch
```

## Quick Start

```typescript
import { createFetchSource, createMutation } from '@sthirajs/fetch';

// Fetch source with SWR
const usersSource = createFetchSource({
  key: 'users',
  url: '/api/users',
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Subscribe to data
usersSource.subscribe((result) => {
  console.log(result.data, result.status); // 'idle' | 'loading' | 'success' | 'error'
});

// Trigger fetch
await usersSource.fetch();
```

## API Reference

### `createFetchSource(config)`

Creates a cached data source:

```typescript
interface FetchSourceConfig {
  key: string; // Unique cache key
  url: string; // API endpoint
  method?: HttpMethod; // 'GET' (default)
  headers?: HeadersInit;
  staleTime?: number; // Cache duration (ms)
  cacheTime?: number; // Garbage collection time
  retry?: number; // Retry attempts
  retryDelay?: number; // Delay between retries
  timeout?: number; // Request timeout (ms)
  cancelOnNewRequest?: boolean; // Cancel previous request (default: true)
  signal?: AbortSignal; // External abort signal
}

const source = createFetchSource({
  url: '/api/users/123',
  staleTime: 5 * 60 * 1000,
  timeout: 10000, // 10 second timeout
});

// API
source.fetch(); // Trigger fetch
source.refetch(); // Force refetch (ignore cache)
source.invalidate(); // Mark as stale
source.abort(); // Cancel in-flight request
```

### `createMutation(config)`

Creates a mutation handler:

```typescript
const createUser = createMutation({
  url: '/api/users',
  method: 'POST',
  timeout: 30000, // 30 second timeout
  onSuccess: (data) => {
    usersSource.invalidate(); // Refetch users list
  },
  onError: (error) => {
    console.error('Failed:', error);
  },
});

// Usage
const result = await createUser.mutate({ name: 'John' });
createUser.abort(); // Cancel in-flight mutation
createUser.reset(); // Reset mutation state
```

### `sthira` Global API

Simplified API for quick usage:

```typescript
import { sthira } from '@sthirajs/fetch';

// Query
const { data, status } = await sthira.query('/api/users');

// Mutate
await sthira.mutate('/api/users', { method: 'POST', body: { name: 'John' } });

// Invalidate
sthira.invalidate('/api/users');
```

### Cache Management

```typescript
import { getQueryCache, resetQueryCache } from '@sthirajs/fetch';

// Access cache
const cache = getQueryCache();
cache.get('users'); // Get cached entry
cache.has('users'); // Check if cached
cache.delete('users'); // Remove entry
cache.clear(); // Clear all

// Reset entire cache
resetQueryCache();
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
