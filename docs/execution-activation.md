# Sthira – Execution Activation Model

> Formerly "Mutation Authorization Model"
> This document defines the execution activation pipeline.
> For normative semantics, see [execution-semantics.md](./execution-semantics.md).

---

## 1. Purpose

This model defines:

* Task → Scope → Execution activation flow
* Deterministic execution gating
* Policy-driven authorization
* Lifecycle-controlled activation

**Execution is not automatic — it is earned.**

The right to execute is granted only when:
* policy allows
* FSM permits
* resources are available

---

## 2. Terminology

| Term | Meaning |
|------|---------|
| Task | async/sync execution unit |
| Ref | immutable execution symbol |
| Commit | execution activation (NOT data mutation) |
| Reject | denial of execution |
| Abort | forced termination |
| Scope FSM | execution gate (state machine) |
| Authority Policy | retry, timeout, concurrency rules |

---

## 3. Execution Request Format

An execution request is represented internally as:

```ts
type ExecutionRequest = {
  id: RequestID
  scopeId: ScopeID
  timestamp: number
  priority?: number
}
```

When a task is invoked:

```ts
createTask("insights")(async ({ ref, signal }) => {
  // execution body
})
```

Request flow:

```
(task call)
   ↓
create ExecutionRequest
   ↓
submit to Authority
```

Request **does not execute immediately**.

---

## 4. Authorization Pipeline

Execution is authorized through this pipeline:

```
FOR EACH request:
  IF NOT authorized(request):
    reject(request)
    CONTINUE
  activate(request)  // commit
END
```

This is the core of the model:
→ **Request is not execution. Commit is.**

---

## 5. Authorization Logic (Exact Rules)

A request is authorized **only if** all conditions are TRUE:

| Rule | Condition |
|------|-----------|
| Scope exists | scope != null |
| Scope alive | FSM state != DISPOSING / DISPOSED |
| FSM allows | FSM.canExecute() == true |
| Concurrency ok | activeTasks < maxConcurrentTasks |
| Not suspended | FSM state != SUSPENDED |
| Policy allows | timeout/retry window satisfied |

Pseudo-code:

```ts
function authorized(request: ExecutionRequest): boolean {
  const scope = registry.get(request.scopeId)

  return (
    scope != null &&
    scope.fsm.isAlive() &&
    scope.fsm.canExecute() &&
    activeTasks(scope) < policy.maxConcurrentTasks &&
    policyAllows(request)
  )
}
```

---

## 6. Rejection Logic

Rejection means the request is **denied** and never executed.

When rejected:

* log (dev only)
* optional: fire `onRequestRejected(request)` event
* does NOT throw to developer (unless configured)

Rejection reasons:

* Scope not found
* FSM in DISPOSED state
* Concurrency limit exceeded
* Policy timeout
* Manual suspension

Rejection = expected normal path in load scenarios.

---

## 7. Execution Activation (Commit)

When a request is authorized:

```ts
function activate(request: ExecutionRequest): Task {
  const task = new Task(generateRef(), request.scopeId)

  // Reserve execution slot
  taskTable.register(task)

  // Transition FSM if needed
  if (scope.fsm.state === "ATTACHED") {
    scope.fsm.transition("taskStarted")
  }

  // Permission to spawn workers
  task.status = "RUNNING"

  // Schedule execution
  scheduler.execute(task)

  return task
}
```

**Commit means:**

* execution slot reserved
* worker spawning permitted
* handler initialization permitted
* AbortSignal linked

**Commit does NOT mean:**

* data accepted
* state mutated
* results materialized

---

## 8. Worker & Handler Activation

After commit, workers and handlers can be spawned:

```ts
// Worker spawning
task.spawnWorker(workerFn)

// Handler registration
task.addHandler(handlerFn)
```

Activation rules:

* Only after task commit
* Bound strictly to task ref
* Terminated on task disposal

---

## 9. Retry Interaction

Retry creates a **new task** with a **new ref**.

```
if taskOutcome == ERROR && policy.retry > 0:
    oldTask.dispose()     // abort, terminate workers
    newTask = activate()  // new ref, new execution
```

Retry **does not resurrect** the old task.
Old ref is invalidated.

---

## 10. FSM Gating Semantics

**FSM is the sole execution gate.**

```
if FSM.canExecute() == false:
   reject ALL requests
```

FSM gating by state:

| State | canExecute() | Behavior |
|-------|--------------|----------|
| INIT | false | Not yet attached |
| ATTACHED | true | Ready for first task |
| RUNNING | true | Execution active |
| SUSPENDED | false | Paused, no execution |
| DISPOSING | false | Shutdown, reject all |
| DISPOSED | false | Terminal, reject all |

---

## 11. Disposal Impact

On disposal:

```
scope.dispose():
  FSM → DISPOSING

  for each task in scope:
    task.abort()           // AbortSignal triggered
    task.terminateWorkers()
    task.cancelHandlers()
    task.abortStreams()

  FSM → DISPOSED
```

After disposal:

* No new requests accepted
* No existing tasks continue
* All resources released

---

## 12. Performance Notes

* Request queuing: O(1)
* Authorization check: O(1)
* Activation: O(1)
* Disposal: O(N tasks + N workers)

**Correctness and determinism take precedence over throughput.**

---

## 13. Developer Mental Model

Remember this:

> Task requests — Authority authorizes — Scope gates — Execution activates

Or more simply:

```
Request is proposal.
Commit is activation.
Execution is earned.
```

---

## 14. Minimal Execution Example

```ts
// Create authority
createAuthority({ maxConcurrentTasks: 3 })

// Create scope
createScope({ name: "insights" })

// Request execution
createTask("insights")(async ({ ref, signal }) => {
  console.log("Executing with ref:", ref)
  await doWork({ signal })
})

// Flow:
// Request → Authorization → Commit → Execute → Complete
```

Disposal example:

```ts
scope.dispose()

// FSM → DISPOSING
// All tasks aborted
// All workers terminated
// FSM → DISPOSED
```

---

## 15. Invariants (Must Never Be Violated)

| Rule | Consequence if Violated |
|------|------------------------|
| Request must go through authorization | Unauthorized execution |
| FSM is the only valid execution gate | Zombie tasks |
| Dispose must abort all active tasks | Resource leaks |
| Ref must be immutable | Identity confusion |
| Workers must terminate on disposal | Zombie workers |

Violation results in:

* non-deterministic execution
* resource leaks
* undefined behavior

---

## Related Documents

* [execution-semantics.md](./execution-semantics.md) — Normative specification
* [algorithm.md](./algorithm.md) — Execution flow details
* [implementation.md](./implementation.md) — Implementation architecture

---

# END
