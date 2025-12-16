# Core Concepts

Understanding the building blocks of Sthira's state infrastructure.

## The Store

The **Store** is the central unit of Sthira. Unlike other libraries where a store is just a value container, a Sthira store is an **entity** with identity, lifecycle, and capabilities.

### Creating a Store

```typescript
import { createStore } from '@sthirajs/core';
import { z } from 'zod';

const userStore = createStore({
  name: 'user-session', // Unique identifier (required)
  schema: userSchema, // Runtime validation (optional)
  state: { user: null }, // Initial state
  actions: (set, get) => ({
    // State mutations
    login: (user) => set({ user }),
    logout: () => set({ user: null }),
  }),
});
```

### Store Configuration

| Option     | Type                | Required | Description                                           |
| ---------- | ------------------- | -------- | ----------------------------------------------------- |
| `name`     | `string`            | ✅       | Unique identifier for persistence, devtools, and sync |
| `state`    | `object`            | ✅       | Initial state value                                   |
| `schema`   | `ZodSchema`         | ❌       | Runtime validation schema                             |
| `actions`  | `function`          | ❌       | Action creators for state mutations                   |
| `plugins`  | `Plugin[]`          | ❌       | Array of plugins to extend functionality              |
| `persist`  | `boolean \| object` | ❌       | Enable persistence (shorthand)                        |
| `sync`     | `boolean \| object` | ❌       | Enable cross-tab sync (shorthand)                     |
| `devtools` | `boolean \| object` | ❌       | Enable devtools (shorthand)                           |

## State & Immutability

Sthira enforces **immutable state updates**. You never mutate state directly — you describe what should change, and Sthira handles the rest.

```typescript
// ❌ Wrong: Direct mutation
store.getState().count++; // This won't work!

// ✅ Correct: Use setState or actions
store.setState({ count: store.getState().count + 1 });
// or
store.actions.increment();
```

### Partial Updates

`setState` performs a **shallow merge** — you only need to specify the fields you want to change:

```typescript
// State: { count: 0, name: 'Guest', settings: { theme: 'light' } }

store.setState({ count: 5 });
// Result: { count: 5, name: 'Guest', settings: { theme: 'light' } }
```

For nested updates, spread the nested object:

```typescript
store.setState({
  settings: { ...store.getState().settings, theme: 'dark' },
});
```

## Schema Validation

Sthira treats **type safety** as a first-class citizen. By defining a Zod schema, you ensure that invalid data **never** enters your state.

```typescript
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

const userStore = createStore({
  name: 'user',
  schema: userSchema,
  state: {
    id: crypto.randomUUID(),
    name: 'Guest',
    email: 'guest@example.com',
    age: 0,
  },
});
```

### Validation Behavior

When an invalid update is attempted:

```typescript
userStore.setState({ age: -5 });
// ❌ Throws ZodError: Number must be greater than or equal to 0

userStore.setState({ email: 'not-an-email' });
// ❌ Throws ZodError: Invalid email format
```

The state remains unchanged — **no partial corruption** occurs.

## Actions

Actions are pure functions that describe **how** state transitions happen. They provide a clean API for components and enable better debugging.

### Action Patterns

```typescript
const todoStore = createStore({
  name: 'todos',
  state: { items: [], filter: 'all' },
  actions: (set, get) => ({
    // Simple update
    setFilter: (filter: 'all' | 'active' | 'completed') => set({ filter }),

    // Computed update
    addTodo: (text: string) =>
      set({
        items: [...get().items, { id: Date.now(), text, done: false }],
      }),

    // Conditional update
    toggleTodo: (id: number) =>
      set({
        items: get().items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      }),

    // Multiple field update
    clearCompleted: () =>
      set({
        items: get().items.filter((item) => !item.done),
        filter: 'all',
      }),
  }),
});

// Usage
todoStore.actions.addTodo('Learn Sthira');
todoStore.actions.toggleTodo(123);
```

### Async Operations

Actions themselves are **synchronous** — they represent atomic state transitions. For async operations, call actions after the async work completes:

```typescript
// Pattern: Async Controller (Recommended)
async function loadUserData(userId: string) {
  userStore.actions.setLoading(true);

  try {
    const user = await api.fetchUser(userId);
    userStore.actions.setUser(user);
  } catch (error) {
    userStore.actions.setError(error.message);
  } finally {
    userStore.actions.setLoading(false);
  }
}
```

For managed async state, use **[@sthirajs/fetch](./ecosystem/fetch.md)**.

## Subscriptions

Subscribe to state changes for reactive updates:

```typescript
// Subscribe to all changes
const unsubscribe = store.subscribe((state, prevState) => {
  console.log('State changed:', state);
});

// Clean up when done
unsubscribe();
```

### Selective Subscriptions with Selectors

For performance, use selectors to subscribe to specific slices:

```typescript
// Only fires when 'count' changes
store.subscribe(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count changed: ${prevCount} → ${count}`);
  },
);
```

## Plugins

Plugins extend store functionality without modifying the core behavior. Sthira ships with first-party plugins:

| Plugin                | Purpose                             |
| --------------------- | ----------------------------------- |
| `@sthirajs/persist`   | Save/restore state to storage       |
| `@sthirajs/cross-tab` | Sync state across browser tabs      |
| `@sthirajs/devtools`  | Redux DevTools integration          |
| `@sthirajs/fetch`     | Managed async data fetching         |
| `@sthirajs/perf`      | Performance monitoring              |
| `@sthirajs/chunked`   | Virtual pagination for large arrays |

### Using Plugins

```typescript
import { createStore } from '@sthirajs/core';
import { createPersistPlugin } from '@sthirajs/persist';
import { createDevToolsPlugin } from '@sthirajs/devtools';

const store = createStore({
  name: 'app',
  state: { ... },
  plugins: [
    createPersistPlugin({ key: 'app-state' }),
    createDevToolsPlugin({ name: 'My App' }),
  ],
});
```

### Shorthand Syntax

For common plugins, use the shorthand configuration:

```typescript
const store = createStore({
  name: 'app',
  state: { ... },
  persist: true,    // Enables @sthirajs/persist
  devtools: true,   // Enables @sthirajs/devtools
  sync: true,       // Enables @sthirajs/cross-tab
});
```

## Computed Values

Create derived state that updates automatically:

```typescript
const cartStore = createStore({
  name: 'cart',
  state: { items: [] },
  computed: {
    totalItems: (state) => state.items.length,
    totalPrice: (state) => state.items.reduce((sum, item) => sum + item.price, 0),
    isEmpty: (state) => state.items.length === 0,
  },
});

// Computed values are available on the state
console.log(cartStore.getState().totalPrice); // 0
```

## Store Lifecycle

Stores have a defined lifecycle:

1. **Creation**: Store is initialized with initial state
2. **Hydration**: If persistence is enabled, state is loaded from storage
3. **Active**: Store is ready for reads/writes
4. **Destroy**: Clean up subscriptions and persist final state

```typescript
// Manual cleanup (optional)
store.destroy();
```

## Next Steps

- **[React Bindings](./packages/react.md)**: Using Sthira with React
- **[Persistence](./ecosystem/persistence.md)**: Save state to storage
- **[DevTools](./ecosystem/devtools.md)**: Debug with time-travel
