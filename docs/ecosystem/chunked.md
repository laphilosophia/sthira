# Chunked Plugin

Virtual pagination and chunking for large array states.

## Installation

```bash
npm install @sthira/chunked
```

## Usage

Ideal for handling lists with thousands of items without freezing the UI.

```typescript
import { createStore } from '@sthira/core';
import { createChunkedPlugin } from '@sthira/chunked';

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
