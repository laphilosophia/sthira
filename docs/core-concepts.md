# Core Concepts

Understanding the building blocks of Sthira infrastructure.

## The Store

The **Store** is the central unit of Sthira. Unlike other libraries where a store is just a value container, a Sthira store is an **entity** with identity, lifecycle, and capabilities.

### `createStore`

```typescript
const myStore = createStore({
  name: 'unique-store-name', // Required for persistence and devtools identification
  state: { ... },            // Initial state
  schema: z.object({...}),   // Optional runtime validation
  actions: { ... },          // Logic
});
```

- **`name`**: Critical for identifying the store across sessions (persistence) or browser tabs (sync).
- **`state`**: The initial data.
- **`schema`**: A Zod schema. If provided, Sthira will validate every state update against this schema.

## Schema Validation

Sthira treats type safety as a first-class citizen. By defining a schema, you ensure that invalid data **never** enters your state infrastructure.

```typescript
const userSchema = z.object({
  id: z.string().uuid(),
  age: z.number().min(0).max(120),
});

const userStore = createStore({
  name: 'user',
  schema: userSchema,
  // ...
});
```

If an action tries to set `age: -5`, Sthira will throw a `ZodError` and **rollback** the transaction. The state remains unchanged.

## Actions

Actions are pure functions that describe _how_ state transitions happen.

```typescript
actions: {
  updateName: (state, payload) => {
    // Return a partial object to merge
    return { name: payload };
  },
  complexUpdate: (state) => {
    // You can access current state
    const newTotal = state.total + 10;
    return { total: newTotal, lastUpdated: new Date() };
  }
}
```

### Async Operations

Sthira actions are synchronous transaction units. For async operations (fetching data), you simply call actions _after_ the async operation completes, or use the `@sthirajs/fetch` plugin for managed async state.

```typescript
// Pattern: Async Controller
async function loadUserData() {
  userStore.actions.setLoading(true);
  try {
    const data = await api.fetchUser();
    userStore.actions.setData(data); // Commit transaction
  } catch (err) {
    userStore.actions.setError(err);
  } finally {
    userStore.actions.setLoading(false);
  }
}
```
