# Perf Plugin

Performance monitoring and metrics for your state infrastructure.

## Installation

```bash
npm install @sthira/perf
```

## Usage

```typescript
import { createStore } from '@sthira/core';
import { createPerfPlugin } from '@sthira/perf';

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
