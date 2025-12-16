# Quick Start

Build a fully-featured counter application in 5 minutes.

## What We'll Build

A reactive counter with:

- ✅ Type-safe state with Zod validation
- ✅ Increment/decrement with bounds checking
- ✅ Automatic persistence to localStorage
- ✅ Redux DevTools integration

## Step 1: Create the Store

First, let's define our schema and create a store:

```typescript
// stores/counterStore.ts
import { createStore } from '@sthirajs/core';
import { z } from 'zod';

// Define the shape of your state with Zod
const counterSchema = z.object({
  count: z.number().min(0).max(100),
  lastUpdated: z.string().nullable(),
});

// Infer TypeScript type from schema
type CounterState = z.infer<typeof counterSchema>;

// Create the store
export const counterStore = createStore({
  name: 'counter',
  schema: counterSchema,
  state: {
    count: 0,
    lastUpdated: null,
  } as CounterState,

  // Define actions for state mutations
  actions: (set, get) => ({
    increment: () => {
      const current = get().count;
      if (current < 100) {
        set({
          count: current + 1,
          lastUpdated: new Date().toISOString(),
        });
      }
    },

    decrement: () => {
      const current = get().count;
      if (current > 0) {
        set({
          count: current - 1,
          lastUpdated: new Date().toISOString(),
        });
      }
    },

    reset: () =>
      set({
        count: 0,
        lastUpdated: new Date().toISOString(),
      }),

    setCount: (value: number) =>
      set({
        count: Math.max(0, Math.min(100, value)),
        lastUpdated: new Date().toISOString(),
      }),
  }),

  // Enable built-in features (optional)
  persist: true, // Saves to localStorage
  devtools: true, // Enables Redux DevTools
});
```

## Step 2: Use in React

Now consume the store in a React component:

```tsx
// components/Counter.tsx
import { useStore } from '@sthirajs/react';
import { counterStore } from '../stores/counterStore';

export function Counter() {
  // useStore subscribes to the store and re-renders on changes
  const { count, lastUpdated, increment, decrement, reset } = useStore(counterStore);

  return (
    <div className="counter-container">
      <h2>Sthira Counter</h2>

      <div className="count-display">
        <span className="count-value">{count}</span>
        <span className="count-max">/ 100</span>
      </div>

      <div className="button-group">
        <button onClick={decrement} disabled={count === 0} className="btn btn-secondary">
          − Decrease
        </button>

        <button onClick={increment} disabled={count === 100} className="btn btn-primary">
          + Increase
        </button>
      </div>

      <button onClick={reset} className="btn btn-outline">
        Reset
      </button>

      {lastUpdated && (
        <p className="last-updated">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</p>
      )}
    </div>
  );
}
```

## Step 3: Optimize with Selectors

For larger components, use selectors to prevent unnecessary re-renders:

```tsx
import { useSelector } from '@sthirajs/react';
import { counterStore } from '../stores/counterStore';

// Only re-renders when `count` changes
function CountDisplay() {
  const count = useSelector(counterStore, (state) => state.count);
  return <span>{count}</span>;
}

// Only re-renders when actions are needed (never, since actions are stable)
function CounterButtons() {
  const { increment, decrement } = useStore(counterStore);

  return (
    <div>
      <button onClick={decrement}>-</button>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

## Step 4: Use Outside React

Stores work outside of React too — in event handlers, async functions, or other modules:

```typescript
// utils/analytics.ts
import { counterStore } from '../stores/counterStore';

// Read state directly
export function logCurrentCount() {
  const { count } = counterStore.getState();
  console.log(`Current count: ${count}`);
}

// Subscribe to changes
counterStore.subscribe((state, prevState) => {
  if (state.count !== prevState?.count) {
    analytics.track('count_changed', {
      from: prevState?.count,
      to: state.count,
    });
  }
});

// Trigger actions from anywhere
export function resetFromServer() {
  counterStore.actions.reset();
}
```

## What Just Happened?

Let's break down what Sthira is doing for you:

### 1. Schema Validation

Every `setState` call is validated against your Zod schema:

```typescript
counterStore.setState({ count: 150 });
// ❌ Throws ZodError: Number must be less than or equal to 100
```

### 2. Immutable Updates

You don't mutate state — you describe what changes. Sthira handles immutability:

```typescript
// You write:
set({ count: 5 });

// Sthira does:
const newState = { ...prevState, count: 5 };
Object.freeze(newState);
```

### 3. Automatic Reactivity

Components automatically re-render when their subscribed state changes — no manual subscription management.

### 4. Persistence

With `persist: true`, your state survives page refreshes:

```typescript
// On page load, Sthira hydrates from localStorage
// On state change, Sthira debounces and saves
```

### 5. DevTools Integration

With `devtools: true`, every action appears in Redux DevTools with full state history.

## Full Example

Here's the complete working example:

```tsx
// App.tsx
import { createStore } from '@sthirajs/core';
import { useStore } from '@sthirajs/react';
import { z } from 'zod';

const counterStore = createStore({
  name: 'quick-start-counter',
  schema: z.object({ count: z.number().min(0).max(100) }),
  state: { count: 0 },
  actions: (set, get) => ({
    inc: () => set({ count: Math.min(100, get().count + 1) }),
    dec: () => set({ count: Math.max(0, get().count - 1) }),
  }),
  persist: true,
  devtools: true,
});

export function App() {
  const { count, inc, dec } = useStore(counterStore);

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h1>Sthira Quick Start</h1>
      <div style={{ fontSize: 48, margin: 24 }}>{count}</div>
      <button onClick={dec} style={{ marginRight: 8 }}>
        -
      </button>
      <button onClick={inc}>+</button>
      <p style={{ color: '#888', marginTop: 16 }}>Try refreshing — your count persists!</p>
    </div>
  );
}
```

## Next Steps

Now that you understand the basics:

- **[Core Concepts](./core-concepts.md)**: Deep dive into stores, actions, and plugins
- **[React Bindings](./packages/react.md)**: Complete API reference for React hooks
- **[Persistence](./ecosystem/persistence.md)**: Advanced persistence configuration
- **[DevTools](./ecosystem/devtools.md)**: Time-travel debugging
