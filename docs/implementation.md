# Sthira – Implementation Architecture Spec v0.3

> This document defines internal classes, storage, scheduler, and integration surfaces.
> For normative semantics, see [execution-semantics.md](./execution-semantics.md).

---

## 1. Runtime Layout

```
/runtime
  core/
    Authority.ts
    Scheduler.ts
    Registry.ts
  scope/
    Scope.ts
    ScopeFSM.ts
  task/
    Task.ts
    TaskTable.ts
    Worker.ts
    Handler.ts
    Stream.ts
  types/
    ids.ts
    fsm.ts
    execution.ts
    policy.ts
    errors.ts
  api/
    createAuthority.ts
    createScope.ts
    createTask.ts
/adapters
  react/
    useAuthority.ts
    useScope.ts
    useTask.ts
```

**Internal** = core/, scope/, task/
**Public Core** = api/ (framework-agnostic)
**Adapters** = adapters/ (framework-specific)

> [!IMPORTANT]
> No UI framework dependency enters the runtime.
> `use*` prefix is only used in adapter layer.

---

## 2. Central Type Definitions

### 2.1 IDs (`types/ids.ts`)

```ts
export type ScopeID = string
export type Ref = string  // Immutable execution symbol
export type RequestID = string
export type WorkerID = string
export type HandlerID = string
export type StreamID = string
```

### 2.2 FSM Types (`types/fsm.ts`)

```ts
export type FSMState =
  | "INIT"
  | "ATTACHED"
  | "RUNNING"
  | "SUSPENDED"
  | "DISPOSING"
  | "DISPOSED"

export type FSMEvent =
  | "mounted"
  | "taskStarted"
  | "suspend"
  | "resume"
  | "dispose"
```

### 2.3 Execution Types (`types/execution.ts`)

```ts
export type TaskStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted"

export type TaskOutcome =
  | "SUCCESS"
  | "ERROR"
  | "ABORTED"
  | "REJECTED"
  | "TIMEOUT"

export type ExecutionRequest = {
  id: RequestID
  scopeId: ScopeID
  timestamp: number
  priority?: number
}
```

### 2.4 Policy Types (`types/policy.ts`)

```ts
export type GlobalPolicy = {
  maxConcurrentTasks: number
  maxTaskSpawn: number
  timeout: number
  retry: number
}

export type ScopePolicy = {
  retry?: number
  timeout?: number
}
```

---

## 3. Data Structures

### 3.1 Authority Registry

```ts
class AuthorityRegistry {
  boundaries = new Map<ScopeID, Scope>()
  tasks = new Map<Ref, Task>()
}
```

### 3.2 Task Table

```ts
class TaskTable {
  active = new Map<Ref, Task>()

  register(task: Task) {
    this.active.set(task.ref, task)
  }

  unregister(ref: Ref) {
    this.active.delete(ref)
  }

  abortAll(scopeId: ScopeID) {
    for (const task of this.active.values()) {
      if (task.scopeId === scopeId) {
        task.abort()
      }
    }
  }

  getActiveCount(scopeId: ScopeID): number {
    let count = 0
    for (const task of this.active.values()) {
      if (task.scopeId === scopeId) count++
    }
    return count
  }
}
```

---

## 4. ScopeFSM

FSM is the **sole execution gate**.

```ts
import { FSMState, FSMEvent } from "./types/fsm"

class ScopeFSM {
  private _state: FSMState = "INIT"

  get state(): FSMState {
    return this._state
  }

  transition(event: FSMEvent): boolean {
    const prev = this._state

    switch (this._state) {
      case "INIT":
        if (event === "mounted") this._state = "ATTACHED"
        break

      case "ATTACHED":
        if (event === "taskStarted") this._state = "RUNNING"
        break

      case "RUNNING":
        if (event === "suspend") this._state = "SUSPENDED"
        if (event === "dispose") this._state = "DISPOSING"
        break

      case "SUSPENDED":
        if (event === "resume") this._state = "RUNNING"
        if (event === "dispose") this._state = "DISPOSING"
        break

      case "DISPOSING":
        this._state = "DISPOSED"
        break

      case "DISPOSED":
        // Terminal — no transitions
        break
    }

    return this._state !== prev
  }

  canExecute(): boolean {
    return this._state === "ATTACHED" || this._state === "RUNNING"
  }

  isAlive(): boolean {
    return this._state !== "DISPOSING" && this._state !== "DISPOSED"
  }
}
```

---

## 5. Task Class

Task owns workers, handlers, and streams.

```ts
class Task {
  readonly ref: Ref
  readonly scopeId: ScopeID
  readonly controller = new AbortController()
  readonly signal = this.controller.signal

  private _status: TaskStatus = "pending"
  private _error?: Error
  private _result?: any

  readonly workers = new Map<WorkerID, Worker>()
  readonly handlers = new Map<HandlerID, Handler>()
  readonly streams = new Map<StreamID, Stream>()

  constructor(ref: Ref, scopeId: ScopeID) {
    this.ref = ref
    this.scopeId = scopeId
  }

  get status(): TaskStatus {
    return this._status
  }

  get outcome(): TaskOutcome {
    switch (this._status) {
      case "success": return "SUCCESS"
      case "error": return "ERROR"
      case "aborted": return "ABORTED"
      default: return "REJECTED"
    }
  }

  async run(fn: TaskFunction): Promise<void> {
    if (this._status !== "pending") return

    this._status = "running"

    try {
      this._result = await fn({
        ref: this.ref,
        signal: this.signal,
        spawnWorker: (fn) => this.spawnWorker(fn),
        addHandler: (fn) => this.addHandler(fn),
        createStream: () => this.createStream()
      })
      if (!this.signal.aborted) {
        this._status = "success"
      }
    } catch (err) {
      if (this.signal.aborted) {
        this._status = "aborted"
      } else {
        this._status = "error"
        this._error = err as Error
      }
    }
  }

  abort(): void {
    if (this._status === "pending" || this._status === "running") {
      this.controller.abort()
      this._status = "aborted"
      this.terminateWorkers()
      this.cancelHandlers()
      this.abortStreams()
    }
  }

  spawnWorker(fn: WorkerFunction): Worker {
    const worker = new Worker(generateWorkerId(), this.ref, fn)
    this.workers.set(worker.id, worker)
    worker.start()
    return worker
  }

  addHandler(fn: HandlerFunction): Handler {
    const handler = new Handler(generateHandlerId(), this.ref, fn)
    this.handlers.set(handler.id, handler)
    return handler
  }

  createStream(): Stream {
    const stream = new Stream(generateStreamId(), this.ref)
    this.streams.set(stream.id, stream)
    return stream
  }

  private terminateWorkers(): void {
    for (const worker of this.workers.values()) {
      worker.terminate()
    }
    this.workers.clear()
  }

  private cancelHandlers(): void {
    for (const handler of this.handlers.values()) {
      handler.cancel()
    }
    this.handlers.clear()
  }

  private abortStreams(): void {
    for (const stream of this.streams.values()) {
      stream.abort()
    }
    this.streams.clear()
  }
}

type TaskFunction = (ctx: TaskContext) => Promise<any>

type TaskContext = {
  ref: Ref
  signal: AbortSignal
  spawnWorker: (fn: WorkerFunction) => Worker
  addHandler: (fn: HandlerFunction) => Handler
  createStream: () => Stream
}
```

---

## 6. Worker Class

```ts
type WorkerFunction = (signal: AbortSignal) => Promise<void>

class Worker {
  readonly id: WorkerID
  readonly taskRef: Ref
  private fn: WorkerFunction
  private controller = new AbortController()
  private _terminated = false

  constructor(id: WorkerID, taskRef: Ref, fn: WorkerFunction) {
    this.id = id
    this.taskRef = taskRef
    this.fn = fn
  }

  start(): void {
    if (this._terminated) return
    this.fn(this.controller.signal).catch(() => {
      // Worker errors are logged but don't crash task
    })
  }

  terminate(): void {
    this._terminated = true
    this.controller.abort()
  }
}
```

---

## 7. Handler Class

```ts
type HandlerFunction = () => Promise<void>

class Handler {
  readonly id: HandlerID
  readonly taskRef: Ref
  private fn: HandlerFunction
  private _cancelled = false
  private _executed = false

  constructor(id: HandlerID, taskRef: Ref, fn: HandlerFunction) {
    this.id = id
    this.taskRef = taskRef
    this.fn = fn
  }

  async execute(): Promise<void> {
    if (this._cancelled || this._executed) return
    this._executed = true
    await this.fn()
  }

  cancel(): void {
    this._cancelled = true
  }
}
```

---

## 8. Stream Class

```ts
class Stream {
  readonly id: StreamID
  readonly taskRef: Ref
  private _aborted = false
  private subscribers: Array<(value: any) => void> = []

  constructor(id: StreamID, taskRef: Ref) {
    this.id = id
    this.taskRef = taskRef
  }

  emit(value: any): void {
    if (this._aborted) return
    for (const sub of this.subscribers) {
      sub(value)
    }
  }

  subscribe(fn: (value: any) => void): () => void {
    this.subscribers.push(fn)
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn)
    }
  }

  abort(): void {
    this._aborted = true
    this.subscribers = []
  }
}
```

---

## 9. Scope Class

```ts
class Scope {
  readonly id: ScopeID
  readonly fsm = new ScopeFSM()
  readonly policies: ScopePolicy
  private authority: Authority

  constructor(id: ScopeID, authority: Authority, policies?: ScopePolicy) {
    this.id = id
    this.authority = authority
    this.policies = policies ?? {}
    this.fsm.transition("mounted")
  }

  dispose(): void {
    this.fsm.transition("dispose")
    this.authority.taskTable.abortAll(this.id)
    this.authority.unregisterScope(this.id)
  }
}
```

---

## 10. Scheduler

```ts
class Scheduler {
  private registry: AuthorityRegistry
  private policies: GlobalPolicy
  private scheduled = false

  constructor(registry: AuthorityRegistry, policies: GlobalPolicy) {
    this.registry = registry
    this.policies = policies
  }

  authorize(request: ExecutionRequest): boolean {
    const scope = this.registry.boundaries.get(request.scopeId)
    if (!scope) return false

    return (
      scope.fsm.isAlive() &&
      scope.fsm.canExecute() &&
      this.getActiveCount(request.scopeId) < this.policies.maxConcurrentTasks
    )
  }

  activate(request: ExecutionRequest, taskFn: TaskFunction): Task | null {
    if (!this.authorize(request)) {
      return null
    }

    const scope = this.registry.boundaries.get(request.scopeId)!
    const task = new Task(generateRef(), request.scopeId)

    this.registry.tasks.set(task.ref, task)

    if (scope.fsm.state === "ATTACHED") {
      scope.fsm.transition("taskStarted")
    }

    task.run(taskFn).finally(() => {
      this.registry.tasks.delete(task.ref)
    })

    return task
  }

  private getActiveCount(scopeId: ScopeID): number {
    let count = 0
    for (const task of this.registry.tasks.values()) {
      if (task.scopeId === scopeId) count++
    }
    return count
  }
}
```

---

## 11. Authority Class

```ts
class Authority {
  readonly registry = new AuthorityRegistry()
  readonly taskTable = new TaskTable()
  readonly scheduler: Scheduler
  readonly policies: GlobalPolicy

  constructor(opts: { name: string; policies: GlobalPolicy }) {
    this.policies = opts.policies
    this.scheduler = new Scheduler(this.registry, this.policies)
  }

  registerScope(scope: Scope): void {
    if (this.registry.boundaries.has(scope.id)) {
      const existing = this.registry.boundaries.get(scope.id)!
      existing.dispose()
    }
    this.registry.boundaries.set(scope.id, scope)
  }

  unregisterScope(scopeId: ScopeID): void {
    this.registry.boundaries.delete(scopeId)
  }

  runTask(scopeId: string, fn: TaskFunction): Task | null {
    const request: ExecutionRequest = {
      id: generateRequestId(),
      scopeId,
      timestamp: Date.now()
    }
    return this.scheduler.activate(request, fn)
  }
}
```

---

## 12. Public API (Framework-Agnostic)

```ts
// api/createAuthority.ts
let AuthorityInstance: Authority | null = null

export function createAuthority(opts: AuthorityOptions): Authority {
  AuthorityInstance = new Authority(opts)
  return AuthorityInstance
}

export function getAuthority(): Authority {
  if (!AuthorityInstance) {
    throw new Error("Authority not initialized")
  }
  return AuthorityInstance
}

// api/createScope.ts
export function createScope(config: { name: string; policies?: ScopePolicy }) {
  const authority = getAuthority()
  const scope = new Scope(config.name, authority, config.policies)
  authority.registerScope(scope)
  return {
    id: scope.id,
    dispose: () => scope.dispose()
  }
}

// api/createTask.ts
export function createTask(scopeKey: string) {
  return (fn: TaskFunction) => {
    const authority = getAuthority()
    return authority.runTask(scopeKey, fn)
  }
}
```

---

## 13. Error Types

```ts
export class ScopeScopeNotFoundError extends Error {
  constructor(scopeKey: string) {
    super(`Scope "${scopeKey}" not found`)
    this.name = "ScopeScopeNotFoundError"
  }
}

export class ScopeInactiveError extends Error {
  constructor(scopeKey: string) {
    super(`Scope "${scopeKey}" is disposed or inactive`)
    this.name = "ScopeInactiveError"
  }
}

export class ExecutionRejectedError extends Error {
  constructor(reason: string) {
    super(`Execution rejected: ${reason}`)
    this.name = "ExecutionRejectedError"
  }
}
```

---

## 14. Implementation Order

1. **Types** — ids, fsm, execution, policy, errors
2. **ScopeFSM** — state machine with guards
3. **Worker** — task-correlated execution unit
4. **Handler** — parallel execution method
5. **Stream** — output channel
6. **Task** — owns workers, handlers, streams
7. **TaskTable** — task registry
8. **Scope** — execution namespace
9. **Scheduler** — authorization + activation
10. **Authority** — global governor
11. **Public API** — createAuthority, createScope, createTask
12. **React Adapter** — useSyncExternalStore binding

---

## 15. Invariants

| Rule | Consequence if Violated |
|------|------------------------|
| Execution must go through FSM | Unauthorized execution |
| Task must own its workers | Resource leaks |
| Dispose must abort all tasks | Zombie execution |
| Ref must be immutable | Identity confusion |
| Workers must terminate on task abort | Zombie workers |
| Streams must abort on task abort | Orphan streams |

---

## 16. Mental Model

```
createAuthority() → global execution governor
createScope()  → execution namespace
createTask()    → task that may spawn workers/handlers/streams

What runs, runs exactly when allowed.
```

---

## Related Documents

* [execution-semantics.md](./execution-semantics.md) — Normative specification
* [technical.md](./technical.md) — API overview
* [algorithm.md](./algorithm.md) — Execution flow

---

# END v0.3
