# Sthira

**Enterprise-grade state infrastructure for mission-critical React applications.**

[![npm version](https://img.shields.io/npm/v/@sthira/core.svg)](https://www.npmjs.com/package/@sthira/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

> **Sthira** (Sanskrit: स्थिर, pronounced _STEE-rah_)
> _Stable. Firm. Resolute. Lasting._

In yoga philosophy, **"Sthira-Sukham Asanam"** teaches that true mastery requires both **stability** (_sthira_) and **ease** (_sukha_). A pose must be steady before it can be graceful. A foundation must be unshakable before complexity can flourish.

This is the philosophy behind Sthira: **enterprise-grade state infrastructure** built on an unwavering foundation—so your application can scale with confidence.

---

Sthira is not just another state management library. It's a comprehensive state infrastructure designed for applications that demand:

- **Heavy workload resilience** - Built to handle complex, data-intensive operations
- **Architectural flexibility** - Plugin system that adapts to your unique requirements
- **Production-grade reliability** - Schema validation, type safety, and predictable behavior
- **Enterprise patterns** - Cross-tab sync, persistence, DevTools integration out of the box

## When to Choose Sthira

| Scenario               | Simple State Lib      | Sthira      |
| ---------------------- | --------------------- | ----------- |
| Todo app prototype     | ✅                    | ⚠️ Overkill |
| Enterprise dashboard   | ⚠️ Lacks features     | ✅          |
| Multi-tab banking app  | ❌ Manual work        | ✅          |
| Complex form workflows | ⚠️ Error-prone        | ✅          |
| Data-heavy analytics   | ⚠️ Performance issues | ✅          |

## Core Differentiators

| Feature                 | Sthira      | Zustand   | Jotai     | Redux      |
| ----------------------- | ----------- | --------- | --------- | ---------- |
| Schema Validation (Zod) | ✅          | ❌        | ❌        | ❌         |
| Plugin Architecture     | ✅          | ❌        | ❌        | ✅         |
| Cross-tab Sync          | ✅ Built-in | 3rd party | ❌        | 3rd party  |
| Persistence Layer       | ✅ Built-in | 3rd party | 3rd party | 3rd party  |
| Interceptors            | ✅          | ❌        | ❌        | Middleware |

## Packages

| Package             | Purpose        | Size  |
| ------------------- | -------------- | ----- |
| `@sthira/core`      | State engine   | ~26KB |
| `@sthira/react`     | React bindings | ~3KB  |
| `@sthira/persist`   | Persistence    | ~14KB |
| `@sthira/devtools`  | DevTools       | ~7KB  |
| `@sthira/cross-tab` | Tab sync       | ~6KB  |
| `@sthira/fetch`     | Data fetching  | ~9KB  |
| `@sthira/perf`      | Performance    | ~9KB  |
| `@sthira/chunked`   | Virtual store  | ~8KB  |

## Quick Start

```bash
pnpm add @sthira/core @sthira/react zod
```

```typescript
import { createStore } from '@sthira/core'
import { useStore } from '@sthira/react'
import { z } from 'zod'

const counterStore = createStore({
  name: 'counter',
  schema: z.object({ count: z.number() }),
  state: { count: 0 },
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1 }),
  }),
})

function Counter() {
  const { count, increment } = useStore(counterStore)
  return <button onClick={increment}>{count}</button>
}
```

## Enterprise Configuration

```typescript
import { createStore } from '@sthira/core'
import { createPersistPlugin } from '@sthira/persist'
import { createDevToolsPlugin } from '@sthira/devtools'
import { createSyncPlugin } from '@sthira/cross-tab'

const store = createStore({
  name: 'enterprise-app',
  schema: appSchema,
  state: initialState,
  plugins: [
    createPersistPlugin({ key: 'app', storage: 'indexeddb' }),
    createDevToolsPlugin({ name: 'MyApp' }),
    createSyncPlugin({ channel: 'app-sync' }),
  ],
  interceptors: {
    beforeSet: (next, prev) => auditLog(next, prev),
    onError: (error) => errorReporter.capture(error),
  },
})
```

## Performance

Not the fastest—by design. We prioritize **reliability over raw speed**.

| Metric       | Sthira  | Zustand | Jotai   |
| ------------ | ------- | ------- | ------- |
| Store Create | 10.66ms | 3.05ms  | 10.56ms |
| State Update | 10.49ms | 3.77ms  | 47.53ms |
| With 10 Subs | 8.54ms  | 5.21ms  | 40.64ms |

The ~2-3x overhead vs Zustand buys you: schema validation, plugin system, interceptors, and enterprise patterns.

## Philosophy

> "We don't compete on microseconds. We compete on **what you can build**."

Sthira is for teams who need more than a simple state container. It's for applications where:

- Data integrity matters (schema validation)
- Multi-tab UX is expected (cross-tab sync)
- Debugging complex flows is daily work (DevTools)
- State must survive page reloads (persistence)

## License

MIT
