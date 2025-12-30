# Sthira Worker Lifecycle & Respawn Semantics

> Canonical definition of worker behavior, failure, respawn, and interaction with execution.
> This document extends `execution-semantics.md` and `scheduler-and-priority.md`.
> It is **normative**.

---

## 1. Purpose

Workers execute computation on behalf of a task.
This document defines **when workers exist**, **how they fail**, and **what happens next**.

Design goals:

* determinism
* explicit failure
* bounded complexity
* zero hidden recovery

Non-goals:

* throughput optimization
* cross-task worker reuse
* transparent fault masking

---

## 2. Worker Definition

A **Worker** is an execution unit that:

* is **strictly correlated** to a single task
* exists only within the lifetime of that task
* never spans multiple tasks

Workers are **execution-scoped**, not pooled globally.

---

## 3. Worker Creation

Workers MAY be created only after **execution activation**.

Creation triggers:

* task enters RUNNING state
* a handler explicitly requires worker execution

Rules:

* No worker is created in INIT or ATTACHED
* Worker creation is forbidden in SUSPENDED

---

## 4. Worker Ownership

Ownership rules:

* Task owns all its workers
* Authority provisions workers
* Scope gates worker permission

If task ownership ends, workers must terminate.

---

## 5. Worker Execution Model

* A task may own one or more workers
* Workers may execute in parallel
* Workers may emit output (e.g., streams)

Workers do **not**:

* mutate state directly
* commit results
* manage cache validity

Workers execute **instructions**, not decisions.

---

## 6. Worker Failure

A worker failure is a **hard signal**.

Failure sources include:

* uncaught exception
* crash
* explicit abort
* timeout

On failure:

* worker terminates
* failure propagates to the owning task

No worker failure is silently ignored.

---

## 7. Failure Propagation

Propagation rules:

* Any worker failure marks the task as FAILED
* Task failure is observable
* Task failure blocks further execution

Partial worker success has no special meaning.

---

## 8. Respawn Semantics

Respawn is **policy-driven** and **explicit**.

Rules:

* Respawn creates a **new task**
* New task receives a **new ref**
* No worker is respawned in-place

The previous task:

* transitions to DISPOSED
* retains its failure record

Respawn never reuses execution state.

---

## 9. Retry Interaction

Retry is implemented as respawn.

Behavior:

* Retry schedules a new task
* Priority is inherited
* Previous workers are not reused

Retries do not revive previous workers.

---

## 10. Streaming Interaction

Workers may emit streams.

Rules:

* Streams begin only after execution activation
* Worker failure aborts streams
* Task disposal triggers graceful shutdown

No stream continues after worker termination.

---

## 11. Disposal Semantics

When a task enters DISPOSING:

* all workers receive termination signal
* all streams are closed gracefully
* no new workers may be spawned

DISPOSED is terminal.

---

## 12. Observability

DevTools MUST expose:

* worker creation time
* worker termination reason
* worker-task correlation
* respawn events

Observability is read-only.

---

## 13. Cache Interaction (Explicitly Deferred)

Workers MAY produce output that is externally cached.

However:

* cache validity
* reuse rules
* TTL semantics

are **undefined at this layer** and specified separately.

---

## Final Statement

Workers execute.
Tasks decide.
Authority permits.

> If a worker dies, execution truth changes — and the system reacts openly.
