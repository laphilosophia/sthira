import { createStore } from '@sthirajs/core';
import { createSyncPlugin } from '@sthirajs/cross-tab';
import { createDevToolsPlugin, isDevToolsAvailable } from '@sthirajs/devtools';
import { createFetchSource } from '@sthirajs/fetch';
import { createLocalStorageAdapter, createPersistPlugin } from '@sthirajs/persist';
import { useStore } from '@sthirajs/react';
import { useEffect, useState } from 'react';
import './App.css';

// ============================================================================
// Types
// ============================================================================

interface AppState {
  count: number;
  theme: 'light' | 'dark';
  lastSyncedAt: string | null;
}

// Note: AppActions interface removed - actions are now automatically inferred!

interface User {
  id: number;
  name: string;
  email: string;
}

// ============================================================================
// Store Setup with All Plugins
// ============================================================================

// Create plugins
const persistPlugin = createPersistPlugin<AppState>({
  key: 'sthira-react-example',
  adapter: createLocalStorageAdapter(),
  debounce: 500,
});

const syncPlugin = createSyncPlugin<AppState>({
  channel: 'sthira-react-example',
  debounce: 100,
});

const devtoolsPlugin = createDevToolsPlugin<AppState>({
  name: 'Sthira React Example',
  maxAge: 25,
});

// Create the main store with curried pattern
// Actions are automatically inferred from the factory function!
const appStore = createStore<AppState>()({
  name: 'app',
  state: {
    count: 0,
    theme: 'dark',
    lastSyncedAt: null,
  },
  actions: (set) => ({
    increment: () => set((s) => ({ count: s.count + 1 })),
    decrement: () => set((s) => ({ count: s.count - 1 })),
    reset: () => set({ count: 0 }),
    toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  }),
  plugins: [persistPlugin, syncPlugin, devtoolsPlugin],
});

// ============================================================================
// Fetch Source Demo
// ============================================================================

const usersQuery = createFetchSource<User[]>({
  url: 'https://jsonplaceholder.typicode.com/users',
  cacheKey: 'users',
  staleTime: 60000, // 1 minute
  cacheTime: 300000, // 5 minutes
  retry: 2,
});

// ============================================================================
// Components
// ============================================================================

function Counter() {
  const state = useStore(appStore);

  return (
    <div className="card">
      <h2>📊 Counter (Persist + Sync + DevTools)</h2>
      <p className="description">
        State is persisted to localStorage, synced across tabs, and visible in Redux DevTools
      </p>
      <div className="counter-display">{state.count}</div>
      <div className="button-group">
        <button onClick={appStore.decrement}>-</button>
        <button onClick={appStore.increment}>+</button>
        <button onClick={appStore.reset}>Reset</button>
      </div>
      <small>
        Try opening this page in another tab - the count syncs automatically!
      </small>
    </div>
  );
}

function ThemeToggle() {
  const state = useStore(appStore);

  return (
    <div className="card">
      <h2>🎨 Theme Toggle</h2>
      <p className="description">Theme preference is persisted</p>
      <button onClick={appStore.toggleTheme} className="theme-button">
        Current: {state.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </div>
  );
}

function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersQuery.fetch();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👥 Users (Fetch)</h2>
      <p className="description">
        Data fetching with caching using @sthirajs/fetch
      </p>
      <div className="button-group">
        <button onClick={fetchUsers} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Users'}
        </button>
        <button onClick={() => usersQuery.invalidate()}>
          Invalidate Cache
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {users.length > 0 && (
        <ul className="users-list">
          {users.slice(0, 5).map((user) => (
            <li key={user.id}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </li>
          ))}
          {users.length > 5 && (
            <li className="more">...and {users.length - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

function PluginStatus() {
  const devtoolsAvailable = isDevToolsAvailable();

  return (
    <div className="card status-card">
      <h2>🔌 Plugin Status</h2>
      <div className="status-grid">
        <div className="status-item">
          <span className="status-icon">✅</span>
          <span>@sthirajs/core</span>
        </div>
        <div className="status-item">
          <span className="status-icon">✅</span>
          <span>@sthirajs/react</span>
        </div>
        <div className="status-item">
          <span className="status-icon">✅</span>
          <span>@sthirajs/persist</span>
        </div>
        <div className="status-item">
          <span className="status-icon">✅</span>
          <span>@sthirajs/cross-tab</span>
        </div>
        <div className="status-item">
          <span className="status-icon">{devtoolsAvailable ? '✅' : '⚠️'}</span>
          <span>@sthirajs/devtools {!devtoolsAvailable && '(install extension)'}</span>
        </div>
        <div className="status-item">
          <span className="status-icon">✅</span>
          <span>@sthirajs/fetch</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// App
// ============================================================================

function App() {
  const state = useStore(appStore);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  return (
    <div className="container">
      <header>
        <h1>Sthira - React Example</h1>
        <p className="subtitle">
          Testing @sthirajs/core, react, persist, cross-tab, devtools, fetch
        </p>
      </header>

      <main>
        <Counter />
        <ThemeToggle />
        <UsersList />
        <PluginStatus />
      </main>

      <footer className="success-banner">
        ✅ All packages loaded and working!
      </footer>
    </div>
  );
}

export default App;
