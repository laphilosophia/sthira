# Sthira — Getting Started & Mental Model

> This document explains **how to think about Sthira**.
> It is not a tutorial of features.
> It is a guide for *correct usage*.

---

## 1. What Problem Sthira Solves

Modern applications fail not because computation is slow,
but because **execution happens at the wrong time**.

Sthira exists to answer one question:

> *Is this execution still allowed to matter?*

Everything else is secondary.

---

## 2. The Core Mental Shift

Do **not** think in terms of:

* requests
* responses
* state updates

Think in terms of:

* **executions**
* **lifecycles**
* **permission to proceed**

In Sthira:

* work is cheap
* correctness is expensive

---

## 3. The Three Core Concepts

### Authority — Who Decides

Authority is the global rule-maker.

It decides:

* how many things may run
* what happens when limits are hit
* when retries are allowed

Authority never does work.

---

### Scope — Where Execution Is Valid

Scope defines *context*.

Typical scopes:

* a page
* a route
* a feature
* a session

If the scope is gone,
**execution is no longer meaningful**.

---

### Task — What Is Executing

A task is a single execution attempt.

It:

* has exactly one identity (ref)
* may spawn workers
* may produce streams
* always terminates

Tasks never outlive their scopes.

---

## 4. Ref: Identity, Not Data

A ref is:

* immutable
* symbolic
* payload-free

A ref answers:

> *Which execution are we talking about?*

If a ref changes,
it is a **different execution**.

---

## 5. How Work Actually Runs

1. You declare *what should run*
2. Sthira checks *whether it may run*
3. Execution activates
4. Workers do work
5. Results may stream
6. Execution ends

No step is skipped.

---

## 6. Commit ≠ Result

Sthira uses internal commits.

This does **not** mean:

* data is accepted
* state has changed

It means:

> *Execution is now allowed to proceed.*

Results may come later.
Or never.

---

## 7. Failure Is Normal

In Sthira:

* failures are signals
* retries are explicit
* silence is forbidden

If something failed,
**you will know why**.

---

## 8. Cache Is Not Memory

Cache:

* stores data
* speeds things up

Cache never:

* decides correctness
* resurrects execution
* bypasses rules

Execution truth always comes from ref + task.

---

## 9. Streaming Is Honest

Streaming may:

* start
* slow down
* abort

This reflects reality.

If execution stops,
streams stop.

---

## 10. What You Control (and What You Don't)

You control:

* scopes
* execution intent
* policies

You do **not** control:

* worker lifecycles
* scheduling order
* retry mechanics

This is intentional.

---

## 11. Debugging with the Timeline

When something feels wrong:

Do not guess.

Open the DevTool timeline and ask:

* *What was running?*
* *What blocked it?*
* *Why did it stop?*

The timeline always answers.

---

## 12. When to Use Sthira

Use Sthira when:

* execution may outlive UI
* cancellation matters
* stale results are harmful

Do not use Sthira when:

* everything is synchronous
* correctness doesn't matter
* simple effects are enough

---

## Final Thought

Sthira does not make execution faster.

It makes execution **correct**.

> *Correctness first. Speed follows.*
