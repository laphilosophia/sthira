# Sthira Cache & Ref Binding Semantics

> Canonical definition of cache behavior, ref binding, TTL, invalidation, and reuse rules.
> This document extends `execution-semantics.md`, `scheduler-and-priority.md`, and `worker-lifecycle.md`.
> It is **normative**.

---

## 1. Purpose

This document defines **how cache participates in execution without owning execution**.

Cache exists to:

* reduce redundant computation
* stabilize large data handling
* decouple payload from execution lifecycle

Cache must never:

* bypass execution semantics
* override task determinism
* outlive ref validity logically

---

## 2. Cache Ontology

Cache is a **data container**, not an execution unit.

Properties:

* Cache does not execute
* Cache does not schedule
* Cache does not commit
* Cache does not mutate state

Cache MAY store:

* worker outputs
* streamed chunks
* normalized artifacts

Cache NEVER stores:

* execution authority
* lifecycle decisions
* ref mutability

---

## 3. Ref–Cache Relationship

A cache entry MAY be associated with a ref.

Rules:

* Ref is immutable
* Ref is the only valid execution identifier
* Cache entries MAY reference a ref symbol

Important:

> Ref binding does **not** imply cache ownership.

Cache entries may exist beyond task disposal,
but become **logically unreachable**.

---

## 4. Cache Key Model

Cache keys are derived as:

```
CacheKey = (Ref, CacheNamespace, CacheRole)
```

Where:

* Ref identifies execution
* CacheNamespace isolates domains
* CacheRole defines artifact type

No cache entry is valid without an explicit Ref.

---

## 5. Cache Creation

Cache entries MAY be created:

* during worker execution
* during streaming
* during handler output

Rules:

* Cache creation is allowed only after execution activation
* Cache creation before RUNNING is forbidden

---

## 6. Cache Validity

Cache validity is defined by **execution truth**, not time.

Validity conditions:

* Associated task must have reached execution activation
* Ref must not be superseded
* Cache role must match handler intent

Cache validity does NOT imply:

* freshness
* completeness
* materialization

---

## 7. TTL Semantics

TTL is optional and advisory.

Rules:

* TTL expiration does not mutate execution
* TTL expiration does not trigger disposal
* TTL expiration MAY mark cache as stale

Stale cache:

* MAY be reused
* MAY trigger revalidation
* MUST be observable

---

## 8. Invalidation

Invalidation is **explicit**.

Sources:

* task logic
* handler logic
* external signal

Rules:

* Invalidation does not kill tasks
* Invalidation marks cache as unusable
* Invalidation MAY trigger new task scheduling

Invalidation never mutates refs.

---

## 9. Cache Reuse Rules

Cache reuse is conservative.

Allowed:

* reuse within the same ref
* reuse within the same task

Forbidden:

* reuse across refs
* reuse across tasks
* reuse after respawn

Retry always creates a new ref.
Cache from previous refs is invalid for execution.

---

## 10. Streaming Interaction

Cache MAY buffer streamed output.

Rules:

* Streamed cache is append-only
* Worker termination closes stream
* Cache may contain partial data

Partial cache:

* is never auto-completed
* is never auto-promoted

---

## 11. Failure Interaction

If a task fails:

* cache entries MAY exist
* cache entries are marked invalid

Invalid cache:

* is observable
* is not reused

Failure never retroactively validates cache.

---

## 12. Observability

DevTools MUST expose:

* cache creation
* cache invalidation
* cache reuse decision
* cache staleness

Cache visibility is read-only.

---

## 13. Explicit Non-Goals

Cache does not provide:

* automatic cross-task reuse
* speculative execution reuse
* transparent recovery
* implicit ref merging

These are explicitly forbidden.

---

## Final Statement

Cache accelerates execution.
Ref defines truth.

> Data may persist.
> Execution never lies.
