# Fetch Plugin

Managed async data fetching for Sthira stores. Handles loading states, errors, and data binding automatically.

## Installation

```bash
npm install @sthirajs/fetch
```

## Usage

```typescript
import { createStore } from '@sthirajs/core';
import { createFetchPlugin } from '@sthirajs/fetch';

const userStore = createStore({
  name: 'user',
  state: { data: null, loading: false, error: null },
  plugins: [
    createFetchPlugin({
      baseUrl: 'https://api.example.com',
      endpoints: {
        fetchUser: { url: '/users/:id', method: 'GET' },
        updateUser: { url: '/users/:id', method: 'PUT' },
      },
    }),
  ],
});

// Usage
await userStore.actions.fetchUser({ params: { id: '123' } });
```
