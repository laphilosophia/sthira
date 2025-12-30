# Sthira Engine Layer Semantics

> Canonical specification of the Engine Layer.
> Parent document: [architecture-foundation.md](./architecture-foundation.md)
>
> This document defines HOW work executes smoothly.

---

## 1. Purpose

The Engine Layer is the **execution backbone** of Sthira.

While the Execution Layer decides WHAT and WHEN, the Engine Layer handles:

* **Parallel execution** — Worker pool
* **Streaming** — Chunked data processing
* **Buffering** — Final format conversion

---

## 2. Core Principle

> **True Non-UI**: All heavy computation runs off the main thread.

The main thread is sacred — reserved for UI only.
Sthira executes business logic in workers.

---

## 3. Dual Execution API

Sthira provides two execution paths:

### 3.1 effect() — Light Path

```typescript
ctx.effect(() => {
  return computed.value
})
```

**Behavior:**
- Direct execution on main thread
- No worker, no stream, no buffer
- Synchronous or Promise return
- Zero overhead

**Use for:**
- Computed properties
- Signal reflections
- Trivial operations

### 3.2 run() — Heavy Path

```typescript
ctx.run(async () => {
  return processLargeData(data)
})
```

**Behavior:**
- Executes in worker pool
- Streams chunks internally
- Buffers and returns final result
- Full engine power

**Use for:**
- Heavy computation
- Large data processing
- API calls with large payloads

---

## 4. Worker Pool Configuration

### 4.1 Authority Level (Global Defaults)

```typescript
createAuthority({
  engine: {
    defaultWorkers: 1,    // Conservative default
    maxWorkers: 4,        // Hard cap (recommended: navigator.hardwareConcurrency)
  }
})
```

### 4.2 Scope Level (Override)

```typescript
createScope({
  name: 'heavy-processing',
  engine: {
    workers: 4,           // Use more workers for this scope
  }
})
```

### 4.3 Task Level

Tasks do not control workers directly.
They inherit from their scope's configuration.

```typescript
// Task uses scope's worker allocation
ctx.run(async () => heavyWork())
```

---

## 5. Execution Flow

### effect() Flow

```
ctx.effect(fn)
     │
     ↓
  [DIRECT EXECUTION]
     │
     ↓
  Result (sync or Promise)
```

### run() Flow

```
ctx.run(fn)
     │
     ↓
┌─────────────┐
│ WORKER POOL │  ← Uses scope's worker allocation
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   STREAM    │  ← Chunks flow internally
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   BUFFER    │  ← Collects chunks
└──────┬──────┘
       │
       ↓
  Result (JSON | JS object)
```

---

## 6. Worker Pool Management

### 6.1 Pool Lifecycle

```
Authority.init()
     │
     ↓
Create worker pool (defaultWorkers)
     │
     ↓
Scopes borrow workers from pool
     │
     ↓
Authority.dispose()
     │
     ↓
Terminate all workers
```

### 6.2 Worker Allocation

- Workers are shared across scopes
- Scope requests N workers (up to maxWorkers)
- If all busy, tasks queue

### 6.3 Worker Termination

```
Scope.dispose()
     │
     ↓
Abort all tasks in scope
     │
     ↓
Return borrowed workers to pool
```

---

## 7. Internal Streaming

Streaming is **internal** by default.

```typescript
// Developer writes:
const result = await ctx.run(() => processItems(items))

// Engine internally:
// 1. Sends to worker
// 2. Worker streams chunks back
// 3. Engine buffers chunks
// 4. Returns final result

// Developer gets: JSON | JS object
```

### 7.1 Explicit Streaming (Opt-in)

For incremental results:

```typescript
ctx.run(async ({ emit }) => {
  for (const item of items) {
    const result = process(item)
    emit(result)  // Stream to consumer
  }
}, { streaming: true })
```

---

## 8. Task Options

```typescript
interface TaskRunOptions {
  // Execution timing
  deferred?: boolean    // false - run in idle time

  // Output mode
  streaming?: boolean   // false - enable incremental output
}
```

---

## 9. Error Handling

### Worker Crash

- Worker is terminated
- Error propagates to task
- Pool spawns replacement worker

### Task Abort

- Worker execution is cancelled
- Buffered chunks are discarded
- Error surfaced to caller

---

## 10. Performance Characteristics

| Path | Latency | Overhead |
|------|---------|----------|
| effect() | ~0ms | None |
| run() | ~1-5ms | Worker dispatch + serialization |

---

## 11. Configuration Summary

```typescript
// Authority: global limits
createAuthority({
  engine: {
    defaultWorkers: 1,
    maxWorkers: navigator.hardwareConcurrency || 4,
  }
})

// Scope: override for heavy lanes
createScope({
  name: 'analytics',
  engine: { workers: 4 }
})

// Task: execution options only
ctx.run(fn, { deferred: true, streaming: true })
```

---

## Summary

> The Engine Layer provides two paths:
>
> **effect()** — Light, direct, zero overhead
> **run()** — Heavy, parallel, full power
>
> Workers are configured at Authority/Scope level.
> Tasks inherit their scope's resources.
