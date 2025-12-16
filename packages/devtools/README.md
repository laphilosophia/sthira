# @sthira/devtools

DevTools plugin for sthira with Redux DevTools integration.

## Installation

```bash
pnpm add @sthira/devtools
```

## Quick Start

```typescript
import { createStore } from '@sthira/core';
import { createDevToolsPlugin } from '@sthira/devtools';

const store = createStore({
  name: 'app',
  state: { count: 0 },
  plugins: [createDevToolsPlugin({ name: 'MyApp' })],
});

// Access devtools API
store.devtools.exportState(); // Export state as JSON
store.devtools.importState(json); // Import state
```

## Features

- Redux DevTools Extension integration
- Time-travel debugging
- Action logging
- State export/import

## Plugin API

```typescript
interface DevToolsPluginConfig {
  name?: string; // Instance name in DevTools
  maxAge?: number; // Max action history (default: 50)
}

// API exposed on store.devtools
interface DevToolsApi {
  connect: () => void;
  disconnect: () => void;
  logAction: (type: string, payload?: unknown) => void;
  getHistory: () => ActionLogEntry[];
  clearHistory: () => void;
  jumpTo: (actionId: number) => void;
  exportState: () => string;
  importState: (json: string) => void;
  getStatus: () => { connected: boolean };
}
```

## Inspector

Standalone state inspector:

```typescript
import { createInspector } from '@sthira/devtools';

const inspector = createInspector(store);

inspector.inspect(); // Get current state info
inspector.getHistory(); // Get state history
inspector.diff(oldState, newState); // Compare states
inspector.formatState(); // Pretty-print state
```

## Development Only

```typescript
const store = createStore({
  name: 'app',
  state: { data: null },
  plugins: [
    ...(process.env.NODE_ENV === 'development' ? [createDevToolsPlugin({ name: 'MyApp' })] : []),
  ],
});
```

## License

MIT
