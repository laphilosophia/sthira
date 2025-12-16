# Installation

Sthira is designed as a modular infrastructure. You only install what you need.

## Prerequisites

- React 18+ (for `@sthirajs/react`)
- TypeScript 4.7+ (recommended)

## Core Installation

To get started with the core engine and React bindings:

```bash
npm install @sthirajs/core @sthirajs/react zod
```

> **Why Zod?**
> Sthira uses Zod for schema validation by default. This ensures runtime type safety for your state.

## Recommended Ecosystem

For a complete enterprise setup (Persistence + DevTools + Sync), we recommend installing the full suite:

```bash
npm install @sthirajs/persist @sthirajs/devtools @sthirajs/cross-tab
```

## TypeScript Setup

Sthira is written in TypeScript and ships with its own type definitions. No `@types/` packages are needed.

Ensure your `tsconfig.json` has `strict: true` for the best developer experience.

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```
