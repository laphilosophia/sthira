# @sthirajs/core

## 0.3.6

### Patch Changes

- Fix Vite static analysis by using truly dynamic imports via Function constructor for optional dependencies.

## 0.3.5

### Patch Changes

- Support zod v4 in peer dependencies alongside v3.

## 0.3.4

### Patch Changes

- Fix Vite pre-bundling issue with optional plugin dependencies. Dynamic imports now use @vite-ignore comments to prevent resolution errors when @sthirajs/persist, @sthirajs/cross-tab, or @sthirajs/devtools are not installed.

## 0.3.3

### Patch Changes

- fix: make zod an optional peer dependency

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
