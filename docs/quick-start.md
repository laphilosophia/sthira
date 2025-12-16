# Quick Start

Let's build a simple but reactive Counter to demonstrate the basics of Sthira.

## 1. Define the Store

A Sthira store consists of a **name**, a **schema** (optional but recommended), **state**, and **actions**.

```tsx
import { createStore } from '@sthira/core';
import { z } from 'zod';

// Define the shape of your state
const schema = z.object({
  count: z.number(),
});

// Create the store
export const counterStore = createStore({
  name: 'counter',
  schema,
  state: { count: 0 },
  actions: {
    increment: (state) => ({ count: state.count + 1 }),
    decrement: (state) => ({ count: state.count - 1 }),
    reset: () => ({ count: 0 }),
  },
});
```

## 2. Use in React

Use the `useStore` hook to subscribe to the store.

```tsx
import { createStore } from '@sthira/core';
import { useStore } from '@sthira/react';

const counter = createStore({
  name: 'quick-start-counter',
  state: { count: 0 },
  actions: {
    inc: (s) => ({ count: s.count + 1 }),
    dec: (s) => ({ count: s.count - 1 }),
  },
});

function CounterApp() {
  const { count } = useStore(counter);

  return (
    <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{count}</div>
        <div className="text-sm text-slate-500">Current Count</div>
      </div>

      <div className="flex justify-center gap-2">
        <button
          onClick={() => counter.actions.dec()}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition"
        >
          Decrease
        </button>
        <button
          onClick={() => counter.actions.inc()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
        >
          Increase
        </button>
      </div>
    </div>
  );
}
```

## What just happened?

1.  **Immutability:** Sthira handles immutability for you. Your actions simply return the _partial state_ you want to update.
2.  **Reactivity:** The `CounterApp` component automatically re-renders whenever `count` changes.
3.  **Encapsulation:** Logic lives in the store (`actions`), UI lives in the component.

Next, let's learn about the [Core Concepts](./core-concepts.md).
