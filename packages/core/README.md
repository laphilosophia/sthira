# @sthirajs/core

Core state management engine for sthira.

## Installation

```bash
pnpm add @sthirajs/core zod
```

## Quick Start

```typescript
import { createStore } from '@sthirajs/core';
import { z } from 'zod';

const store = createStore({
  name: 'counter',
  schema: z.object({ count: z.number() }),
  state: { count: 0 },
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1 }),
  }),
});

// Subscribe
store.subscribe((state) => console.log(state));

// Use
store.actions.increment();
console.log(store.getState()); // { count: 1 }
```

## API Reference

### `createStore(config)`

Creates a reactive store.

```typescript
interface StoreConfig<T> {
  name: string; // Unique store identifier
  schema?: ZodSchema<T>; // Zod schema for validation
  state: T; // Initial state
  actions?: ActionCreator<T>; // Action definitions
  computed?: ComputedDefinitions; // Derived state
  interceptors?: Interceptors; // Lifecycle hooks
  performance?: PerformanceConfig; // Optimization settings
}
```

### Computed State

Auto-memoized derived values:

```typescript
const store = createStore({
  name: 'cart',
  state: { items: [{ price: 10, qty: 2 }] },
  computed: {
    total: (state) => state.items.reduce((s, i) => s + i.price * i.qty, 0),
  },
});

store.getComputed('total'); // 20
```

### Signal Primitives

Fine-grained reactivity with automatic dependency tracking:

```typescript
import { signal, computed, effect, batch } from '@sthirajs/core';

// Reactive value
const count = signal(0);
count.get(); // Read (tracks dependency)
count.set(5); // Write
count.update((n) => n + 1); // Update with function

// Derived value (lazy + memoized)
const double = computed(() => count.get() * 2);
double.get(); // 12 (computed on access)

// Side effect with auto-tracking
const dispose = effect(() => {
  console.log('Count:', count.get());
  return () => console.log('Cleanup'); // Optional cleanup
});

// Batch multiple updates
batch(() => {
  count.set(1);
  count.set(2);
  count.set(3); // Only one notification for all changes
});

dispose(); // Stop effect
```

### FSM Async States

Predictable async state transitions:

```typescript
import { createStore, createAsyncState, AsyncStateMachine } from '@sthirajs/core';

const store = createStore({
  name: 'users',
  state: { users: [], async: createAsyncState() },
  actions: (set, get, { fsm }) => ({
    fetch: async () => {
      fsm.transition('fetch'); // idle → loading
      try {
        const users = await api.get();
        set({ users });
        fsm.transition('success'); // loading → success
      } catch (e) {
        fsm.transition('error', e); // loading → error
      }
    },
  }),
});

// States: 'idle' | 'loading' | 'error' | 'success' | 'stale'
```

### Interceptors

Axios-style lifecycle hooks:

```typescript
const store = createStore({
  name: 'app',
  state: { value: 0 },
  interceptors: {
    beforeSet: (next, prev) => {
      if (next.value < 0) return prev; // Reject
      return next;
    },
    afterSet: (state) => {
      analytics.track('state_change', state);
    },
    onError: (error, context) => {
      errorReporter.capture(error, context);
    },
  },
});
```

### Selectors

Optimized state selection:

```typescript
import { createSelector } from '@sthirajs/core';

const selectTotal = createSelector(
  (state) => state.items,
  (items) => items.reduce((s, i) => s + i.price, 0),
);
```

## Exports

```typescript
// Core
export { createStore, createSelector, shallowEqual }
export { createReactiveProxy, isProxy, toRaw }
export { ComputedManager }
export { InterceptorsManager }
export { createEventBus, StoreEvents }
export { AsyncStateMachine, createAsyncState, isDataStale }
export { SchemaValidator, createSchemaValidator }
export { TaskScheduler, createPerformanceUtils }

// Signal Primitives
export { signal, computed, effect, batch }
export { untracked, isTracking, isBatching, isSignal, isComputed }

// Types
export type { Store, StoreConfig, AsyncState, AsyncStatus, ... }
export type { WritableSignal, ReadableSignal, ComputedSignal, ... }
```

## License

MIT
