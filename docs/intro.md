# Introduction

**Sthira** (Sanskrit: स्थिर, pronounced _STEE-rah_) — meaning _Steady, Stable, Enduring_ — is an enterprise-grade state infrastructure designed for mission-critical React applications.

## Why Sthira?

Modern web applications face a fundamental challenge: **state is treated as an afterthought**. Most state management libraries focus on reactivity and convenience, leaving critical concerns like persistence, synchronization, and validation as optional add-ons.

Sthira takes a different approach. It treats state as **infrastructure** — a foundational layer that must be reliable, consistent, and observable.

### The Problem with Traditional State Management

```tsx
// ❌ Traditional approach: State is a fragile variable
const [user, setUser] = useState(null);

// What happens when:
// - The user refreshes the page? (state lost)
// - Multiple tabs are open? (state inconsistent)
// - Invalid data is set? (silent bugs)
// - You need to debug a production issue? (no visibility)
```

### The Sthira Approach

```tsx
// ✅ Sthira approach: State is infrastructure
const userStore = createStore({
  name: 'user-session',
  schema: userSchema, // Runtime validation
  state: { user: null },
  persist: true, // Automatic persistence
  sync: true, // Cross-tab synchronization
  devtools: true, // DevTools integration
});
```

## Core Philosophy

Sthira is built on three fundamental principles:

### 1. Safety First

State transitions must be **predictable** and **recoverable**. Every state update is validated against your schema, and invalid updates are rejected before they corrupt your application state.

```typescript
// If this violates the schema, the update is rejected
userStore.setState({ age: -5 }); // ❌ ZodError: Number must be >= 0
```

### 2. Infrastructure, Not Just State

Sthira focuses on the complete **lifecycle** of your data:

- **Initialization**: Hydrate from storage on startup
- **Validation**: Ensure data integrity on every update
- **Persistence**: Save to storage automatically
- **Synchronization**: Keep multiple tabs in sync
- **Observability**: Debug with time-travel capabilities

### 3. Framework Agnostic Core

While `@sthirajs/react` provides first-class React integration, the core engine (`@sthirajs/core`) is framework-agnostic. It works in:

- React, Vue, Svelte, Solid
- Node.js backends
- Web Workers
- Any JavaScript environment

## Quick Example

```tsx
import { createStore } from '@sthirajs/core';
import { useStore } from '@sthirajs/react';
import { z } from 'zod';

// 1. Define your schema
const counterSchema = z.object({
  count: z.number().min(0).max(100),
});

// 2. Create a store with full infrastructure
const counterStore = createStore({
  name: 'counter',
  schema: counterSchema,
  state: { count: 0 },
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1 }),
    decrement: () => set({ count: Math.max(0, get().count - 1) }),
    reset: () => set({ count: 0 }),
  }),
});

// 3. Use in React
function Counter() {
  const { count, increment, decrement, reset } = useStore(counterStore);

  return (
    <div className="counter">
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Comparison with Other Libraries

| Feature           | Sthira             | Zustand   | Redux Toolkit | Jotai     |
| ----------------- | ------------------ | --------- | ------------- | --------- |
| Bundle Size       | ~2KB               | ~1KB      | ~11KB         | ~2KB      |
| TypeScript        | First-class        | Good      | Good          | Excellent |
| Schema Validation | Built-in (Zod)     | Manual    | Manual        | Manual    |
| Persistence       | First-party plugin | Community | Community     | Community |
| Cross-tab Sync    | First-party plugin | Manual    | Manual        | Manual    |
| DevTools          | First-party plugin | Built-in  | Built-in      | Community |
| Learning Curve    | Low                | Very Low  | Medium        | Low       |

## When to Use Sthira

**Sthira is ideal for:**

- Enterprise applications requiring data integrity
- Applications with complex persistence requirements
- Multi-tab applications needing state synchronization
- Teams that value type safety and runtime validation

**Consider alternatives if:**

- You need the smallest possible bundle size (use Zustand)
- Your state is purely atomic/granular (use Jotai)
- You have an existing Redux codebase

## Next Steps

- **[Installation](./installation.md)**: Get started with Sthira
- **[Quick Start](./quick-start.md)**: Build your first store
- **[Core Concepts](./core-concepts.md)**: Deep dive into the architecture
