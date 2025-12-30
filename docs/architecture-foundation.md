# Sthira Architecture Foundation

> **NORMATIVE ROOT** — This document supersedes all others.
> All documentation must align with this foundational architecture.

---

## 1. Problem Statement

Modern frontend applications fail not because computation is slow, but because:

1. **Heavy tasks block the main thread** → UI freezes
2. **High volume operations overwhelm** → Jank, stutter
3. **Async chaos** → Race conditions, zombie effects
4. **No execution control** → Stale results, wasted computation

Sthira solves ALL of these, not just #3 and #4.

---

## 2. Two-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│              EXECUTION LAYER (Brain)                │
│                                                     │
│   • FSM-gated lifecycle                             │
│   • Deterministic disposal                          │
│   • Policy enforcement (retry, timeout, concurrency)│
│   • Authorization pipeline                          │
│                                                     │
│   "DECIDES what runs, when, and if"                 │
└────────────────────────┬────────────────────────────┘
                         │ controls
                         ↓
┌─────────────────────────────────────────────────────┐
│               ENGINE LAYER (Body)                   │
│                                                     │
│   • Web Worker pool (true parallelism)              │
│   • Time-slicing (long tasks don't block)           │
│   • Yielding (requestIdleCallback, scheduler.yield) │
│   • Priority-based scheduling                       │
│   • Backpressure handling                           │
│                                                     │
│   "EXECUTES work smoothly without blocking UI"      │
└─────────────────────────────────────────────────────┘
```

**Brain decides. Body executes.**

---

## 3. Execution Layer Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    AUTHORITY                         │
│  • Instance creation (singleton per runtime)         │
│  • Policy enforcer (retry, timeout, concurrency)     │
│  • Limit definitions                                 │
│  • Global boundaries                                 │
│                                                      │
│  "CONFIG + BOUNDARIES — System-wide limits"          │
└────────────────────────┬────────────────────────────┘
                         │ governs
                         ↓
┌─────────────────────────────────────────────────────┐
│                      SCOPE                           │
│  • Multiple task timeline (execution lane)           │
│  • Scope-level config + boundaries                   │
│  • FSM lifecycle (deterministic layer)               │
│  • Task coordination                                 │
│                                                      │
│  "EXECUTION LANE — Where tasks run in sequence"      │
└────────────────────────┬────────────────────────────┘
                         │ contains
                         ↓
┌─────────────────────────────────────────────────────┐
│                      TASK                            │
│  • Single execution instance                         │
│  • Disposer (owns cleanup)                           │
│  • Owns execution units                              │
│  • REQUEST ORIGIN — execution starts here            │
│                                                      │
│  "SINGLE EXECUTION — Actual work happens here"       │
└─────────────────────────────────────────────────────┘
```

---

## 4. Request Flow

```
Task wants to execute
    ↓
Scope checks FSM (canExecute?)
    ↓
Authority checks policy (within limits?)
    ↓
Engine executes (smooth, parallel, etc.)
```

**Task initiates → Scope gates → Authority permits → Engine executes**

---

## 5. Execution Layer Components

### Authority
- Instance creation (singleton per runtime)
- Policy enforcement (retry, timeout, concurrency)
- Limit definitions (maxConcurrentTasks, maxTaskSpawn)
- Global config and boundaries

### Scope
- Multiple task timeline (execution lane)
- FSM lifecycle (`INIT → ATTACHED → RUNNING → SUSPENDED → DISPOSING → DISPOSED`)
- Scope-level config overrides
- Task coordination and disposal

### Task
- Single execution instance with immutable `Ref`
- Owns execution units (handlers)
- Disposal management
- Request origin point

---

## 6. Role Definitions

| Component | Role | Power | Boundary |
|-----------|------|-------|----------|
| **Authority** | God | System-wide rules, mediator, worker pool | None |
| **Scope** | Imperative | Lane control, FSM, disposal, worker override | Authority limits |
| **Task** | Demi-god | Full power in execution via effect/run | Scope boundaries |

```
Authority says: "Default 1 worker, max 4"
    ↓
Scope says: "This lane needs 4 workers" (override)
    ↓
Task says: "effect() for trivial, run() for heavy"
           "I own my execution context"
```

---

## 7. Scope Isolation

Scopes are **isolated by default**:

- Scope A cannot directly access Scope B
- No shared state between scopes
- Disposal of one scope does not affect others

**Communication via Authority (Mediator Pattern):**

```
      Authority (Mediator)
      /        |        \
  Scope A   Scope B   Scope C
  (isolated) (isolated) (isolated)
```

```typescript
// Cross-scope communication
authority.broadcast('user-updated', userData)

// Shared resources at Authority level
const sharedCache = authority.getSharedCache('user-data')
```

---

## 8. Dual Execution API

Tasks execute via two paths:

### effect() — Light Path
```typescript
ctx.effect(() => computed.value)  // Direct, no worker, no overhead
```

### run() — Heavy Path
```typescript
ctx.run(async () => processData()) // Worker pool, streaming, buffer
```

See [engine-semantics.md](./engine-semantics.md) for details.

---

## 9. Engine Layer Components

### WorkerPool
- Web Worker lifecycle management
- Thread spawning and termination
- Work distribution

### TimeSlice
- Break long tasks into chunks
- Yield to browser between chunks
- Prevent main thread blocking

### Yielder
- `requestIdleCallback` integration
- `scheduler.yield()` support (if available)
- Priority-aware execution

### PriorityQueue
- HIGH: User interaction (immediate)
- NORMAL: Data loading (standard)
- LOW: Background sync (deferred)
- IDLE: Analytics, prefetch (idle time only)

### Backpressure
- Flow control for high volume
- Queue management
- Drop/throttle policies

---

## 7. Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `inline` | Main thread, immediate | Quick, non-blocking |
| `async` | Main thread, scheduled | Standard async work |
| `deferred` | Idle time only | Background, non-urgent |
| `parallel` | Web Worker | CPU-bound, heavy |
| `sliced` | Time-sliced chunks | Long iterations |

---

## 8. Ownership Model

```
Authority
    ↓ governs
Scope (with FSM)
    ↓ contains
Task
    ↓ owns (Execution Layer)
    │   └── Handlers (execution methods)
    │
    ↓ uses (Engine Layer)
        ├── Workers (from WorkerPool)
        ├── TimeSlice (for long tasks)
        └── Streams (for output)
```

Key distinction:
- **Task OWNS** handlers (lifecycle bound)
- **Task USES** engine resources (borrowed, returned)

---

## 9. Correctness + Performance

Both are first-class concerns:

| Concern | Layer | Guarantee |
|---------|-------|-----------|
| No zombie effects | Execution | Disposal aborts all |
| No stale execution | Execution | FSM gating |
| No UI blocking | Engine | Worker pool + yielding |
| No jank | Engine | Time-slicing + priority |

**Neither is optional. Both are required for Sthira.**

---

## 10. Document Hierarchy

```
architecture-foundation.md    ← NORMATIVE ROOT (this file)
    │
    ├── execution-semantics.md    (Execution Layer spec)
    │       └── Authority, Scope, Task, FSM
    │
    ├── engine-semantics.md       (Engine Layer spec)
    │       └── WorkerPool, TimeSlice, Yielder
    │
    ├── api-contract.md           (Public API)
    │
    └── implementation.md         (Code architecture)
```

---

## Summary

> Sthira is a **two-layer execution system**:
>
> **Brain** (Execution Layer) decides what runs.
> **Body** (Engine Layer) makes it run smoothly.
>
> Correctness AND performance. Not one or the other.
