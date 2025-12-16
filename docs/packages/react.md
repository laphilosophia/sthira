# React Bindings

Official React hooks for seamless Sthira integration.

## Installation

```bash
npm install @sthirajs/react @sthirajs/core
```

## Hooks API

### `useStore(store)`

The primary hook for consuming a Sthira store. Returns the complete state merged with actions.

```tsx
import { useStore } from '@sthirajs/react';
import { counterStore } from './stores/counterStore';

function Counter() {
  // Destructure state and actions together
  const { count, increment, decrement } = useStore(counterStore);

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

**Returns**: `State & Actions & { getState, subscribe }`

**Re-renders**: When any part of the state changes.

---

### `useSelector(store, selector, equalityFn?)`

Subscribe to a specific slice of state. Prevents unnecessary re-renders when unrelated state changes.

```tsx
import { useSelector } from '@sthirajs/react';
import { todoStore } from './stores/todoStore';

function TodoCount() {
  // Only re-renders when the length changes
  const count = useSelector(todoStore, (state) => state.items.length);

  return <span>{count} todos</span>;
}

function ActiveTodos() {
  // Only re-renders when active items change
  const activeItems = useSelector(todoStore, (state) => state.items.filter((t) => !t.done));

  return (
    <ul>
      {activeItems.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `store` | `Store<T, A>` | The Sthira store instance |
| `selector` | `(state: T) => R` | Function to extract a slice of state |
| `equalityFn` | `(a: R, b: R) => boolean` | Optional custom equality check (default: `Object.is`) |

**Returns**: The selected value `R`

**Re-renders**: Only when the selected value changes (per equality function).

---

### `useStoreState(store)`

Returns only the state, without actions. Useful when you need state in a component but call actions elsewhere.

```tsx
import { useStoreState } from '@sthirajs/react';
import { userStore } from './stores/userStore';

function UserDisplay() {
  const state = useStoreState(userStore);

  return (
    <div>
      <span>{state.user?.name ?? 'Guest'}</span>
    </div>
  );
}
```

**Returns**: `State`

---

### `useStoreActions(store)`

Returns only the actions, without state. The returned object is **stable** — it never changes, so components using only actions won't re-render on state changes.

```tsx
import { useStoreActions } from '@sthirajs/react';
import { counterStore } from './stores/counterStore';

function IncrementButton() {
  // This component NEVER re-renders due to state changes
  const { increment } = useStoreActions(counterStore);

  return <button onClick={increment}>+</button>;
}
```

**Returns**: `Actions`

**Re-renders**: Never (actions are stable references).

---

## Custom Equality Functions

For complex selectors returning objects/arrays, use a custom equality function to prevent unnecessary re-renders:

```tsx
import { useSelector, shallowEqual } from '@sthirajs/react';

function UserInfo() {
  // Without shallowEqual: re-renders on every state change
  // With shallowEqual: only re-renders when id or name change
  const user = useSelector(
    userStore,
    (state) => ({ id: state.user.id, name: state.user.name }),
    shallowEqual,
  );

  return <span>{user.name}</span>;
}
```

### Built-in Equality Functions

| Function       | Description                             |
| -------------- | --------------------------------------- |
| `Object.is`    | Default. Strict equality (`===`)        |
| `shallowEqual` | Shallow comparison of object properties |

### Custom Equality

```tsx
const customEqual = (a: User[], b: User[]) => {
  if (a.length !== b.length) return false;
  return a.every((user, i) => user.id === b[i].id);
};

const users = useSelector(store, (s) => s.users, customEqual);
```

---

## Patterns & Best Practices

### Co-locating Selectors

Define reusable selectors alongside your store:

```typescript
// stores/todoStore.ts
export const todoStore = createStore({ ... });

// Reusable selectors
export const selectActiveCount = (state: TodoState) =>
  state.items.filter((t) => !t.done).length;

export const selectCompletedCount = (state: TodoState) =>
  state.items.filter((t) => t.done).length;

// In components
const activeCount = useSelector(todoStore, selectActiveCount);
```

### Avoiding Selector Pitfalls

```tsx
// ❌ Bad: Creates new array every render, always re-renders
const items = useSelector(store, (s) => s.items.filter(...));

// ✅ Good: Use shallowEqual for derived arrays
const items = useSelector(store, (s) => s.items.filter(...), shallowEqual);

// ✅ Better: Memoize the selector
const selectActiveItems = useMemo(
  () => (state: State) => state.items.filter((t) => !t.done),
  []
);
const items = useSelector(store, selectActiveItems, shallowEqual);
```

### Multiple Stores

Components can consume multiple stores:

```tsx
function Dashboard() {
  const { user } = useStore(userStore);
  const { items } = useStore(cartStore);
  const { notifications } = useStore(notificationStore);

  return (
    <div>
      <span>Welcome, {user.name}</span>
      <span>{items.length} items in cart</span>
      <span>{notifications.length} notifications</span>
    </div>
  );
}
```

### Server-Side Rendering (SSR)

Sthira stores are singletons by default. For SSR, create stores per-request:

```tsx
// For Next.js App Router
export function createStores() {
  return {
    user: createStore({ name: 'user', state: { user: null } }),
    cart: createStore({ name: 'cart', state: { items: [] } }),
  };
}

// In your component
const stores = useMemo(() => createStores(), []);
```

---

## TypeScript

Full type inference works out of the box:

```tsx
const counterStore = createStore({
  name: 'counter',
  state: { count: 0 },
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1 }),
  }),
});

function Counter() {
  // `count` is inferred as `number`
  // `increment` is inferred as `() => void`
  const { count, increment } = useStore(counterStore);

  return <div>{count}</div>;
}
```

---

## Performance Tips

1. **Use selectors** for components that only need part of the state
2. **Use `useStoreActions`** for components that only trigger actions
3. **Use `shallowEqual`** when selecting objects or arrays
4. **Split large stores** into smaller, focused stores
5. **Memoize expensive selectors** with `useMemo`

---

## Next Steps

- **[Core Concepts](../core-concepts.md)**: Understand stores and actions
- **[Persistence](../ecosystem/persistence.md)**: Save state to storage
- **[DevTools](../ecosystem/devtools.md)**: Debug with time-travel
