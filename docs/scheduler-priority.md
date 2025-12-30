# Sthira Scheduler & Priority Semantics

> Canonical definition of scheduling, priority, starvation, and drop behavior.
> This document extends `execution-semantics.md` and must not contradict it.

---

## 1. Purpose

The Scheduler is responsible for **when** execution happens, not **how fast** it happens.

Its goals are:

* determinism
* visibility
* bounded complexity

The Scheduler does **not** attempt to:

* maximize throughput
* ensure fairness
* rebalance slow handlers

---

## 2. Scheduling Scope

Scheduling operates at **task level only**.

Explicitly out of scope:

* handler-level scheduling
* worker-level fairness
* stream-level backpressure optimization

A task is the smallest schedulable unit.

---

## 3. Priority Model

Each task has exactly one priority.

```
Priority: HIGH | NORMAL | LOW
```

Properties:

* Priority is assigned at task creation
* Priority is immutable for task lifetime
* Priority influences **start order**, not execution speed

Higher priority tasks:

* are activated earlier
* may preempt lower-priority *pending* tasks
* never preempt running tasks

---

## 4. Scheduler Queues

The Scheduler maintains three internal queues:

```
Q_HIGH
Q_NORMAL
Q_LOW
```

Rules:

* Tasks enter exactly one queue
* Queues are FIFO
* No task migration between queues

---

## 5. Activation Algorithm

Pseudo-logic:

```
while execution_slots_available:
    if Q_HIGH not empty:
        activate(Q_HIGH.dequeue())
    else if Q_NORMAL not empty:
        activate(Q_NORMAL.dequeue())
    else if Q_LOW not empty:
        activate(Q_LOW.dequeue())
    else:
        break
```

Activation means:

* FSM transition to RUNNING
* execution reservation
* worker spawn permission

---

## 6. Concurrency Limits

Concurrency limits are enforced by Authority policies:

```
maxConcurrentTasks
```

Rules:

* Limit applies globally or per-scope
* Scheduler never exceeds this limit
* Excess tasks remain queued

---

## 7. Starvation Semantics

Starvation is **observable and intentional**.

Definition:

* A task is starved if it remains queued while higher-priority tasks continue executing

Behavior:

* No automatic reprioritization
* No fairness correction
* No aging algorithm

Starvation results in:

* delayed execution
* visible queue state in DevTools

---

## 8. Drop Policy

A task may be dropped if:

* queue size exceeds policy limit
* task exceeds max wait time
* explicit cancellation is issued

Drop behavior:

* Task transitions directly to DISPOSED
* Associated ref is invalidated
* Error is surfaced

No silent drops are allowed.

---

## 9. Retry Interaction

Retry creates a **new task**.

Rules:

* New task re-enters scheduler queues
* Priority is inherited from original task
* Previous task state is not reused

---

## 10. Visibility & Diagnostics

Scheduler exposes read-only signals:

* queue lengths
* task wait time
* starvation duration
* drop events

DevTools MUST display:

* why a task is waiting
* which queue it belongs to
* what higher-priority tasks block it

---

## 11. Failure Philosophy

If execution slows down:

* it is because user-provided code is slow

If starvation occurs:

* it is a policy decision

The Scheduler is honest, not adaptive.

---

## Final Statement

The Scheduler enforces order, not fairness.

> Tasks do not compete for time.
> They wait for permission.
