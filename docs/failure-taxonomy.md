# Sthira Failure Taxonomy

> Canonical classification of failures, errors, and abnormal terminations.
> This document defines **what can fail**, **how it is reported**, and **what it means**.
> It extends all prior canonical documents and is **normative**.

---

## 1. Purpose

Sthira treats failure as a **first-class signal**, not an exception to be hidden.

This document exists to:

* prevent ambiguity around failures
* distinguish normal vs. abnormal outcomes
* define retry and observability behavior

Failures are expected.
Silence is forbidden.

---

## 2. Failure Classification Overview

All failures fall into exactly one category:

1. **Execution Failures**
2. **Worker Failures**
3. **Handler Failures**
4. **Scheduling Failures**
5. **Lifecycle Failures**
6. **Policy Failures**
7. **Developer Errors**

No failure may belong to multiple categories.

---

## 3. Execution Failures

Execution failures occur when a task cannot complete execution.

Examples:

* uncaught exception in task
* rejected promise
* explicit task abort

Semantics:

* task transitions to FAILED
* execution halts
* retry MAY occur (policy-driven)

Execution failure is a **normal outcome**.

---

## 4. Worker Failures

Worker failures originate inside workers.

Examples:

* worker crash
* timeout
* explicit termination

Semantics:

* worker terminates
* task is marked FAILED
* streams are aborted

Worker failure is a **hard signal**, not recoverable in-place.

---

## 5. Handler Failures

Handler failures occur during handler execution.

Examples:

* thrown error
* validation failure
* invariant violation

Semantics:

* handler failure propagates to task failure
* no partial success promotion

Handler failure is **deterministic**.

---

## 6. Scheduling Failures

Scheduling failures occur before execution activation.

Examples:

* queue overflow
* starvation timeout
* priority preemption

Semantics:

* task is dropped
* ref is invalidated
* error is surfaced

Scheduling failure is **intentional and observable**.

---

## 7. Lifecycle Failures

Lifecycle failures occur when execution violates lifecycle rules.

Examples:

* execution after DISPOSED
* mutation attempt in SUSPENDED
* worker spawn after disposal

Semantics:

* execution is denied
* error is surfaced

Lifecycle failure indicates **invalid timing**.

---

## 8. Policy Failures

Policy failures occur when authority policies deny execution.

Examples:

* retry limit exceeded
* timeout exceeded
* concurrency limit reached

Semantics:

* execution denied or terminated
* failure reason is explicit

Policy failure is **expected behavior**.

---

## 9. Developer Errors

Developer errors are violations of Sthira contracts.

Examples:

* mutating outside scope
* reusing ref across tasks
* bypassing execution APIs

Semantics:

* immediate error
* execution halted
* no retry

Developer errors are **fatal** and must be fixed.

---

## 10. Retry Matrix

| Failure Type       | Retry Allowed | Retry Scope |
| ------------------ | ------------- | ----------- |
| Execution Failure  | Yes           | New Task    |
| Worker Failure     | Yes           | New Task    |
| Handler Failure    | Yes           | New Task    |
| Scheduling Failure | No            | —           |
| Lifecycle Failure  | No            | —           |
| Policy Failure     | Conditional   | New Task    |
| Developer Error    | No            | —           |

---

## 11. Observability Requirements

DevTools MUST expose:

* failure category
* failure source
* failure timestamp
* retry decision

No failure may be hidden or downgraded.

---

## 12. Error Philosophy

Sthira does not distinguish between:

* "expected" errors
* "unexpected" errors

It distinguishes between:

* **recoverable** failures
* **non-recoverable** failures

Recoverability is policy-driven.

---

## Final Statement

Failure is information.

> If something breaks, the system must say **what broke**, **why**, and **what happened next**.
