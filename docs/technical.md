# Sthira – Technical Documentation

> This document provides the developer-facing API overview.
> For normative execution semantics, see [execution-semantics.md](./execution-semantics.md).

---

## Purpose

Sthira is a **deterministic execution engine kernel** for frontend applications.
It enforces correctness around async work: ownership, lifecycle, disposal, and execution coordination.

It **is**:

* an execution lifecycle manager
* a task coordination system
* a deterministic disposal engine

It is **not**:

* a state manager
* a data storage engine
* a React abstraction
* an HTTP request wrapper
* a cache layer

Data and state are **external concerns**. Sthira only controls **when and whether** execution happens.

---

## Core Model

```
createAuthority()
      ↓
createScope()
      ↓
createTask()
```

### Authority

A global execution governor that:

* enforces concurrency limits
* applies retry/timeout policies
* provisions workers
* makes scheduler decisions
* disposes scopes and aborts tasks when necessary

### Scope

An execution namespace defining:

* execution validity scope
* lifecycle gating (FSM)
* ref resolution

Scope does **not** own data. It only defines **where a ref is valid**.

### Task (Task)

A single execution instance that:

* is identified by an immutable **Ref**
* owns workers and handlers
* terminates deterministically
* never bypasses FSM gating

### Ref

**Immutable execution symbol**.

* Carries no payload, no cursor, no data
* Functions as a unique execution identifier
* If ref changes, execution context changes

### Worker

A task-correlated execution unit:

* Spawned only after execution activation
* Bound to exactly one task
* Destroyed when task is disposed

### Handler

A method participating in task execution:

* May run in parallel
* May be conditional
* May fail independently (causes task error)

### Stream

A runtime-controlled execution output channel:

* Lifecycle managed by task
* Abortable via task disposal

---

## 1. Authority API

```ts
createAuthority({
  name: 'dashboard',
  policies: {
    maxConcurrentTasks: 3,
    maxTaskSpawn: 4,
    timeout: 10000,
    retry: 3
  }
})
```

**Notes**

* Only one authority per runtime instance
* Policies apply to all scopes unless overridden
* Authority may abort or reject tasks globally

---

## 2. Scope – Execution Namespace

### Definition

```ts
const scope = createScope({
  name: "insights",
  policies: {
    retry: 5,
    timeout: 20000
  }
})
```

### Rules

#### 2.1 Scope Identity

* One scope per scope key
* First instance owns the scope
* Later instances → auto dispose + abort their tasks

#### 2.2 Scope Lifecycle (FSM)

States:

```
INIT → ATTACHED → RUNNING → SUSPENDED → DISPOSING → DISPOSED
```

* INIT: declared, not yet active
* ATTACHED: ref bound into namespace
* RUNNING: execution permitted
* SUSPENDED: execution paused
* DISPOSING: shutdown initiated
* DISPOSED: terminal state

**FSM is authoritative. No execution bypass is allowed.**

#### 2.3 Disposal Behavior

When scope is disposed:

* All running tasks are **force-aborted**
* All workers are terminated
* All streams are aborted
* Pending executions are cancelled

Zombie async effects are impossible by design.

---

## 3. Task – Execution Unit

### Base Form

```ts
createTask("insights")(async ({ ref, signal }) => {
  const result = await fetchData({ signal })
  // External state management handles the result
  return result
})
```

### Rules

* Task executes work bound to a ref
* Task receives an AbortSignal for cancellation
* Task may spawn workers and handlers
* Task does **not** own or mutate state

### Ref Semantics

```ts
const task = createTask("insights")
task.ref  // immutable execution symbol
```

* Ref is created when task is instantiated
* Ref is immutable for the lifetime of the task
* Task disposal invalidates the ref logically

---

## 4. Execution Activation (Commit)

**Commit is an internal concept.**

Commit means:

* execution activation
* reservation of execution slot
* permission to spawn workers
* permission to initialize lazy caches

Commit does **NOT** mean:

* data acceptance
* data materialization
* state mutation

Materialization is asynchronous and external.

---

## 5. Handler Execution Model

* Handlers are methods bound to a task
* Execution order is not fixed
* Handlers may run in parallel
* Execution forms a DAG, not a strict pipeline

Failure rules:

* Handler failure → task error
* No implicit retries at handler level
* Retry is task-scoped only

---

## 6. Error, Retry, Disposal

### Error

```ts
createTask("insights")(async () => {
  throw new Error("fail")
})
```

* Error becomes task error state
* Scope observes it
* Retry: scope.policy.retry (if > 0)
* Failed tasks are disposed

### Retry

* Retry is task-level only
* Retry produces a **new task** with a new ref
* Old ref is invalidated

### Disposal

When scope is disposed:

* All tasks are **force-aborted**
* All workers are terminated
* All handlers are cancelled
* All streams are aborted

---

## 7. External Data Integration

Sthira does not own data. External systems handle state:

```ts
// TanStack Query owns data
const { data } = useQuery({
  queryKey: ['reports'],
  queryFn: fetchReports
})

// Sthira owns execution
createScope({ name: "insights" })

createTask("insights")(async ({ signal }) => {
  // Execution is gated by Sthira
  // Data is managed externally
  await processData(data, { signal })
})
```

Scope does not:

* fetch
* cache
* store data

Tools like TanStack Query, Zustand, Redux remain **owners of data**.
Sthira only controls **when execution is valid**.

---

## 8. What This Runtime Guarantees

**Guaranteed**

* No zombie async tasks
* No execution after dispose
* Deterministic task termination
* Policy-driven retry / timeout
* FSM-gated execution validity
* AbortSignal propagation

**Not Guaranteed**

* performance optimization
* state management
* data storage
* UI synchronization
* throughput optimization

---

## 9. What This Runtime Is Not

It is **not**:

* Zustand/Redux replacement
* global store
* reactive signal library
* React Query competitor
* async abstraction sugar
* data engine

Its goal is:

> Deterministic execution — what runs, runs exactly when it is allowed to run, and never otherwise.

---

## 10. Summary

| Layer | Responsibility |
|-------|----------------|
| Authority | global execution governance, retry/timeout, concurrency |
| Scope | execution namespace, lifecycle gating, ref resolution |
| Task | task execution, workers, handlers, streams |

**Data is not the purpose. Execution control is.**

---

## 11. Related Documents

* [execution-semantics.md](./execution-semantics.md) — Normative specification
* [algorithm.md](./algorithm.md) — Execution flow details
* [implementation.md](./implementation.md) — Implementation architecture
* [scopes.md](./scopes.md) — Scope & capacity definitions

---

# END
