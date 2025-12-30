# Sthira – Scope & Capacity Definition

> This document defines where Sthira applies and what it guarantees.
> For normative execution semantics, see [execution-semantics.md](./execution-semantics.md).

---

## 1. Model Category (What it is)

Sthira is a **deterministic execution engine kernel**.

It governs:

* async work lifecycle
* cancellation and disposal
* execution coordination
* concurrency and retry policies
* scoped ownership of execution

It does **not** govern:

* domain logic
* business decisions
* UI behavior
* rendering
* data storage
* state management

This is a **task-level runtime**, not a UI-level mechanism or data engine.

---

## 2. Problem Class (Where it applies)

This runtime is appropriate when:

* async logic outlives UI components
* requests race each other
* stale execution must be prevented
* cancellation is mandatory
* lifecycle correctness is more important than DX
* deterministic disposal is required

Typical matching domains:

| Domain | Fit |
|--------|-----|
| Dashboards w/ long-running streaming + polling | Strong |
| Multi-step async workflows (forms, orchestrations) | Strong |
| Editor-like UIs where execution correctness matters | Strong |
| "Live" pages with background updates | Strong |
| SPA business apps with async complexity | Strong |
| Games / canvas loops | Weak |
| Pure SSR / no async retention | Out of scope |
| Static brochure websites | Out of scope |

---

## 3. System Capacity (What scale it is meant for)

Baseline expectations:

* 10–100 boundaries per application (not thousands)
* 1–10 concurrent tasks per active scope
* < 5,000 task executions per minute per client
* latency-insensitive → goal is correctness, not throughput

If an application requires:

* 10,000+ tasks/sec
* microsecond latency control
* frame-level reactivity

→ this runtime is not appropriate.

---

## 4. Computational Tier

This runtime is designed for:

* **frontend JS thread**
* optional **WebWorkers**
* embedded local execution

Not designed for:

* server execution
* distributed task orchestration
* full workflow engines (Temporal, Airflow class)

---

## 5. Guarantees (What it WILL guarantee)

| Guarantee | Description |
|-----------|-------------|
| No zombie async | All async work is aborted on scope dispose |
| Deterministic disposal | Tasks terminate exactly when commanded |
| FSM-gated execution | No execution bypass is allowed |
| Policy enforcement | timeout, retry, concurrency limits |
| AbortSignal propagation | Every task receives cancellation signal |
| Ref immutability | Execution identity never changes mid-task |

These are **hard constraints**.

---

## 6. Non-Guarantees (What it explicitly WILL NOT do)

| Not Guaranteed | Meaning |
|----------------|---------|
| State management | Sthira does not own or mutate data |
| Performance optimization | No batching/graph dependency optimization |
| Auto-reactivity | No automatic UI updates |
| Replay / time-travel | No Redux DevTools class debugging |
| Data correctness | Source validation is external responsibility |
| Network reliability | This is not a fetch wrapper |
| Business invariants | Must be implemented by caller |
| Scheduling fairness | No fairness guarantee |
| Throughput optimization | Correctness over speed |

---

## 7. Anti-Goals (What will NEVER be added)

The runtime will never aim to:

* Replace state managers (Zustand/Redux/etc.)
* Become a reactive signal library
* Become a data storage engine
* Provide ergonomic API sugar as its core value
* Perform automatic dirty checking
* Infer developer intent
* Resolve cross-scope data dependencies implicitly

Because all of these:
→ **remove developer control**
→ **push complexity into the runtime**
→ **violate explicit scope of execution**

---

## 8. Edge Case Scenarios (What breaks the model)

This runtime **fails or degrades** when:

* tasks require ordering guarantees at sub-ms level
* fan-out → fan-in → aggregation pipelines are needed
* multiple boundaries need shared mutable global state
* external tools bypass the execution kernel

Example failure:

```txt
Scope A runs task
External code runs parallel work without Sthira
Runtime unaware → determinism violated
```

Developer must route all execution through boundaries.

---

## 9. Responsibility Split (who does what)

| Layer | Responsibility | Never does |
|-------|----------------|------------|
| Authority | lifecycle, retry, abort, concurrency, worker provisioning | execute business logic, store data |
| Scope | execution namespace, FSM gating, ref resolution | fetch, compute, store data |
| Task | run code, spawn workers/handlers | determine correctness, own data |
| External libs | fetch data, domain logic, state management | manage execution lifecycle |

Clear split is mandatory for runtime correctness.

---

## 10. When Scope Should NOT Exist

Scope is unnecessary when:

* async work fails silently and correctness is irrelevant
* UI does not persist beyond async completion
* execution can be freely abandoned without harm
* developer discipline is sufficient

Example: small CRUD form → unnecessary overhead.

---

## 11. When Scope MUST Exist

Scope is required when:

* race conditions would corrupt execution
* routers unmount and async tasks must be aborted
* a feature requires deterministic cancellation
* multiple concurrent tasks must be sequenced or controlled
* zombie async effects are unacceptable

---

## 12. Related Documents

* [execution-semantics.md](./execution-semantics.md) — Normative specification
* [technical.md](./technical.md) — API overview
* [algorithm.md](./algorithm.md) — Execution flow
* [implementation.md](./implementation.md) — Implementation architecture

---

## Final Definition Sentence

> Sthira enforces deterministic execution.
> It exists where correctness matters more than convenience,
> and stops where throughput, data ownership, or business complexity demand other tools.
