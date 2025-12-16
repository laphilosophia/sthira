# Cross-Tab Sync Plugin

Synchronize state across multiple browser tabs/windows instantly using the Broadcast Channel API.

## Installation

```bash
npm install @sthirajs/cross-tab
```

## Usage

Simply add the plugin to your store. Sthira handles the rest.

```typescript
import { createStore } from '@sthirajs/core';
import { createSyncPlugin } from '@sthirajs/cross-tab';

const authStore = createStore({
  name: 'auth',
  state: { user: null, token: null },
  plugins: [
    createSyncPlugin({
      channel: 'auth_sync_channel', // Optional, defaults to store name
    }),
  ],
});
```

## How it works

1.  **Action in Tab A:** You call `authStore.actions.login(user)`.
2.  **Broadcast:** The plugin broadcasts the new state via a `BroadcastChannel`.
3.  **Receive in Tab B:** Other tabs receive the message and update their local state silently.
4.  **Consistency:** All tabs reflect the same user state without reloading.
