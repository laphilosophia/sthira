# Perf Plugin

Performance monitoring and metrics for your state infrastructure.

## Installation

```bash
npm install @sthirajs/perf
```

## Usage

```typescript
import { createStore } from '@sthirajs/core';
import { createPerfPlugin } from '@sthirajs/perf';

const dataStore = createStore({
  name: 'big-data',
  state: { items: new Array(1000).fill(0) },
  plugins: [
    createPerfPlugin({
      logSlowActions: true,
      slowThresholdMs: 16, // Log actions taking > 16ms (1 frame)
    }),
  ],
});
```

Check your console to see performance metrics for every action.
