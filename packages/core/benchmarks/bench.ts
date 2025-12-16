/**
 * Sthira Performance Benchmarks
 * Phase 13: Retrospective
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createStore } from '../src/store'

// Benchmark helper
function benchmark(name: string, fn: () => void, iterations = 10000): void {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  const total = end - start
  const perOp = (total / iterations).toFixed(4)
  console.log(`${name}: ${total.toFixed(2)}ms total, ${perOp}ms/op (${iterations} iterations)`)
}

// Store creation benchmark
function benchStoreCreation(): void {
  benchmark(
    'Store Creation',
    () => {
      createStore({
        name: 'bench',
        state: { count: 0, items: [] as number[] },
      })
    },
    1000
  )
}

// State update benchmark
function benchStateUpdate(): void {
  const store = createStore({
    name: 'bench',
    state: { count: 0 },
  })

  benchmark('setState (simple)', () => {
    store.setState({ count: (store.getState() as any).count + 1 })
  })
}

// Subscriber notification benchmark
function benchSubscribers(): void {
  const store = createStore({
    name: 'bench',
    state: { count: 0 },
  })

  // Add 10 subscribers
  for (let i = 0; i < 10; i++) {
    store.subscribe(() => {})
  }

  benchmark('setState (10 subscribers)', () => {
    store.setState({ count: (store.getState() as any).count + 1 })
  })
}

// Computed values benchmark
function benchComputed(): void {
  const store = createStore({
    name: 'bench',
    state: { count: 0 },
    computed: {
      doubled: (s) => (s as { count: number }).count * 2,
      tripled: (s) => (s as { count: number }).count * 3,
    },
  })

  benchmark('getComputed', () => {
    store.getComputed()
  })
}

// Large state benchmark
function benchLargeState(): void {
  interface LargeItem {
    id: number
    name: string
    data: { nested: { value: number } }
  }

  const largeState = {
    items: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      data: { nested: { value: i } },
    })) as LargeItem[],
  }

  const store = createStore({
    name: 'bench-large',
    state: largeState,
  })

  benchmark(
    'setState (large state)',
    () => {
      store.setState({ items: (store.getState() as any).items })
    },
    1000
  )
}

// Run all benchmarks
export function runBenchmarks(): void {
  console.log('\n🚀 Sthira Performance Benchmarks\n')
  console.log('='.repeat(60))

  benchStoreCreation()
  benchStateUpdate()
  benchSubscribers()
  benchComputed()
  benchLargeState()

  console.log('='.repeat(60))
  console.log('\n✅ Benchmarks complete\n')
}

// Run if executed directly
runBenchmarks()
