# Sthira – Execution Algorithm & Logic Specification

> This document details the internal execution flow.
> For normative semantics, see [execution-semantics.md](./execution-semantics.md).

---

## 1. Execution Flow: Top-Level Overview

Everything starts when a Scope is created.

```
Scope Created
  ↓ registers in Authority
  ↓ initializes execution namespace
  ↓ transitions FSM → INIT → ATTACHED
```

When Task is invoked:

```
Task Requested
  ↓ Authority checks policies
  ↓ Scope validates FSM state
  ↓ Task ref allocated
  ↓ Execution activated (commit)
  ↓ Workers/Handlers spawned
  ↓ Task executes (async/sync)
  ↓ Task outcome returned
  ↓ Cleanup
```

When Scope is disposed:

```
Dispose issued
  ↓ Abort all active tasks
  ↓ Terminate all workers
  ↓ Cancel all handlers
  ↓ Abort all streams
  ↓ Release ownership
  ↓ FSM → DISPOSED
```

These three flows — **Create / Execute / Dispose** — form the runtime's backbone.

---

## 2. Internal Components

| Component | Function |
|-----------|----------|
| Authority Registry | active scopes & tasks bookkeeping |
| Scope FSM | execution lifecycle state machine |
| Task Table | currently running task tasks |
| Scheduler | execution slot management, worker provisioning |

---

## 3. Scope Lifecycle FSM

The FSM is the **sole arbiter** of whether execution is permitted.

States:

```
INIT
ATTACHED
RUNNING
SUSPENDED
DISPOSING
DISPOSED
```

**Execution is only permitted in ATTACHED or RUNNING states.**

Transition rules:

| Event | From → To |
|-------|-----------|
| mounted | INIT → ATTACHED |
| first task executed | ATTACHED → RUNNING |
| manual suspend | RUNNING → SUSPENDED |
| resume | SUSPENDED → RUNNING |
| dispose issued | any → DISPOSING → DISPOSED |

FSM is **irreversible** from DISPOSED — no return.

---

## 4. Task Execution Lifecycle

A task invocation (sync or async) follows these steps:

```
START:
  1) Scope exists?
       - If no → throw ScopeScopeNotFound
  2) Scope FSM allows execution?
       - If not → reject Task
  3) Policy check: maxConcurrentTasks?
       - If exceeded → queue or reject (policy)
  4) Allocate Task Ref (immutable)
  5) Register Task in Task Table
  6) Execution Activation (Commit)
       - Reserve execution slot
       - Spawn workers if needed
  7) Execute function body with AbortSignal
  8) Capture Result | Error
  9) Mark Outcome
 10) Cleanup: unregister task, trigger scheduler tick
END
```

Outcome classes:

```
SUCCESS
ERROR
ABORTED
REJECTED(policy)
TIMEOUT
```

---

## 5. Execution Activation (Commit)

**Commit is an internal execution concept.**

When a task is committed:

```
commit(task):
  - reserve execution slot in scheduler
  - permission to spawn workers
  - permission to initialize lazy resources
  - mark task as RUNNING
```

Commit does **NOT**:

* accept data
* materialize results
* mutate any state

External systems handle data after execution completes.

---

## 6. Worker & Handler Execution

### Worker Semantics

```
spawn_worker(task):
  if task.status != RUNNING:
    reject
  worker = new Worker(task.ref)
  task.workers.add(worker)
  return worker
```

* Workers are strictly bound to one task via ref
* No worker spans multiple tasks
* Worker-to-worker communication occurs only within a task

### Handler Semantics

```
execute_handlers(task):
  for each handler in task.handlers:
    run(handler)  // may run in parallel
```

* Handlers may run in parallel (DAG, not pipeline)
* Handler failure → task error
* No implicit retries at handler level

---

## 7. Disposal Algorithm

```
onDispose(scope):
  FSM → DISPOSING

  for each task in TaskTable(scope):
    abort(task)                     // AbortSignal triggered
    terminate(task.workers)         // all workers stopped
    cancel(task.handlers)           // all handlers cancelled
    abort(task.streams)             // all streams aborted

  unregister scope from authority
  FSM → DISPOSED
```

Guarantees:

* No execution continues after dispose
* No workers survive disposal
* No handlers survive disposal
* All streams are aborted

---

## 8. Concurrency + Sequential Guard

Authority controls task execution rights:

```
if activeTasks(scope) >= maxConcurrentTasks:
   if policy.queue:
       queue(taskCall)
   else:
       reject(TaskRejected)
```

Additional sequential behavior (fail-soft mode):

```
if maxTaskSpawn sequential limit reached:
   deny further spawns for this scope
```

This prevents cascade spam.

---

## 9. Retry Algorithm

Retry is scope/authority policy-driven:

```
if taskOutcome == ERROR && scope.policy.retry > 0:
    newTask = createNewTask()      // new Ref
    retry(newTask)
    decrement retry count
```

Retry produces a **new task** with a **new ref**.
Old ref is invalidated.

---

## 10. Read Snapshot Logic

During execution, read operations access snapshots:

```
get() → shallow runtime snapshot
```

Snapshot properties:

* represents execution state at a point in time
* does not include uncommitted data
* always immediate (not reactive)

---

## 11. Execution Consistency Rules

| Guarantee | Behavior |
|-----------|----------|
| Task after dispose | immediately rejected |
| Workers after dispose | terminated |
| Handlers after dispose | cancelled |
| Streams after dispose | aborted |
| Multiple scopes same key | only first lives |
| External execution bypass | undefined behavior (forbidden) |

---

## 12. Authority Responsibilities

Authority must maintain:

* Scope registry (Map<key, ref>)
* Task registry (Map<TaskRef, status>)
* Concurrency counters
* Timeouts and abort timers
* Retry scheduler
* Worker provisioning
* Observable event streams (optional)

Authority does NOT:

* own data
* store application state
* implement domain logic

---

## 13. Algorithmic Complexity Target

* All lookups → O(1) (Map)
* Worker spawning → O(1)
* Disposal → O(N tasks + N workers)
* Retry → scheduled O(1)

**Performance is not the primary goal — correctness and determinism are.**

---

## 14. Mental Model

> Authority governs → Scope gates → Task executes → Workers run → Handlers fire → Streams flow

Or more strictly:

```
Execution is gated.
What runs, runs exactly when allowed.
```

---

## Related Documents

* [execution-semantics.md](./execution-semantics.md) — Normative specification
* [technical.md](./technical.md) — API overview
* [implementation.md](./implementation.md) — Implementation architecture

---

# END
