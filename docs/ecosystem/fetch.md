# Fetch Plugin

Managed async data fetching with automatic loading states, caching, and error handling.

## Installation

```bash
npm install @sthirajs/fetch
```

## Quick Start

```typescript
import { createFetch } from '@sthirajs/fetch';

const api = createFetch({
  baseUrl: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Make requests
const users = await api.get('/users');
const user = await api.get('/users/:id', { params: { id: '123' } });
const newUser = await api.post('/users', { body: { name: 'John' } });
```

## Core Features

### Type-Safe Requests

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Fully typed responses
const user = await api.get<User>('/users/123');
console.log(user.name); // TypeScript knows this is a string
```

### Automatic Caching

```typescript
const api = createFetch({
  baseUrl: 'https://api.example.com',
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // Cache for 5 minutes
    maxSize: 100, // Max 100 cached entries
  },
});

// First call hits the network
const users = await api.get('/users');

// Second call within TTL returns cached data
const cachedUsers = await api.get('/users'); // Instant!
```

### Request Deduplication

Simultaneous identical requests are automatically deduplicated:

```typescript
// These trigger only ONE network request
const [users1, users2, users3] = await Promise.all([
  api.get('/users'),
  api.get('/users'),
  api.get('/users'),
]);
```

## Configuration

```typescript
const api = createFetch({
  baseUrl: 'https://api.example.com',

  // Default headers for all requests
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },

  // Timeout in milliseconds
  timeout: 10000,

  // Retry configuration
  retry: {
    count: 3,
    delay: 1000,
    backoff: 'exponential', // 1s, 2s, 4s
  },

  // Caching
  cache: {
    enabled: true,
    ttl: 60000,
    maxSize: 50,
  },

  // Interceptors
  onRequest: (config) => {
    console.log('Request:', config.url);
    return config;
  },
  onResponse: (response) => {
    console.log('Response:', response.status);
    return response;
  },
  onError: (error) => {
    console.error('Error:', error.message);
    throw error;
  },
});
```

### Options Reference

| Option          | Type                          | Default    | Description               |
| --------------- | ----------------------------- | ---------- | ------------------------- |
| `baseUrl`       | `string`                      | —          | Base URL for all requests |
| `headers`       | `Record<string, string>`      | `{}`       | Default headers           |
| `timeout`       | `number`                      | `30000`    | Request timeout (ms)      |
| `retry.count`   | `number`                      | `0`        | Retry attempts            |
| `retry.delay`   | `number`                      | `1000`     | Initial retry delay (ms)  |
| `retry.backoff` | `'linear'` \| `'exponential'` | `'linear'` | Backoff strategy          |
| `cache.enabled` | `boolean`                     | `false`    | Enable response caching   |
| `cache.ttl`     | `number`                      | `60000`    | Cache time-to-live (ms)   |
| `cache.maxSize` | `number`                      | `100`      | Max cached entries        |

## HTTP Methods

```typescript
// GET
const users = await api.get('/users');
const user = await api.get('/users/:id', { params: { id: '123' } });

// POST
const newUser = await api.post('/users', {
  body: { name: 'John', email: 'john@example.com' },
});

// PUT
const updated = await api.put('/users/:id', {
  params: { id: '123' },
  body: { name: 'John Doe' },
});

// PATCH
const patched = await api.patch('/users/:id', {
  params: { id: '123' },
  body: { name: 'John Doe' },
});

// DELETE
await api.delete('/users/:id', { params: { id: '123' } });
```

## Path Parameters

Use `:param` syntax for URL parameters:

```typescript
// URL: /users/123/posts/456
const post = await api.get('/users/:userId/posts/:postId', {
  params: {
    userId: '123',
    postId: '456',
  },
});
```

## Query Parameters

```typescript
// URL: /users?status=active&limit=10
const activeUsers = await api.get('/users', {
  query: {
    status: 'active',
    limit: 10,
  },
});
```

## Request Body

```typescript
// JSON body (default)
await api.post('/users', {
  body: { name: 'John', email: 'john@example.com' },
});

// FormData
const formData = new FormData();
formData.append('file', file);
await api.post('/upload', {
  body: formData,
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

## Error Handling

```typescript
try {
  const user = await api.get('/users/999');
} catch (error) {
  if (error.status === 404) {
    console.log('User not found');
  } else if (error.status >= 500) {
    console.log('Server error');
  } else if (error.name === 'TimeoutError') {
    console.log('Request timed out');
  }
}
```

### Error Object

```typescript
interface FetchError extends Error {
  status: number; // HTTP status code
  statusText: string; // HTTP status text
  url: string; // Request URL
  data: unknown; // Response body (if any)
}
```

## Integration with Sthira Stores

### Pattern 1: Async Controller

```typescript
const userStore = createStore({
  name: 'user',
  state: {
    data: null as User | null,
    loading: false,
    error: null as string | null,
  },
  actions: (set) => ({
    setLoading: (loading: boolean) => set({ loading }),
    setData: (data: User) => set({ data, error: null }),
    setError: (error: string) => set({ error, data: null }),
  }),
});

async function fetchUser(id: string) {
  userStore.actions.setLoading(true);
  try {
    const user = await api.get<User>(`/users/${id}`);
    userStore.actions.setData(user);
  } catch (error) {
    userStore.actions.setError(error.message);
  } finally {
    userStore.actions.setLoading(false);
  }
}
```

### Pattern 2: React Hook

```typescript
import { useState, useEffect } from 'react';

function useUser(id: string) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get<User>(`/users/${id}`)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch(
        (error) => !cancelled && setState({ data: null, loading: false, error: error.message }),
      );

    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
```

## Cache Management

```typescript
// Clear entire cache
api.cache.clear();

// Clear specific URL
api.cache.delete('/users');

// Check if URL is cached
const isCached = api.cache.has('/users');

// Get cached data directly
const cachedData = api.cache.get('/users');
```

## Interceptors

### Authentication

```typescript
const api = createFetch({
  baseUrl: 'https://api.example.com',
  onRequest: (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
});
```

### Token Refresh

```typescript
const api = createFetch({
  baseUrl: 'https://api.example.com',
  onError: async (error) => {
    if (error.status === 401) {
      // Refresh token
      const newToken = await refreshToken();
      localStorage.setItem('token', newToken);

      // Retry original request
      return api.request(error.config);
    }
    throw error;
  },
});
```

## Best Practices

1. **Create one api instance** per base URL
2. **Enable caching** for GET requests that don't change often
3. **Set appropriate timeouts** for your use case
4. **Handle errors** at the component level for UI feedback
5. **Use interceptors** for cross-cutting concerns (auth, logging)

## Next Steps

- **[Persistence](./persistence.md)**: Save state to storage
- **[Performance](./perf.md)**: Monitor performance
