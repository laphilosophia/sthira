# Chunked Plugin

Virtual pagination and chunking for large array states.

## Installation

```bash
npm install @sthirajs/chunked
```

## Usage

Ideal for handling lists with thousands of items without freezing the UI.

```typescript
import { createStore } from '@sthirajs/core';
import { createChunkedPlugin } from '@sthirajs/chunked';

const listStore = createStore({
  name: 'large-list',
  state: { items: [], visibleItems: [] },
  plugins: [
    createChunkedPlugin({
      sourceField: 'items',
      targetField: 'visibleItems',
      chunkSize: 50,
    }),
  ],
});

// Actions include: loadNextChunk(), resetChunks(), etc.
```
