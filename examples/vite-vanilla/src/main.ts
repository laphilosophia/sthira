import { createChunkedStore, type ChunkedStoreApi } from '@sthirajs/chunked';
import { createStore } from '@sthirajs/core';
import { createSyncPlugin } from '@sthirajs/cross-tab';
import { createBatcher, getMemoryInfo, yieldToMain } from '@sthirajs/perf';
import { createLocalStorageAdapter, createPersistPlugin } from '@sthirajs/persist';
import './style.css';

// ============================================================================
// Types
// ============================================================================

interface CounterState {
  count: number;
  lastUpdated: string;
}

// Note: CounterActions interface removed - actions are now automatically inferred!

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

// ============================================================================
// 1. Core Store with Persist Plugin
// ============================================================================

const persistPlugin = createPersistPlugin<CounterState>({
  key: 'sthira-counter',
  adapter: createLocalStorageAdapter(),
  debounce: 300,
});

const syncPlugin = createSyncPlugin<CounterState>({
  channel: 'sthira-vanilla-counter',
  debounce: 100,
});

// Using curried pattern: createStore<State>()({...})
// Actions are automatically inferred from the actions factory!
const counterStore = createStore<CounterState>()({
  name: 'counter',
  state: { count: 0, lastUpdated: new Date().toISOString() },
  actions: (set) => ({
    increment: () => set((s) => ({ count: s.count + 1, lastUpdated: new Date().toISOString() })),
    decrement: () => set((s) => ({ count: s.count - 1, lastUpdated: new Date().toISOString() })),
    reset: () => set(() => ({ count: 0, lastUpdated: new Date().toISOString() })),
  }),
  plugins: [persistPlugin, syncPlugin],
});

// ============================================================================
// 2. Chunked Store for Large Data (requires adapter)
// ============================================================================

// Create a localStorage adapter for chunked storage
const chunkedAdapter = createLocalStorageAdapter({ prefix: 'sthira-chunks:' });

// Pass adapter + config
const chunkedStore: ChunkedStoreApi<TodoItem> = createChunkedStore<TodoItem>(chunkedAdapter, {
  name: 'todos',
  chunkSize: 100,
});

// ============================================================================
// 3. Performance Utilities Demo
// ============================================================================

const batcher = createBatcher<string>(
  (items) => {
    console.log('[Batcher] Flushed:', items.length, 'items');
    updateLogDisplay(`Batched ${items.length} items`);
  },
  { maxSize: 10, maxWait: 100 },
);

async function performHeavyTask() {
  const statusEl = document.getElementById('perf-status')!;
  statusEl.textContent = 'Processing...';

  // Simulate heavy work with yielding
  for (let i = 0; i < 5; i++) {
    await yieldToMain(); // Yield to keep UI responsive
    statusEl.textContent = `Step ${i + 1}/5...`;
  }

  statusEl.textContent = 'Done!';
}

function showMemoryInfo() {
  const info = getMemoryInfo();
  const memEl = document.getElementById('memory-info')!;
  if (info) {
    const usedMB = Math.round(info.usedHeap / 1024 / 1024);
    const totalMB = Math.round(info.totalHeap / 1024 / 1024);
    memEl.textContent = `Memory: ${usedMB}MB / ${totalMB}MB`;
  } else {
    memEl.textContent = 'Memory API not available';
  }
}

// ============================================================================
// UI Rendering
// ============================================================================

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <h1>Sthira - Vanilla TS Example</h1>
    <p>Testing @sthirajs/core, @sthirajs/persist, @sthirajs/perf, @sthirajs/chunked</p>

    <section class="card">
      <h2>📊 Counter Store (Persist + Cross-Tab Sync)</h2>
      <p>State is persisted to localStorage and synced across tabs</p>
      <div class="counter-display">
        <span id="count">0</span>
      </div>
      <div class="button-group">
        <button id="dec">-</button>
        <button id="inc">+</button>
        <button id="reset">Reset</button>
      </div>
      <small id="last-updated"></small>
    </section>

    <section class="card">
      <h2>📦 Chunked Store</h2>
      <p>Large data with automatic chunking</p>
      <div class="button-group">
        <button id="add-todos">Add 100 Todos</button>
        <button id="clear-todos">Clear</button>
      </div>
      <div id="chunked-stats"></div>
    </section>

    <section class="card">
      <h2>⚡ Performance Utilities</h2>
      <div class="button-group">
        <button id="heavy-task">Run Heavy Task</button>
        <button id="batch-items">Batch 50 Items</button>
        <button id="show-memory">Show Memory</button>
      </div>
      <div id="perf-status"></div>
      <div id="memory-info"></div>
    </section>

    <section class="card">
      <h2>📝 Activity Log</h2>
      <div id="log" class="log-display"></div>
    </section>

    <div class="status" id="status">
      ✅ All packages loaded successfully!
    </div>
  </div>
`;

// ============================================================================
// Event Handlers
// ============================================================================

const countEl = document.getElementById('count')!;
const lastUpdatedEl = document.getElementById('last-updated')!;
const logEl = document.getElementById('log')!;

function updateLogDisplay(message: string) {
  const time = new Date().toLocaleTimeString();
  logEl.innerHTML = `<div>[${time}] ${message}</div>` + logEl.innerHTML;
  if (logEl.children.length > 10) {
    logEl.removeChild(logEl.lastChild!);
  }
}

// Counter Store
counterStore.subscribe((state) => {
  countEl.textContent = String(state.count);
  lastUpdatedEl.textContent = `Last updated: ${new Date(state.lastUpdated).toLocaleTimeString()}`;
});

// Initialize display
countEl.textContent = String(counterStore.getState().count);
lastUpdatedEl.textContent = `Last updated: ${new Date(counterStore.getState().lastUpdated).toLocaleTimeString()}`;

document.getElementById('inc')!.addEventListener('click', () => {
  counterStore.increment();
  updateLogDisplay('Counter incremented');
});

document.getElementById('dec')!.addEventListener('click', () => {
  counterStore.decrement();
  updateLogDisplay('Counter decremented');
});

document.getElementById('reset')!.addEventListener('click', () => {
  counterStore.reset();
  updateLogDisplay('Counter reset');
});

// Chunked Store
function updateChunkedStats() {
  const stats = chunkedStore.getState();
  const statsEl = document.getElementById('chunked-stats')!;
  statsEl.innerHTML = `
    <div>Total Items: ${stats.totalItems}</div>
    <div>Chunks: ${stats.totalChunks}</div>
    <div>Memory Size: ${(stats.memoryUsage / 1024).toFixed(2)} KB</div>
  `;
}

document.getElementById('add-todos')!.addEventListener('click', async () => {
  const stats = chunkedStore.getState();
  const startId = stats.totalItems;

  for (let i = 0; i < 100; i++) {
    await chunkedStore.set(`todo-${startId + i}`, {
      id: startId + i,
      text: `Todo item ${startId + i}`,
      done: Math.random() > 0.5,
    });
  }

  await updateChunkedStats();
  updateLogDisplay('Added 100 todos to chunked store');
});

document.getElementById('clear-todos')!.addEventListener('click', async () => {
  await chunkedStore.clear();
  await updateChunkedStats();
  updateLogDisplay('Cleared chunked store');
});

updateChunkedStats();

// Performance
document.getElementById('heavy-task')!.addEventListener('click', () => {
  performHeavyTask();
  updateLogDisplay('Started heavy task with yielding');
});

document.getElementById('batch-items')!.addEventListener('click', () => {
  for (let i = 0; i < 50; i++) {
    batcher.add(`Item ${i}`);
  }
  batcher.flush();
  updateLogDisplay('Batched 50 items');
});

document.getElementById('show-memory')!.addEventListener('click', () => {
  showMemoryInfo();
  updateLogDisplay('Checked memory info');
});

// Log initial state
updateLogDisplay('Application initialized');
console.log('Sthira Vanilla Example loaded!');
console.log('Stores:', { counter: counterStore.getState() });
