# @sthira/react

React bindings for sthira state management.

## Installation

```bash
pnpm add @sthira/core @sthira/react zod
```

## Quick Start

```typescript
import { createStore } from '@sthira/core'
import { useStore } from '@sthira/react'
import { z } from 'zod'

const counterStore = createStore({
  name: 'counter',
  schema: z.object({ count: z.number() }),
  state: { count: 0 },
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1 }),
  }),
})

function Counter() {
  const { count, increment } = useStore(counterStore)
  return <button onClick={increment}>{count}</button>
}
```

## API Reference

### `useStore(store)`

Subscribe to entire store state + actions:

```typescript
function Component() {
  const { count, increment, decrement } = useStore(counterStore);
  // Re-renders on any state change
}
```

### `useSelector(store, selector, equalityFn?)`

Subscribe to specific state slice:

```typescript
function Component() {
  const count = useSelector(counterStore, (s) => s.count);
  // Re-renders only when count changes
}

// With custom equality
const items = useSelector(store, (s) => s.items, shallowEqual);
```

### `useComputed(store, key)`

Subscribe to computed value:

```typescript
function CartTotal() {
  const total = useComputed(cartStore, 'total')
  return <span>${total}</span>
}
```

### `useStoreState(store)` / `useStoreActions(store)`

Separate state and actions:

```typescript
function Component() {
  const state = useStoreState(counterStore); // { count: 0 }
  const actions = useStoreActions(counterStore); // { increment, decrement }
}
```

### `StoreProvider`

Context-based store injection:

```typescript
import { StoreProvider, useStoreContext } from '@sthira/react'

function App() {
  return (
    <StoreProvider store={counterStore}>
      <Counter />
    </StoreProvider>
  )
}

function Counter() {
  const store = useStoreContext()
  const { count } = useStore(store)
}
```

## Optimization Patterns

### Selector Memoization

```typescript
// ❌ Bad: Creates new function every render
useSelector(store, (s) => s.items.filter((i) => i.active));

// ✅ Good: Stable selector reference
const selectActive = useMemo(() => (s) => s.items.filter((i) => i.active), []);
useSelector(store, selectActive);
```

### Shallow Equality

```typescript
import { shallowEqual } from '@sthira/react';

// Only re-render if array contents change
const items = useSelector(store, (s) => s.items, shallowEqual);
```

## Exports

```typescript
// Hooks
export { useStore, useSelector, useComputed, useStoreState, useStoreActions }
export { shallowEqual }

// Context
export { StoreProvider, useStoreContext, useHasStoreContext }

// Types
export type { Selector, EqualityFn, UseStoreReturn, ... }
```

## License

MIT
