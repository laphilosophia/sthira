# Sthira Implementation Roadmap

> Docs-aligned, phase-by-phase implementation plan.
> Each item references its governing specification.

---

## Overview

```
Phase 0: Project Setup
Phase 1: Foundation (Types + FSM)
Phase 2: Execution Units (Worker, Handler, Stream)
Phase 3: Task System
Phase 4: Scope System
Phase 5: Scheduler
Phase 6: Authority
Phase 7: Public API
Phase 8: React Adapter
Phase 9: DevTools
Phase 10: Release Prep
```

**Total Estimated Duration**: 6-8 weeks (solo developer)

---

## Phase 0: Project Setup
**Duration**: 1-2 days

### 0.1 Repository Structure
```
/packages
  /core           # Main runtime
  /react          # React adapter
  /devtools       # DevTools (future)
/docs             # ✅ Already complete
/examples         # Usage examples
```

### 0.2 Tooling Setup
- [ ] pnpm workspace configuration
- [ ] TypeScript strict mode (`tsconfig.json`)
- [ ] Vitest configuration
- [ ] ESLint + Prettier
- [ ] Commitlint
- [ ] GitHub Actions CI

### 0.3 Package.json Structure
```json
{
  "name": "@sthira/core",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  }
}
```

**Spec Reference**: `DEVELOPMENT.md`

---

## Phase 1: Foundation
**Duration**: 3-4 days

### 1.1 Type Definitions
**File**: `packages/core/src/types/`

| File | Contents | Spec |
|------|----------|------|
| `ids.ts` | ScopeID, Ref, RequestID, WorkerID, HandlerID, StreamID | implementation.md §2.1 |
| `fsm.ts` | FSMState, FSMEvent | implementation.md §2.2 |
| `execution.ts` | TaskStatus, TaskOutcome, ExecutionRequest | implementation.md §2.3 |
| `policy.ts` | GlobalPolicy, ScopePolicy | implementation.md §2.4 |
| `errors.ts` | ScopeNotFoundError, ScopeInactiveError, etc. | implementation.md §13 |

**Deliverables**:
- [ ] All type definitions
- [ ] 100% type coverage
- [ ] Export from index.ts

---

### 1.2 ScopeFSM
**File**: `packages/core/src/scope/ScopeFSM.ts`

```typescript
class ScopeFSM {
  state: FSMState
  transition(event: FSMEvent): boolean
  canExecute(): boolean
  isAlive(): boolean
}
```

**Spec Reference**:
- `execution-semantics.md §4` — Task Lifecycle FSM
- `implementation.md §4` — ScopeFSM implementation

**Test Cases**:
- [ ] INIT → ATTACHED on "mounted"
- [ ] ATTACHED → RUNNING on "taskStarted"
- [ ] RUNNING → SUSPENDED on "suspend"
- [ ] SUSPENDED → RUNNING on "resume"
- [ ] any → DISPOSING → DISPOSED on "dispose"
- [ ] DISPOSED is terminal (no transitions)
- [ ] canExecute() returns true only in ATTACHED/RUNNING
- [ ] isAlive() returns false in DISPOSING/DISPOSED

---

## Phase 2: Execution Units
**Duration**: 4-5 days

### 2.1 Worker
**File**: `packages/core/src/task/Worker.ts`

```typescript
class Worker {
  id: WorkerID
  taskRef: Ref
  start(): void
  terminate(): void
}
```

**Spec Reference**: `worker-lifecycle.md`

**Test Cases**:
- [ ] Worker binds to exactly one task
- [ ] Worker terminates on abort signal
- [ ] Worker failure propagates to task
- [ ] Worker cannot be reused after termination

---

### 2.2 Handler
**File**: `packages/core/src/task/Handler.ts`

```typescript
class Handler {
  id: HandlerID
  taskRef: Ref
  execute(): Promise<void>
  cancel(): void
}
```

**Spec Reference**: `execution-semantics.md §6`

**Test Cases**:
- [ ] Handler executes once
- [ ] Handler can be cancelled
- [ ] Handler failure marks task as failed
- [ ] Cancelled handler does not execute

---

### 2.3 Stream
**File**: `packages/core/src/task/Stream.ts`

```typescript
class Stream {
  id: StreamID
  taskRef: Ref
  emit(value: any): void
  subscribe(fn): () => void
  abort(): void
}
```

**Spec Reference**: `execution-semantics.md §8`

**Test Cases**:
- [ ] Stream emits values to subscribers
- [ ] Stream aborts on task disposal
- [ ] Aborted stream ignores emit calls
- [ ] Unsubscribe removes listener

---

## Phase 3: Task System
**Duration**: 5-6 days

### 3.1 Task
**File**: `packages/core/src/task/Task.ts`

```typescript
class Task {
  ref: Ref
  scopeId: ScopeID
  signal: AbortSignal
  status: TaskStatus

  run(fn: TaskFunction): Promise<void>
  abort(): void
  spawnWorker(fn): Worker
  addHandler(fn): Handler
  createStream(): Stream
}
```

**Spec Reference**:
- `execution-semantics.md §2` — Task definition
- `implementation.md §5` — Task class

**Test Cases**:
- [ ] Task has immutable ref
- [ ] Task aborts via AbortController
- [ ] Task spawns workers only when running
- [ ] Task terminates all workers on abort
- [ ] Task cancels all handlers on abort
- [ ] Task aborts all streams on abort
- [ ] Task outcome is SUCCESS/ERROR/ABORTED

---

### 3.2 TaskTable
**File**: `packages/core/src/task/TaskTable.ts`

```typescript
class TaskTable {
  register(task: Task): void
  unregister(ref: Ref): void
  abortAll(scopeId: ScopeID): void
  getActiveCount(scopeId: ScopeID): number
}
```

**Spec Reference**: `implementation.md §3.2`

**Test Cases**:
- [ ] Register adds task
- [ ] Unregister removes task
- [ ] abortAll aborts all tasks for scope
- [ ] getActiveCount returns correct count

---

## Phase 4: Scope System
**Duration**: 3-4 days

### 4.1 Scope
**File**: `packages/core/src/scope/Scope.ts`

```typescript
class Scope {
  id: ScopeID
  fsm: ScopeFSM
  policies: ScopePolicy

  dispose(): void
}
```

**Spec Reference**:
- `execution-semantics.md §2` — Scope definition
- `implementation.md §9` — Scope class

**Test Cases**:
- [ ] Scope initializes with FSM in INIT
- [ ] Scope transitions to ATTACHED on creation
- [ ] Scope.dispose() aborts all tasks
- [ ] Disposed scope rejects new tasks

---

## Phase 5: Scheduler
**Duration**: 4-5 days

### 5.1 Scheduler
**File**: `packages/core/src/core/Scheduler.ts`

```typescript
class Scheduler {
  authorize(request: ExecutionRequest): boolean
  activate(request, taskFn): Task | null
}
```

**Spec Reference**:
- `scheduler-priority.md` — Priority model
- `execution-activation.md` — Authorization pipeline

**Test Cases**:
- [ ] Rejects when scope not found
- [ ] Rejects when FSM not alive
- [ ] Rejects when concurrency limit reached
- [ ] Activates valid requests
- [ ] Transitions FSM on first task

---

### 5.2 Priority Queues (Optional P1)
**File**: `packages/core/src/core/PriorityQueue.ts`

```typescript
class PriorityQueue {
  enqueue(request, priority): void
  dequeue(): ExecutionRequest | null
}
```

**Spec Reference**: `scheduler-priority.md §4`

---

## Phase 6: Authority
**Duration**: 3-4 days

### 6.1 AuthorityRegistry
**File**: `packages/core/src/core/Registry.ts`

```typescript
class AuthorityRegistry {
  scopes: Map<ScopeID, Scope>
  tasks: Map<Ref, Task>
}
```

---

### 6.2 Authority
**File**: `packages/core/src/core/Authority.ts`

```typescript
class Authority {
  policies: GlobalPolicy
  scheduler: Scheduler

  registerScope(scope): void
  unregisterScope(scopeId): void
  runTask(scopeId, fn): Task | null
}
```

**Spec Reference**:
- `execution-semantics.md §2` — Authority definition
- `implementation.md §11` — Authority class

**Test Cases**:
- [ ] Authority enforces global policies
- [ ] Authority manages scope registry
- [ ] Duplicate scope key disposes existing
- [ ] runTask delegates to scheduler

---

## Phase 7: Public API
**Duration**: 2-3 days

### 7.1 API Exports
**File**: `packages/core/src/api/`

| Function | Spec |
|----------|------|
| `createAuthority(config)` | api-contract.md §3 |
| `createScope(config)` | api-contract.md §4 |
| `createTask(scopeKey)(fn)` | api-contract.md §5 |

**Spec Reference**: `api-contract.md`

**Test Cases**:
- [ ] createAuthority initializes singleton
- [ ] createScope registers with authority
- [ ] createTask returns TaskHandle
- [ ] API errors are typed

---

### 7.2 Package Exports
**File**: `packages/core/src/index.ts`

```typescript
// Public API
export { createAuthority } from './api/createAuthority'
export { createScope } from './api/createScope'
export { createTask } from './api/createTask'

// Types
export type { ... } from './types'
```

---

## Phase 8: React Adapter
**Duration**: 3-4 days

### 8.1 React Hooks
**File**: `packages/react/src/`

| Hook | Purpose |
|------|---------|
| `useAuthority` | Initialize/access authority |
| `useScope` | Create scope with React lifecycle |
| `useTask` | Create task bound to scope |

**Spec Reference**: `implementation.md §10`

**Test Cases**:
- [ ] useScope disposes on unmount
- [ ] useTask aborts on unmount
- [ ] Hooks integrate with React lifecycle

---

## Phase 9: DevTools (Future)
**Duration**: TBD

### 9.1 Event Bus
**Spec Reference**: `devtool-execution-timeline.md`

### 9.2 Timeline Model
**Spec Reference**: `devtool-execution-timeline.md §3-5`

---

## Phase 10: Release Prep
**Duration**: 2-3 days

### 10.1 Documentation
- [ ] README.md with quick start
- [ ] API reference generated from JSDoc
- [ ] Migration guide (if applicable)

### 10.2 CI/CD
- [ ] All tests pass
- [ ] 90%+ coverage
- [ ] Bundle size within limits
- [ ] npm publish workflow

### 10.3 Release
- [ ] Version 0.1.0
- [ ] Changelog
- [ ] GitHub release

---

## Milestones Summary

| Milestone | Phases | Target |
|-----------|--------|--------|
| M1: Foundation | 0-1 | Week 1 |
| M2: Execution Units | 2 | Week 2 |
| M3: Task System | 3 | Week 3 |
| M4: Core Runtime | 4-6 | Week 4 |
| M5: Public API | 7 | Week 5 |
| M6: React Adapter | 8 | Week 6 |
| M7: Alpha Release | 10 | Week 7 |

---

## Implementation Order (Strict)

```
1.  types/ids.ts
2.  types/fsm.ts
3.  types/execution.ts
4.  types/policy.ts
5.  types/errors.ts
6.  scope/ScopeFSM.ts
7.  task/Worker.ts
8.  task/Handler.ts
9.  task/Stream.ts
10. task/Task.ts
11. task/TaskTable.ts
12. scope/Scope.ts
13. core/Scheduler.ts
14. core/Registry.ts
15. core/Authority.ts
16. api/createAuthority.ts
17. api/createScope.ts
18. api/createTask.ts
19. index.ts (exports)
```

Dependencies flow downward. Each item depends only on items above it.

---

## Success Criteria

| Criteria | Measure |
|----------|---------|
| Spec alignment | 100% behaviors match docs |
| Type safety | No `any` types |
| Test coverage | ≥90% |
| Zero debt | No TODO/FIXME without issues |
| Bundle size | <10KB gzipped |

---

## Next Step

**Start with Phase 0**: Project setup and tooling.

Run `/feature-implementation` to begin.
