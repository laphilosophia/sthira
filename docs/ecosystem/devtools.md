# DevTools Plugin

Integrate with Redux DevTools for time-travel debugging and state inspection.

## Installation

```bash
npm install @sthirajs/devtools
```

## Quick Start

```typescript
import { createStore } from '@sthirajs/core';
import { createDevToolsPlugin } from '@sthirajs/devtools';

const cartStore = createStore({
  name: 'shopping-cart',
  state: { items: [], total: 0 },
  actions: (set, get) => ({
    addItem: (item) =>
      set({
        items: [...get().items, item],
        total: get().total + item.price,
      }),
    removeItem: (id) => {
      const item = get().items.find((i) => i.id === id);
      set({
        items: get().items.filter((i) => i.id !== id),
        total: get().total - (item?.price ?? 0),
      });
    },
    clear: () => set({ items: [], total: 0 }),
  }),
  plugins: [
    createDevToolsPlugin({
      name: 'Shopping Cart',
    }),
  ],
});
```

## Features

### Action Logging

Every state change appears in DevTools with:

- **Action name**: `cart/addItem`, `cart/removeItem`
- **Payload**: The data passed to the action
- **State diff**: What changed

![DevTools Action Log](https://raw.githubusercontent.com/reduxjs/redux-devtools/main/packages/redux-devtools-extension/demo.gif)

### State Inspection

- View the complete state tree at any point in time
- Expand nested objects and arrays
- Search within state

### Time-Travel Debugging

- **Jump** to any previous state
- **Skip** actions to see what state would be without them
- **Replay** actions to reproduce bugs

### State Import/Export

- Export entire state history as JSON
- Import state to reproduce exact scenarios
- Share debugging sessions with team members

## Configuration Options

```typescript
createDevToolsPlugin({
  name: 'My Store', // Instance name in DevTools
  maxAge: 50, // Max actions to keep (default: 50)
  serialize: true, // Serialize state (default: true)
  actionSanitizer: (action) => action, // Transform actions before logging
  stateSanitizer: (state) => state, // Transform state before logging
  trace: false, // Include stack traces
  traceLimit: 25, // Stack trace depth
});
```

### Options Reference

| Option            | Type                 | Default    | Description                                  |
| ----------------- | -------------------- | ---------- | -------------------------------------------- |
| `name`            | `string`             | Store name | Display name in DevTools                     |
| `maxAge`          | `number`             | `50`       | Maximum actions to retain in history         |
| `serialize`       | `boolean \| object`  | `true`     | Serialize options for non-serializable state |
| `actionSanitizer` | `(action) => action` | —          | Transform actions for display                |
| `stateSanitizer`  | `(state) => state`   | —          | Transform state for display                  |
| `trace`           | `boolean`            | `false`    | Include stack traces                         |
| `traceLimit`      | `number`             | `25`       | Max stack trace depth                        |

## Sanitizing Sensitive Data

Remove sensitive data before it appears in DevTools:

```typescript
createDevToolsPlugin({
  name: 'User Store',
  stateSanitizer: (state) => ({
    ...state,
    // Hide sensitive fields
    user: state.user
      ? {
          ...state.user,
          password: '***REDACTED***',
          ssn: '***REDACTED***',
        }
      : null,
  }),
  actionSanitizer: (action) => ({
    ...action,
    payload:
      action.type === 'user/login'
        ? { ...action.payload, password: '***REDACTED***' }
        : action.payload,
  }),
});
```

## Handling Non-Serializable Data

For state containing Maps, Sets, Dates, or other non-serializable values:

```typescript
createDevToolsPlugin({
  name: 'App Store',
  serialize: {
    replacer: (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      if (value instanceof Map) {
        return { __type: 'Map', value: Array.from(value.entries()) };
      }
      if (value instanceof Set) {
        return { __type: 'Set', value: Array.from(value) };
      }
      return value;
    },
    reviver: (key, value) => {
      if (value?.__type === 'Date') {
        return new Date(value.value);
      }
      if (value?.__type === 'Map') {
        return new Map(value.value);
      }
      if (value?.__type === 'Set') {
        return new Set(value.value);
      }
      return value;
    },
  },
});
```

## API Reference

The plugin extends the store with a `devtools` API:

```typescript
const store = createStore({
  name: 'app',
  state: { ... },
  plugins: [createDevToolsPlugin()],
});

// Export current state as JSON
const json = store.devtools.export();

// Import state from JSON
store.devtools.import(json);
```

## Shorthand Syntax

```typescript
const store = createStore({
  name: 'my-store',
  state: { ... },
  devtools: true,  // Uses store name as instance name
});

// Or with options
const store = createStore({
  name: 'my-store',
  state: { ... },
  devtools: {
    name: 'Custom Name',
    maxAge: 100,
  },
});
```

## Multiple Stores

Each store appears as a separate instance in DevTools:

```typescript
const userStore = createStore({
  name: 'user',
  state: { ... },
  devtools: { name: 'User Store' },
});

const cartStore = createStore({
  name: 'cart',
  state: { ... },
  devtools: { name: 'Cart Store' },
});

const settingsStore = createStore({
  name: 'settings',
  state: { ... },
  devtools: { name: 'Settings Store' },
});
```

Select between instances using the dropdown in DevTools.

## Production Usage

DevTools is automatically disabled in production when `process.env.NODE_ENV === 'production'`. To explicitly control:

```typescript
createDevToolsPlugin({
  name: 'My Store',
  // Only enable in development
  enabled: process.env.NODE_ENV === 'development',
});
```

## Browser Extension

Install the Redux DevTools extension:

- [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/redux-devtools/nnkgneoiohoecpdiaponcejilbhhikei)

## Best Practices

1. **Use meaningful names**: Help identify stores in complex apps
2. **Sanitize sensitive data**: Never expose passwords/tokens
3. **Limit maxAge**: Keep DevTools performant
4. **Disable in production**: Avoid exposing internal state
5. **Enable trace** only when debugging React render issues

## Debugging Tips

### "State mutation detected"

Sthira enforces immutability. If you see this error, you're mutating state directly:

```typescript
// ❌ Wrong
state.items.push(newItem);

// ✅ Correct
set({ items: [...get().items, newItem] });
```

### Actions not appearing

1. Check the Redux DevTools extension is installed
2. Ensure the extension is enabled for the current page
3. Check for JavaScript errors in console

### Performance issues

Reduce `maxAge` if DevTools becomes slow:

```typescript
createDevToolsPlugin({
  name: 'Large Store',
  maxAge: 25, // Keep fewer actions
});
```

## Next Steps

- **[Persistence](./persistence.md)**: Save state to storage
- **[Cross-Tab Sync](./sync.md)**: Sync across tabs
