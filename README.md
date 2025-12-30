# Sthira

**Deterministic execution engine kernel for frontend applications.**

> स्थिर (sthira) — Sanskrit for "stable, steady, firm"

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-247%20passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🎯 What is Sthira?

Sthira is a **deterministic execution engine** designed for enterprise-grade frontend applications. It provides a structured way to manage heavy computation, large data processing, and complex async workflows — keeping your UI silky smooth.

**Perfect for:**
- � Heavy dashboards with large datasets
- 🏗️ Low-code/No-code builders
- 🗄️ Metadata-driven applications (SAP-style)
- ⚡ Apps requiring smooth 60fps UI

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| ⚡ **Dual Execution API** | `effect()` for light ops, `run()` for heavy computation |
| 🧠 **Worker Pool** | Off-main-thread execution with automatic pooling |
| 🔒 **FSM Lifecycle** | Deterministic state machine (INIT → ATTACHED → RUNNING → DISPOSED) |
| 🎯 **Scope Isolation** | Tasks bound to execution lanes, auto-abort on unmount |
| � **Cross-Scope Broadcast** | Authority-mediated communication between scopes |
| ⚛️ **React Integration** | Thin hooks: `useScope`, `useTask`, `useRun` |

---

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@sthira/core` | Core execution engine (247 tests, ~31KB) |
| `@sthira/react` | React hooks (thin wrapper) |

---

## 🚀 Installation

```bash
# Core only
pnpm add @sthira/core

# With React
pnpm add @sthira/core @sthira/react
```

---

## 📖 Quick Start

### Vanilla TypeScript

```typescript
import { createAuthority, createScope, createTask } from '@sthira/core'

// 1. Create Authority (God — global config, WorkerPool)
const authority = createAuthority({
  engine: { defaultWorkers: 1, maxWorkers: 4 }
})

// 2. Create Scope (Imperative — execution lane)
const scope = createScope(authority)({
  id: 'dashboard',
  name: 'Dashboard',
  engine: { workers: 4 }  // Override for this lane
})
scope.mount()

// 3. Execute Tasks
const task = createTask(scope)

// Light path — direct execution, zero overhead
const value = task.effect(() => computedValue)

// Heavy path — uses WorkerPool
const result = await task.run(async (ctx) => {
  // ctx.signal for AbortController
  // ctx.spawnWorker() for parallel work
  // ctx.createStream() for streaming output
  return processLargeData(ctx.signal)
}, { deferred: true })

// 4. Cleanup (aborts all tasks automatically)
authority.dispose()
```

### React

```tsx
import {
  AuthorityProvider,
  ScopeProvider,
  useTask,
  useRun,
  useBroadcast,
  useBroadcaster
} from '@sthira/react'

// Wrap your app
function App() {
  return (
    <AuthorityProvider config={{ engine: { maxWorkers: 4 } }}>
      <Dashboard />
    </AuthorityProvider>
  )
}

// Use ScopeProvider — tasks auto-bind to parent scope
function Dashboard() {
  return (
    <ScopeProvider id="dashboard" name="Dashboard" workers={4}>
      <Header />
      <DataTable />  {/* Auto-bound to dashboard scope */}
    </ScopeProvider>
  )
}

// No scope prop needed!
function DataTable() {
  const task = useTask()  // Auto-binds to parent scope

  // Light execution
  const total = task.effect(() => items.reduce((a, b) => a + b, 0))

  // Heavy execution with loading state
  const { data, loading, error, execute } = useRun(
    async (ctx) => {
      const res = await fetch('/api/data', { signal: ctx.signal })
      return res.json()
    }
  )

  // Cross-scope communication
  useBroadcast('user-updated', (data) => {
    console.log('User updated:', data)
  })

  const broadcast = useBroadcaster()
  const handleSave = () => broadcast('data-saved', { id: 1 })

  return (
    <div>
      {loading ? <Spinner /> : <DataTable data={data} />}
    </div>
  )
}
```

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       AUTHORITY                              │
│  • Singleton per runtime                                     │
│  • Owns WorkerPool                                           │
│  • Scope registry                                            │
│  • Cross-scope mediator (broadcast)                          │
│  Role: "God" — system-wide rules                             │
└────────────────────────┬────────────────────────────────────┘
                         │ governs
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        SCOPE                                 │
│  • FSM lifecycle (INIT → ATTACHED → RUNNING → DISPOSED)     │
│  • Worker config override                                    │
│  • Task coordination                                         │
│  • Isolated from other scopes                                │
│  Role: "Imperative" — execution lane controller              │
└────────────────────────┬────────────────────────────────────┘
                         │ contains
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        TASK                                  │
│  • Single execution instance                                 │
│  • Immutable Ref identity                                    │
│  • Owns Workers, Handlers, Streams                           │
│  • Dual API: effect() / run()                                │
│  Role: "Demi-god" — actual work                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 API Reference

### Core

| Function | Description |
|----------|-------------|
| `createAuthority(config?)` | Create global Authority |
| `createScope(authority)(config)` | Create Scope in Authority |
| `createTask(scope)` | Get TaskFactory for Scope |

### Task Execution

| Method | Path | Use Case |
|--------|------|----------|
| `task.effect(fn)` | Light | Computed, trivial sync/async ops |
| `task.run(fn, opts)` | Heavy | Large data, WorkerPool, streaming |

### React Hooks

| Hook | Description |
|------|-------------|
| `useAuthority()` | Get Authority from context |
| `useScope(config)` | Create/manage Scope (auto-dispose) |
| `useTask(scope)` | Get TaskFactory |
| `useRun(scope, fn, opts)` | Execute with loading/error state |
| `useBroadcast(channel, handler)` | Subscribe to Authority broadcast |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture Foundation](./docs/architecture-foundation.md) | Core concepts & hierarchy |
| [Execution Semantics](./docs/execution-semantics.md) | FSM, lifecycle, guarantees |
| [Engine Semantics](./docs/engine-semantics.md) | WorkerPool, effect/run |
| [API Contract](./docs/api-contract.md) | Public API surface |

---

## 🧪 Development

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Typecheck
pnpm typecheck

# Build
pnpm build

# Lint & format
pnpm lint
pnpm format
```

### Test Stats

```
@sthira/core: 247 tests across 11 suites
├─ Authority     (24)
├─ Scope         (28)
├─ Task          (44)
├─ WorkerPool    (18)
├─ StreamBuffer  (17)
└─ ...and more
```

---

## 🎯 Design Principles

1. **Brain Decides, Body Executes** — Execution Layer (correctness) vs Engine Layer (performance)
2. **Zero Zombie Async** — All tasks abort on scope disposal
3. **Explicit Intent** — `effect()` for light, `run()` for heavy
4. **Scope Isolation** — No cross-scope shared state
5. **React as Thin Wrapper** — Core is framework-agnostic

---

## 📄 License

MIT

---

<p align="center">
  <strong>Built for enterprise-grade frontend applications</strong>
</p>
