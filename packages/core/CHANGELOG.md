# @sthirajs/core

## 0.3.2

### Patch Changes

- Fix: Computed signals now recompute synchronously after signal.set() - dirty flag is set immediately instead of waiting for microtask

## 0.3.1

### Patch Changes

- Fix: Signal primitives exports now correctly included in package distribution

## 0.3.0

### Minor Changes

- Signal Primitives: Fine-grained reactivity system inspired by Solid.js/Preact signals
  - `signal<T>()` - Reactive value holder with automatic dependency tracking
  - `computed<T>()` - Lazy evaluated derived values with memoization
  - `effect()` - Side effect runner with cleanup support
  - `batch()` - Microtask-based update batching
  - `untracked()` - Read values without tracking dependencies

## 0.3.0

### Minor Changes

- **Signal Primitives**: Fine-grained reactivity system inspired by Solid.js/Preact signals
  - `signal<T>()` - Reactive value holder with automatic dependency tracking
  - `computed<T>()` - Lazy evaluated derived values with memoization
  - `effect()` - Side effect runner with cleanup support
  - `batch()` - Microtask-based update batching
  - `untracked()` - Read values without tracking dependencies

## 0.2.0

### Minor Changes

- 283bb60: Initial public release of Sthira enterprise state infrastructure.
