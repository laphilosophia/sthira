# @sthirajs/fetch

## 2.0.0

### Patch Changes

- Updated dependencies
  - @sthirajs/core@0.3.0

## 1.1.0

### Minor Changes

- Add AbortController enhancements with timeout and request cancellation support
  - Add `timeout` option for automatic request timeout
  - Add `cancelOnNewRequest` option to cancel previous in-flight requests (default: true)
  - Add `abort()` method to both queries and mutations for manual cancellation
  - Support external `AbortSignal` for integration with existing abort controllers
  - Auto-cancel previous mutations when a new mutation starts

## 1.0.0

### Minor Changes

- 283bb60: Initial public release of Sthira enterprise state infrastructure.

### Patch Changes

- Updated dependencies [283bb60]
  - @sthirajs/core@0.2.0
