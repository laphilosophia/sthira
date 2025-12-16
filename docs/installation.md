# Installation

Sthira is designed as a modular infrastructure. Install only what you need.

## Prerequisites

- **Node.js**: 18.0 or higher
- **React**: 18.0 or higher (for `@sthirajs/react`)
- **TypeScript**: 4.7 or higher (recommended but optional)

## Quick Install

For most React applications, install the core packages:

```bash
# npm
npm install @sthirajs/core @sthirajs/react zod

# pnpm
pnpm add @sthirajs/core @sthirajs/react zod

# yarn
yarn add @sthirajs/core @sthirajs/react zod
```

> **Why Zod?**
> Sthira uses [Zod](https://zod.dev) for runtime schema validation. This ensures type safety not just at compile time, but also at runtime — catching invalid data before it corrupts your state.

## Package Overview

| Package               | Purpose                                    | Size   |
| --------------------- | ------------------------------------------ | ------ |
| `@sthirajs/core`      | Core state engine, store creation, plugins | ~2KB   |
| `@sthirajs/react`     | React hooks (`useStore`, `useSelector`)    | ~1KB   |
| `@sthirajs/persist`   | Persistence (localStorage, IndexedDB)      | ~1KB   |
| `@sthirajs/devtools`  | Redux DevTools integration                 | ~0.5KB |
| `@sthirajs/cross-tab` | Cross-tab state synchronization            | ~0.5KB |
| `@sthirajs/fetch`     | REST API data fetching                     | ~1KB   |
| `@sthirajs/perf`      | Performance monitoring                     | ~0.5KB |
| `@sthirajs/chunked`   | Virtual pagination for large arrays        | ~0.5KB |

## Enterprise Setup

For production applications requiring persistence, debugging, and multi-tab support:

```bash
npm install @sthirajs/core @sthirajs/react @sthirajs/persist @sthirajs/devtools @sthirajs/cross-tab zod
```

## TypeScript Configuration

Sthira is written in TypeScript and ships with complete type definitions. No `@types/` packages needed.

For the best experience, enable strict mode in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

## Framework Support

### React (Recommended)

```bash
npm install @sthirajs/core @sthirajs/react
```

### Vue, Svelte, Solid, etc.

Use the core package directly:

```bash
npm install @sthirajs/core
```

Then subscribe to stores manually:

```typescript
import { createStore } from '@sthirajs/core';

const store = createStore({ name: 'app', state: { count: 0 } });

// Subscribe to changes
store.subscribe((state) => {
  console.log('State changed:', state);
});
```

### Node.js / Edge Runtimes

The core package works in any JavaScript environment:

```typescript
// Works in Node.js, Deno, Bun, Cloudflare Workers, etc.
import { createStore } from '@sthirajs/core';
```

## Bundler Configuration

Sthira uses modern ES modules with dual CJS/ESM exports. It works out of the box with:

- **Vite** ✅
- **Next.js** ✅
- **Create React App** ✅
- **Webpack 5** ✅
- **Parcel** ✅
- **esbuild** ✅

No special configuration required.

## CDN Usage

For quick prototyping, you can use Sthira via CDN:

```html
<script type="module">
  import { createStore } from 'https://esm.sh/@sthirajs/core';

  const store = createStore({
    name: 'demo',
    state: { count: 0 },
  });
</script>
```

## Next Steps

- **[Quick Start](./quick-start.md)**: Create your first store
- **[Core Concepts](./core-concepts.md)**: Understand the architecture
