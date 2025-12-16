# Introduction

**Sthira** (Sanskrit: _Steady, Enduring_) is an enterprise-grade state infrastructure designed for mission-critical applications.

Unlike traditional state libraries that focus merely on variables, Sthira treats state as a **robust infrastructure** with built-in:

- **Transactional Integrity:** Commit/Rollback support.
- **Failover & Durability:** Multi-adapter persistence strategies.
- **Observability:** Fine-grained event streams and debugging.
- **Type Safety:** First-class TypeScript support.

## Core Philosophy

Sthira is built on three pillars:

1.  **Safety First:** State transitions must be predictable and recoverable.
2.  **Infrastructure, Not Just State:** Focus on the lifecycle, persistence, and reliability of data.
3.  **Agnostic:** Designed to work in any JavaScript environment (React, Vue, Node.js, etc.).

## Quick Example

```tsx
import { createStore } from '@sthirajs/core';
import { useStore } from '@sthirajs/react';

// 1. Create a specialized store
const counterStore = createStore({
  name: 'counter',
  state: { count: 0 },
  actions: {
    increment: (state) => ({ count: state.count + 1 }),
    decrement: (state) => ({ count: state.count - 1 }),
  },
});

function Counter() {
  const { count } = useStore(counterStore);

  return (
    <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
      <h3>Sthira Counter</h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => counterStore.actions.decrement()}>-</button>
        <span style={{ fontSize: 24, fontWeight: 'bold' }}>{count}</span>
        <button onClick={() => counterStore.actions.increment()}>+</button>
      </div>
    </div>
  );
}
```
