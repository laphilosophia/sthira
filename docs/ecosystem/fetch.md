# Fetch Plugin

SWR-like data fetching with caching, deduplication, and request cancellation.

## Installation

```bash
npm install @sthirajs/fetch
```

## Quick Start

```typescript
import { createFetchSource, createMutation } from '@sthirajs/fetch';

// Create a fetch source for queries
const usersSource = createFetchSource({
  url: '/api/users',
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Fetch data
const users = await usersSource.fetch();

// Create mutations
const createUser = createMutation({
  url: '/api/users',
  method: 'POST',
});

await createUser.mutate({ name: 'John' });
```

## Core Features

### SWR Pattern (Stale-While-Revalidate)

```typescript
const source = createFetchSource({
  url: '/api/users',
  staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
});

// First call: fetches from network
const users = await source.fetch();

// Second call within staleTime: returns cached data instantly
const cachedUsers = await source.fetch();

// After staleTime: returns stale data, revalidates in background
```

### Request Deduplication

Simultaneous identical requests are automatically deduplicated:

```typescript
// These trigger only ONE network request
const [users1, users2, users3] = await Promise.all([
  source.fetch(),
  source.fetch(),
  source.fetch(),
]);
```

### Request Cancellation

Cancel requests with timeout or manual abort:

```typescript
// Automatic timeout
const source = createFetchSource({
  url: '/api/users',
  timeout: 5000, // Cancel after 5 seconds
});

// Manual abort
source.abort();

// Cancel previous request when new one starts (default: true)
const source = createFetchSource({
  url: '/api/users',
  cancelOnNewRequest: true,
});

// External AbortController
const controller = new AbortController();
const source = createFetchSource({
  url: '/api/users',
  signal: controller.signal,
});
controller.abort();
```

## createFetchSource Configuration

```typescript
interface FetchSourceConfig {
  url: string | (() => string); // API endpoint
  method?: HttpMethod; // 'GET' (default)
  headers?: HeadersInit; // Request headers
  params?: Record<string, string>; // Query parameters
  body?: unknown; // Request body
  transform?: (data: unknown) => T; // Transform response
  cacheKey?: string; // Custom cache key
  staleTime?: number; // Cache duration (default: 5 min)
  cacheTime?: number; // GC time (default: 10 min)
  retry?: number | false; // Retry attempts (default: 3)
  retryDelay?: number; // Retry delay (default: 1000ms)
  timeout?: number; // Request timeout in ms
  cancelOnNewRequest?: boolean; // Cancel previous (default: true)
  signal?: AbortSignal; // External abort signal
  fetcher?: typeof fetch; // Custom fetch function
  onSuccess?: (data: T) => void; // Success callback
  onError?: (error: Error) => void; // Error callback
}
```

## FetchSource API

```typescript
const source = createFetchSource({ url: '/api/users' });

// Methods
source.fetch(); // Fetch with SWR (returns cached if fresh)
source.refetch(); // Force refetch (ignore cache)
source.invalidate(); // Mark cache as stale
source.abort(); // Cancel in-flight request

// Properties
source.cacheKey; // Cache key for this source
source.type; // 'query'
```

## createMutation

```typescript
const updateUser = createMutation<ResponseType, VariablesType>({
  url: '/api/users/:id',
  method: 'PUT',
  timeout: 30000,
  onSuccess: (data) => {
    usersSource.invalidate(); // Refetch users after update
  },
  onError: (error) => {
    console.error('Update failed:', error);
  },
});

// Usage
const result = await updateUser.mutate({ id: '123', name: 'John' });
updateUser.abort(); // Cancel in-flight mutation
updateUser.reset(); // Reset mutation state
```

## Global API

```typescript
import { sthira } from '@sthirajs/fetch';

// Prefetch data sources
await sthira.prefetch(usersSource);
await sthira.prefetchAll([usersSource, postsSource]);

// Ensure data exists
const users = await sthira.ensureData(usersSource);

// Invalidation
sthira.invalidate(usersSource);
sthira.invalidatePrefix('GET:/api/users');
sthira.invalidateAll();

// Create router loader
const loader = sthira.createLoader([usersSource, postsSource]);
const [users, posts] = await loader();
```

## Cache Management

```typescript
import { getQueryCache, resetQueryCache } from '@sthirajs/fetch';

const cache = getQueryCache();

cache.get('key'); // Get cached entry
cache.has('key'); // Check if cached
cache.set('key', data); // Set cache entry
cache.delete('key'); // Remove entry
cache.clear(); // Clear all
cache.invalidate('key'); // Mark as stale
cache.invalidatePrefix('GET:/api/users'); // Invalidate by prefix
cache.isStale('key'); // Check if stale

resetQueryCache(); // Reset entire cache
```

## Error Handling

```typescript
try {
  const users = await source.fetch();
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Request timed out');
  } else if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.log('HTTP error:', error.message);
  }
}
```

## React Integration

```typescript
import { useEffect, useState } from 'react';
import { createFetchSource } from '@sthirajs/fetch';

const usersSource = createFetchSource({
  url: '/api/users',
  staleTime: 60000,
});

function UserList() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    usersSource.fetch()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));

    // Cleanup: abort on unmount
    return () => usersSource.abort();
  }, []);

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  return <ul>{state.data.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

## Best Practices

1. **Use appropriate staleTime**: Short for frequently changing data, long for static data
2. **Set timeouts**: Prevent hanging requests with reasonable timeout values
3. **Handle abort errors**: Users may navigate away before requests complete
4. **Invalidate after mutations**: Keep data fresh after changes
5. **Use prefetch for routes**: Load data before navigation for instant pages

## Next Steps

- **[Persistence](./persistence.md)**: Save state to storage
- **[Cross-Tab Sync](./sync.md)**: Sync across tabs
