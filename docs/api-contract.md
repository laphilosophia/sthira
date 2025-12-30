# Sthira Public API Contract

> Canonical definition of the **developer-facing API surface**.
> Parent document: [architecture-foundation.md](./architecture-foundation.md)
>
> This document specifies what developers can access, what they can configure, and what is intentionally hidden.

---

## 1. Design Principles

The Sthira API follows three core principles:

1. **Minimal surface** — expose only what is required
2. **Explicit control** — no implicit behavior
3. **Unbypassable semantics** — internal guarantees cannot be overridden

The API is declarative.
Execution details are never directly controlled by user code.

---

## 2. API Layers

The public API is divided into three layers:

1. Authority API (global configuration)
2. Scope API (execution scope)
3. Task API (execution definition)

No other layers are exposed.

---

## 3. Authority API

### 3.1 createAuthority

```ts
createAuthority(config: AuthorityConfig): Authority
```

**Purpose**
Initializes the global execution authority.

**Configurable:**

* global concurrency limits
* retry policies
* priority policies
* worker provisioning

**Forbidden:**

* runtime mutation after initialization
* direct task control

Authority is singleton per runtime.

---

## 4. Scope API

### 4.1 createScope

```ts
createScope(config: ScopeConfig): Scope
```

**Purpose**
Defines an execution namespace.

**Configurable:**

* scope identity
* cache policies
* execution eligibility rules

**Exposed (read-only):**

* scope state
* lifecycle state

**Forbidden:**

* direct worker control
* task override

Scope is the only execution gate.

---

## 5. Task API

### 5.1 defineTask

```ts
defineTask(fn: TaskDefinition): Task
```

**Purpose**
Declares an execution behavior.

Task definition MAY:

* reference external data
* request execution
* request invalidation

Task definition MUST NOT:

* mutate execution state directly
* manage workers
* bypass scheduling

---

## 6. Task Invocation

```ts
scope.run(task, options?): TaskHandle
```

**Options:**

* priority
* execution hints

**Returns:**

* TaskHandle (read-only)

---

## 7. TaskHandle API

```ts
interface TaskHandle {
  readonly ref: Ref
  readonly state: TaskState
  readonly failure?: Failure
}
```

TaskHandle is **observational only**.

Forbidden:

* cancelling other tasks
* mutating execution

---

## 8. Configuration vs Control

| Capability         | Allowed |
| ------------------ | ------- |
| Configure policies | Yes     |
| Observe execution  | Yes     |
| Override execution | No      |
| Inject workers     | No      |
| Mutate refs        | No      |

---

## 9. Error Surface

All errors returned through the API:

* are typed
* map to Failure Taxonomy
* are never thrown implicitly

---

## 10. Power User Mode

Power users MAY enable:

* extended observability
* debug tracing
* execution diagnostics

Power users MUST NOT:

* alter execution semantics
* bypass FSM

---

## 11. Explicit Non-Goals

The API does not provide:

* convenience abstractions
* automatic retries
* hidden caching
* magic defaults

---

## 12. Task Execution API

Tasks provide two execution paths:

### effect() — Light Path

```typescript
ctx.effect(() => computed.value)
```

- Direct execution on main thread
- No worker, no streaming overhead
- For trivial operations, computed values, signals

### run() — Heavy Path

```typescript
ctx.run(async () => processData())
ctx.run(fn, { deferred: true, streaming: true })
```

- Executes in worker pool
- Internal streaming and buffering
- For heavy computation, large data

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `deferred` | false | Run in idle time |
| `streaming` | false | Enable incremental output |

### Worker Configuration

At **Authority** level (global):
```typescript
createAuthority({
  engine: {
    defaultWorkers: 1,
    maxWorkers: 4
  }
})
```

At **Scope** level (override):
```typescript
createScope({
  engine: { workers: 4 }
})
```

See [engine-semantics.md](./engine-semantics.md) for details.

---

## Final Statement

The Sthira API exposes **intent**, not **mechanism**.

> Developers describe *what should happen*.
> Sthira decides *when it is allowed to happen*.
