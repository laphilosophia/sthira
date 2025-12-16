/**
 * Sthira Memory Leak Test
 * Phase 13: Retrospective
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Node.js globals declaration
declare const process: any;
declare const global: any;

import { createStore } from '../src/store';

function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && (process as any).memoryUsage) {
    return (process as any).memoryUsage().heapUsed;
  }
  return 0;
}

async function testSubscriberCleanup(): Promise<void> {
  console.log('\n📊 Test: Subscriber Cleanup');

  const initialMemory = getMemoryUsage();
  const store = createStore({ name: 'mem-test', state: { count: 0 } });

  // Add and remove many subscribers
  for (let i = 0; i < 10000; i++) {
    const unsubscribe = store.subscribe(() => {});
    unsubscribe(); // Immediately cleanup
  }

  // Force GC if available
  if ((global as any).gc) (global as any).gc();
  await new Promise((r) => setTimeout(r, 100));

  const finalMemory = getMemoryUsage();
  const diff = finalMemory - initialMemory;

  console.log(`  Initial: ${formatMemory(initialMemory)}`);
  console.log(`  Final: ${formatMemory(finalMemory)}`);
  console.log(`  Diff: ${formatMemory(diff)}`);
  console.log(`  Status: ${diff < 1024 * 1024 ? '✅ PASS' : '⚠️ CHECK'}`);
}

async function testStoreCreationDestroy(): Promise<void> {
  console.log('\n📊 Test: Store Creation/Destroy');

  const initialMemory = getMemoryUsage();

  // Create and destroy many stores
  for (let i = 0; i < 1000; i++) {
    const store = createStore({
      name: `store-${i}`,
      state: { data: new Array(100).fill(0) as number[] },
    });
    await store.destroy();
  }

  if ((global as any).gc) (global as any).gc();
  await new Promise((r) => setTimeout(r, 100));

  const finalMemory = getMemoryUsage();
  const diff = finalMemory - initialMemory;

  console.log(`  Initial: ${formatMemory(initialMemory)}`);
  console.log(`  Final: ${formatMemory(finalMemory)}`);
  console.log(`  Diff: ${formatMemory(diff)}`);
  console.log(`  Status: ${diff < 5 * 1024 * 1024 ? '✅ PASS' : '⚠️ CHECK'}`);
}

async function testEventListenerCleanup(): Promise<void> {
  console.log('\n📊 Test: Event Listener Cleanup');

  const initialMemory = getMemoryUsage();

  for (let i = 0; i < 1000; i++) {
    const store = createStore({ name: `event-${i}`, state: { x: 0 } });

    // Trigger events
    store.setState({ x: 1 });
    store.setState({ x: 2 });

    await store.destroy();
  }

  if ((global as any).gc) (global as any).gc();
  await new Promise((r) => setTimeout(r, 100));

  const finalMemory = getMemoryUsage();
  const diff = finalMemory - initialMemory;

  console.log(`  Initial: ${formatMemory(initialMemory)}`);
  console.log(`  Final: ${formatMemory(finalMemory)}`);
  console.log(`  Diff: ${formatMemory(diff)}`);
  console.log(`  Status: ${diff < 5 * 1024 * 1024 ? '✅ PASS' : '⚠️ CHECK'}`);
}

async function runMemoryTests(): Promise<void> {
  console.log('\n🧪 Sthira Memory Leak Tests\n');
  console.log('='.repeat(50));

  await testSubscriberCleanup();
  await testStoreCreationDestroy();
  await testEventListenerCleanup();

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Memory tests complete\n');
}

runMemoryTests();
