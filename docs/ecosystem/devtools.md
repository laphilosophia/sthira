# DevTools Plugin

Integrate your stores with the Redux DevTools Extension for time-travel debugging and state inspection.

## Installation

```bash
npm install @sthira/devtools
```

## Usage

```typescript
import { createStore } from '@sthira/core';
import { createDevToolsPlugin } from '@sthira/devtools';

const cartStore = createStore({
  name: 'shopping-cart',
  state: { items: [] },
  plugins: [
    createDevToolsPlugin({
      name: 'Shopping Cart', // Name shown in DevTools instance list
    }),
  ],
});
```

## Features

- **Action Log:** See every action dispatched (e.g., `cart/addItem`).
- **State Inspection:** View the full state tree at any point.
- **Time Travel:** Jump back to previous states to debug issues.
