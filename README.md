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

## 📦 Project Structure

Sthira is a monorepo containing a modular set of packages designed to work together seamlessly.

| Package                 | Purpose                                                      | Size   | Documentation                           |
| :---------------------- | :----------------------------------------------------------- | :----- | :-------------------------------------- |
| **`@sthira/core`**      | The infrastructure engine. Store creation, actions, plugins. | ~2KB   | [Core Concepts](docs/core-concepts.md)  |
| **`@sthira/react`**     | Official React hooks (`useStore`).                           | ~1KB   | [API Reference](docs/packages/react.md) |
| **`@sthira/persist`**   | Automated storage persistence (Local/Session/IndexedDB).     | ~0.5KB | [Docs](docs/ecosystem/persistence.md)   |
| **`@sthira/cross-tab`** | Instant state synchronization between detailed tabs.         | ~0.3KB | [Docs](docs/ecosystem/sync.md)          |
| **`@sthira/devtools`**  | Redux DevTools integration for time-travel debugging.        | ~0.4KB | [Docs](docs/ecosystem/devtools.md)      |
| **`@sthira/fetch`**     | Managed async data fetching with loading/error states.       | ~0.8KB | [Docs](docs/ecosystem/fetch.md)         |
| **`@sthira/perf`**      | Performance metrics and slow action logging.                 | ~0.3KB | [Docs](docs/ecosystem/perf.md)          |
| **`@sthira/chunked`**   | Virtual pagination for managing massive arrays.              | ~0.5KB | [Docs](docs/ecosystem/chunked.md)       |

## 📚 Documentation

Detailed guides are available in the **[docs/](docs/)** folder:

- **[Introduction](docs/intro.md)**: Philosophy and Comparison.
- **[Installation](docs/installation.md)**: Getting started guide.
- **[Quick Start](docs/quick-start.md)**: Build your first store.

---

## 🚀 Quick Start Example: "The Enterprise Setup"

Unlike simple counters, real-world apps need **persistence**, **debugging**, and **sync** out of the box.

```bash
npm install @sthira/core @sthira/react @sthira/persist @sthira/devtools @sthira/cross-tab zod
```

```tsx
import { createStore } from '@sthira/core';
import { useStore } from '@sthira/react';
import { createPersistPlugin } from '@sthira/persist';
import { createDevToolsPlugin } from '@sthira/devtools';
import { createSyncPlugin } from '@sthira/cross-tab';
import { z } from 'zod';

// 1. Define strict schema
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
});

// 2. Create reliable store
export const userStore = createStore({
  name: 'user-session', // ID for sync and persistence

  // Initial State
  state: {
    id: crypto.randomUUID(),
    name: 'Guest',
    preferences: { theme: 'light', notifications: true },
  },

  // Runtime Validation
  schema: userSchema,

  // Logic
  actions: {
    updateTheme: (state, theme: 'light' | 'dark') => ({
      preferences: { ...state.preferences, theme },
    }),
    updateName: (state, name: string) => ({ name }),
  },

  // Infrastructure Plugins
  plugins: [
    createPersistPlugin({ key: 'app_user_v1' }), // Saves to localStorage
    createSyncPlugin(), // Syncs across tabs
    createDevToolsPlugin({ name: 'User Store' }), // Inspect in Redux DevTools
  ],
});

// 3. Consume in UI
function UserProfile() {
  const { name, preferences } = useStore(userStore);

  return (
    <div className={`app ${preferences.theme}`}>
      <h1>Welcome, {name}</h1>
      <button onClick={() => userStore.actions.updateTheme('dark')}>Switch to Dark Mode</button>
    </div>
  );
}
```

## Why Sthira?

| Feature          | Sthira              | Others               |
| :--------------- | :------------------ | :------------------- |
| **Validation**   | schema-first (Zod)  | manual               |
| **Architecture** | plugin-based        | middleware/hooks     |
| **Ecosystem**    | 1st party supported | fragmented 3rd party |
| **Philosophy**   | Stability > Speed   | Speed > Stability    |

## License

MIT
