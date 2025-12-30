# Sthira Execution Semantics

> Canonical specification of Sthira's **Execution Layer**.
> Parent document: [architecture-foundation.md](./architecture-foundation.md)
>
> This document defines the Brain layer (correctness, lifecycle, FSM).
> For the Body layer (performance, parallelism), see [engine-semantics.md](./engine-semantics.md).

---

## 1. Core Positioning

Sthira is a **deterministic execution engine kernel**.

It:

* owns execution lifecycle
* owns task coordination
* owns determinism and disposal

It does **not**:

* own payload data
* own domain-specific algorithms
* act as a data storage engine

Sthira operates as a **control + execution kernel**, not a data engine.

---

## 2. Core Definitions

### Authority

Global execution governor.
Responsible for:

* policies (retry, timeout, priority)
* worker provisioning
* scheduler decisions

### Scope

An execution namespace.
Responsible for:

* execution validity
* lifecycle gating
* ref resolution

### Task

A single execution instance.

* Identified by a unique Ref
* Owns workers and handlers
* Terminates deterministically

### Ref

**Immutable execution symbol**.

Properties:

* Carries no payload
* Carries no cursor
* Carries no data
* Functions as a unique execution identifier

Ref == task identity.

If a ref changes, execution context changes.

### Worker

A task-correlated execution unit.

* Spawned only after execution activation
* Bound to exactly one task
* Destroyed when task is disposed

### Handler

A method participating in task execution.

* May run in parallel
* May be conditional
* May fail independently

### Stream

A runtime-controlled execution output channel.

* Lifecycle managed by task
* Abortable via task disposal

---

## 3. Ref Lifecycle

* Ref is created when a task is instantiated
* Ref is immutable for the lifetime of the task
* Ref is used as the matching symbol for:

  * handlers
  * workers
  * cache entries

Scope does **not** own the ref.
Scope only defines **where the ref is valid**.

Task disposal invalidates the ref logically.
Physical resources may remain but are unreachable.

---

## 4. Task Lifecycle FSM

```
INIT
 → ATTACHED
 → RUNNING
 → SUSPENDED
 → DISPOSING
 → DISPOSED
```

### State Semantics

* INIT: task declared, not yet active
* ATTACHED: ref bound into scope namespace
* RUNNING: execution permitted
* SUSPENDED: execution paused, no mutation
* DISPOSING: shutdown initiated
* DISPOSED: terminal state

FSM is authoritative.
No execution bypass is allowed.

---

## 5. Execution Activation (Commit Semantics)

**Commit is an internal concept.**

Commit means:

* execution activation
* reservation of execution slot
* permission to spawn workers
* permission to initialize lazy caches

Commit does **not** mean:

* data acceptance
* data materialization
* state mutation

Materialization is asynchronous and optional.

---

## 6. Handler Execution Model

* Handlers are methods bound to a task
* Execution order is not fixed
* Handlers may run in parallel
* Execution forms a DAG, not a strict pipeline

Failure rules:

* Handler failure → task error
* No implicit retries at handler level
* Retry is task-scoped only

There is **no fairness guarantee**.
Slow handlers slow the task.

---

## 7. Worker Semantics

* Workers are spawned only after execution activation
* Workers are correlated strictly to a task via ref
* No worker spans multiple tasks
* Worker-to-worker communication occurs only within a task

Task disposal:

* terminates all workers
* terminates all handlers

---

## 8. Streaming Semantics

* Streaming lifecycle is controlled at task level
* Streaming begins only after execution activation
* Streaming is aborted on task disposal

Error behavior:

* No silent drops
* Errors are propagated
* Graceful shutdown is preferred

---

## 9. Invalidation and Retry

* Invalidation requests originate from task
* Scope validates execution eligibility
* Retry is task-level
* Ref never mutates during retry

Retry produces a **new task**.

---

## 10. Observability and DevTools

DevTools provide **read-only** visibility:

* execution timeline
* FSM state
* handler DAG
* worker lifecycle
* stream lifecycle

DevTools do not:

* mutate execution
* override authority
* bypass FSM

---

## 11. Non-Goals

Sthira does not attempt to:

* provide scheduling fairness
* optimize memory reuse
* guarantee throughput
* replace domain-specific engines

Correctness and determinism take precedence.

---

## 12. Role Definitions

| Component | Role | Responsibility |
|-----------|------|----------------|
| **Authority** | God | System-wide policy, mediator for cross-scope communication |
| **Scope** | Imperative | FSM lifecycle, task coordination, lane control |
| **Task** | Demi-god | Full execution power within scope boundaries |

---

## 13. Engine Layer Integration

The Execution Layer controls WHEN and IF.
The Engine Layer (see [engine-semantics.md](./engine-semantics.md)) controls HOW.

```
Execution Layer: "This task may run" (FSM + policy)
    ↓
Engine Layer: "Run it in parallel/sliced/deferred" (performance)
```

Task specifies execution mode hints:

```typescript
ctx.compute(fn, { mode: 'parallel' })   // Engine runs in Web Worker
ctx.process(items, { mode: 'sliced' })  // Engine time-slices
```

---

## Final Statement

Sthira enforces deterministic execution.
It exists to ensure that:

> What runs, runs exactly when it is allowed to run — and never otherwise.
