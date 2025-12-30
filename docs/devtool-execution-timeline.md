# Sthira DevTool Execution Timeline Specification

> Canonical specification for execution visualization, timelines, and diagnostics.
> This document defines **what is observable**, **how it is ordered**, and **what it means**.
> It is strictly read-only and extends all prior canonical documents.

---

## 1. Purpose

The DevTool exists to make execution **legible**, not controllable.

Goals:

* explain *why* something happened
* expose ordering and causality
* surface slowdowns, starvation, and drops

Non-goals:

* execution control
* mutation
* debugging by side-effects

---

## 2. Observation Model

DevTool observes a **unified event stream** emitted by the runtime.

Properties:

* append-only
* strictly ordered per task
* causally ordered across tasks when possible

Events are immutable once recorded.

---

## 3. Timeline Axes

The timeline is multi-dimensional:

* **Time axis**: wall-clock time
* **Execution axis**: Authority → Scope → Task → Worker
* **Causality axis**: parent/child relations

The UI may project these axes differently, but semantics are fixed.

---

## 4. Core Event Types

### 4.1 Authority Events

* `AUTHORITY_INIT`
* `POLICY_APPLIED`
* `CONCURRENCY_LIMIT_REACHED`

---

### 4.2 Scope Events

* `SCOPE_CREATED`
* `SCOPE_ATTACHED`
* `SCOPE_SUSPENDED`
* `SCOPE_DISPOSING`
* `SCOPE_DISPOSED`

---

### 4.3 Task Events

* `TASK_DECLARED`
* `TASK_QUEUED`
* `TASK_ACTIVATED`
* `TASK_RUNNING`
* `TASK_FAILED`
* `TASK_DROPPED`
* `TASK_DISPOSING`
* `TASK_DISPOSED`

---

### 4.4 Worker Events

* `WORKER_SPAWNED`
* `WORKER_STARTED`
* `WORKER_FAILED`
* `WORKER_TERMINATED`

---

### 4.5 Handler Events

* `HANDLER_SCHEDULED`
* `HANDLER_STARTED`
* `HANDLER_COMPLETED`
* `HANDLER_FAILED`

---

### 4.6 Cache Events

* `CACHE_CREATED`
* `CACHE_STALE`
* `CACHE_INVALIDATED`
* `CACHE_REUSED`

---

### 4.7 Stream Events

* `STREAM_OPENED`
* `STREAM_CHUNK_EMITTED`
* `STREAM_ABORTED`
* `STREAM_CLOSED`

---

### 4.8 Failure Events

* `FAILURE_RECORDED`

Each failure event references the **Failure Taxonomy**.

---

## 5. Event Payload Schema

Each event MUST include:

```ts
{
  timestamp: number,
  eventType: string,
  authorityId?: string,
  scopeId?: string,
  taskRef?: Ref,
  workerId?: string,
  handlerId?: string,
  details?: Record<string, any>
}
```

Payloads are descriptive, never executable.

---

## 6. Ordering Guarantees

Guarantees:

* Per-task events are totally ordered
* Worker events are ordered within a task
* Handler events are ordered per handler

Non-guarantees:

* Global total ordering across all tasks
* Clock synchronization across workers

---

## 7. Causality Rules

Causality edges MUST be emitted for:

* task → worker spawn
* task → handler scheduling
* handler → cache creation
* worker → stream emission

DevTool MUST visualize causality explicitly.

---

## 8. Timeline Views (Recommended)

The following projections are recommended:

1. **Swimlane View**

   * lanes: Authority / Scope / Task / Worker

2. **DAG View**

   * nodes: handlers
   * edges: causality

3. **Queue View**

   * priority queues
   * wait times

4. **Stream View**

   * chunk cadence
   * abort points

---

## 9. Starvation & Drop Visualization

The DevTool MUST surface:

* how long a task waited
* which tasks blocked it
* why it was dropped

Starvation is a state, not an error.

---

## 10. Failure Visualization

Failures MUST show:

* category
* source
* propagation path
* retry decision

No failure may appear without context.

---

## 11. Privacy & Safety

DevTool MUST NOT:

* expose payload data
* expose secrets
* allow event mutation

---

## Final Statement

The DevTool tells the truth.

> If execution was slow, the timeline will show where time went.
> If execution failed, the timeline will show why.
