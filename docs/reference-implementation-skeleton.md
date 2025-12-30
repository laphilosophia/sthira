# Sthira Reference Implementation Skeleton

> This document defines a **reference-grade implementation layout**.
> It is not optimized code. It is a **structural contract**.
> Any implementation claiming Sthira-compatibility must map to this skeleton.

---

## 1. Goals

* Provide a concrete, auditable structure
* Encode semantic boundaries in folders and types
* Prevent accidental capability leakage

Non-goals:

* performance optimization
* framework integration
* production hardening

---

## 2. Top-Level Layout

```
/src
  /authority
  /scope
  /task
  /worker
  /cache
  /scheduler
  /failure
  /ref
  /api
  /devtools
  /types
```

Each directory represents a **semantic scope**, not convenience grouping.

---

## 3. Authority Layer

```
/authority
  Authority.ts
  AuthorityConfig.ts
  PolicyRegistry.ts
```

Responsibilities:

* global policy enforcement
* concurrency limits
* retry decisions
* worker provisioning authority

Forbidden:

* direct execution
* state mutation

---

## 4. Scope Layer

```
/scope
  Scope.ts
  ScopeState.ts
  ScopeFSM.ts
```

Responsibilities:

* execution eligibility
* lifecycle gating
* ref namespace

ScopeFSM is authoritative.

---

## 5. Task Layer

```
/task
  Task.ts
  TaskState.ts
  TaskRegistry.ts
```

Responsibilities:

* task identity
* lifecycle state
* worker ownership

Task is the smallest execution unit.

---

## 6. Ref Layer

```
/ref
  Ref.ts
  RefFactory.ts
```

Responsibilities:

* immutable execution symbol
* uniqueness guarantees

Ref contains no data.

---

## 7. Worker Layer

```
/worker
  Worker.ts
  WorkerHandle.ts
  WorkerManager.ts
```

Responsibilities:

* task-correlated execution
* failure signaling
* stream emission

Workers never outlive tasks.

---

## 8. Scheduler Layer

```
/scheduler
  Scheduler.ts
  Queue.ts
```

Responsibilities:

* task activation order
* priority queues
* starvation visibility

Scheduler never executes work.

---

## 9. Cache Layer

```
/cache
  CacheEntry.ts
  CacheStore.ts
  CachePolicy.ts
```

Responsibilities:

* payload storage
* TTL tracking
* invalidation marking

Cache never influences execution decisions.

---

## 10. Failure Layer

```
/failure
  Failure.ts
  FailureTypes.ts
```

Responsibilities:

* failure classification
* propagation metadata

Failures are data, not control flow.

---

## 11. API Layer

```
/api
  createAuthority.ts
  createScope.ts
  defineTask.ts
```

Responsibilities:

* expose safe entry points
* hide internals

API must not leak internal objects.

---

## 12. DevTools Layer

```
/devtools
  TimelineModel.ts
  EventBus.ts
```

Responsibilities:

* read-only observability
* execution timeline

DevTools never mutate runtime.

---

## 13. Types Layer

```
/types
  enums.ts
  interfaces.ts
```

Responsibilities:

* shared contracts
* semantic enums

---

## 14. Dependency Rules (Strict)

Allowed:

* API → Authority / Scope
* Scope → Task / Ref / Scheduler
* Task → Worker / Cache / Failure

Forbidden:

* Worker → Scheduler
* Cache → Task
* DevTools → Authority

These rules are mandatory.

---

## 15. Minimal Boot Flow

```
createAuthority()
  → createScope()
    → defineTask()
      → scheduler activates task
        → worker executes
          → cache stores output
```

---

## Final Statement

This skeleton encodes **correctness by structure**.

> If the folders blur, the semantics will too.
