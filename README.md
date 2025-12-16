# Sthira

![Sthira Banner](.github/assets/sthira-banner.png)

**Enterprise-grade state infrastructure for mission-critical React applications.**

[![npm version](https://img.shields.io/npm/v/@sthira/core.svg)](https://www.npmjs.com/package/@sthira/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

> **Sthira** (Sanskrit: स्थिर, pronounced _STEE-rah_)
> _Stable. Firm. Resolute. Lasting._

In yoga philosophy, **"Sthira-Sukham Asanam"** teaches that true mastery requires both **stability** (_sthira_) and **ease** (_sukha_). A pose must be steady before it can be graceful. A foundation must be unshakable before complexity can flourish.

This is the philosophy behind Sthira: **enterprise-grade state infrastructure** built on an unwavering foundation—so your application can scale with confidence.

---

## 📚 Documentation

Sthira is not just another state management library. It's a comprehensive state infrastructure designed for heavy workloads.

- **[Introduction](docs/intro.md)**: Philosophy and Comparison.
- **[Installation](docs/installation.md)**: Get up and running.
- **[Quick Start](docs/quick-start.md)**: Build a reactive counter in minutes.
- **[Core Concepts](docs/core-concepts.md)**: Store, Schema, Actions.
- **Ecosystem**:
  - [Persistence](docs/ecosystem/persistence.md)
  - [Cross-Tab Sync](docs/ecosystem/sync.md)
  - [DevTools](docs/ecosystem/devtools.md)

## Core Differentiators

| Feature                 | Sthira      | Zustand   | Jotai     | Redux      |
| ----------------------- | ----------- | --------- | --------- | ---------- |
| Schema Validation (Zod) | ✅          | ❌        | ❌        | ❌         |
| Plugin Architecture     | ✅          | ❌        | ❌        | ✅         |
| Cross-tab Sync          | ✅ Built-in | 3rd party | ❌        | 3rd party  |
| Persistence Layer       | ✅ Built-in | 3rd party | 3rd party | 3rd party  |
| Interceptors            | ✅          | ❌        | ❌        | Middleware |

## Quick Start Example

```bash
npm install @sthira/core @sthira/react zod
```

```typescript
import { createStore } from '@sthira/core'
import { useStore } from '@sthira/react'
import { z } from 'zod'

const counterStore = createStore({
  name: 'counter',
  schema: z.object({ count: z.number() }),
  state: { count: 0 },
  actions: {
    increment: (state) => ({ count: state.count + 1 }),
  },
})

function Counter() {
  const { count } = useStore(counterStore)
  return <button onClick={() => counterStore.actions.increment()}>{count}</button>
}
```

## Enterprise Configuration

```typescript
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
});
```

## License

MIT
