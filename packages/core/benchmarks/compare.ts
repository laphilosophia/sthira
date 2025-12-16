/**
 * Sthira Comparative Benchmarks
 * Phase 15: vs Zustand, Jotai
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { atom, createStore as createJotaiStore } from 'jotai'
import { create as createZustand } from 'zustand'
import { createStore as createSthira } from '../src/store'

// Benchmark helper
function benchmark(name: string, fn: () => void, iterations = 10000): number {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  return end - start
}

interface BenchResult {
  name: string
  sthira: number
  zustand: number
  jotai: number
}

const results: BenchResult[] = []

// ============================================================================
// Benchmark 1: Store Creation
// ============================================================================
function benchStoreCreation(): void {
  const iterations = 1000

  const sthira = benchmark(
    'Sthira',
    () => {
      createSthira({ name: 'bench', state: { count: 0 } })
    },
    iterations
  )

  const zustand = benchmark(
    'Zustand',
    () => {
      createZustand(() => ({ count: 0 }))
    },
    iterations
  )

  const jotai = benchmark(
    'Jotai',
    () => {
      const countAtom = atom(0)
      const store = createJotaiStore()
      store.get(countAtom)
    },
    iterations
  )

  results.push({ name: 'Store Creation', sthira, zustand, jotai })
}

// ============================================================================
// Benchmark 2: State Update
// ============================================================================
function benchStateUpdate(): void {
  const iterations = 10000

  // Sthira
  const sthiraStore = createSthira({ name: 'update', state: { count: 0 } })
  const sthira = benchmark(
    'Sthira',
    () => {
      sthiraStore.setState({ count: (sthiraStore.getState() as any).count + 1 })
    },
    iterations
  )

  // Zustand
  const zustandStore = createZustand<{ count: number; inc: () => void }>((set) => ({
    count: 0,
    inc: () => set((s) => ({ count: s.count + 1 })),
  }))
  const zustand = benchmark(
    'Zustand',
    () => {
      zustandStore.getState().inc()
    },
    iterations
  )

  // Jotai
  const countAtom = atom(0)
  const jotaiStore = createJotaiStore()
  const jotai = benchmark(
    'Jotai',
    () => {
      const current = jotaiStore.get(countAtom)
      jotaiStore.set(countAtom, current + 1)
    },
    iterations
  )

  results.push({ name: 'State Update', sthira, zustand, jotai })
}

// ============================================================================
// Benchmark 3: Subscriber Notification
// ============================================================================
function benchSubscribers(): void {
  const iterations = 10000
  const subscriberCount = 10

  // Sthira
  const sthiraStore = createSthira({ name: 'subs', state: { count: 0 } })
  for (let i = 0; i < subscriberCount; i++) {
    sthiraStore.subscribe(() => {})
  }
  const sthira = benchmark(
    'Sthira',
    () => {
      sthiraStore.setState({ count: (sthiraStore.getState() as any).count + 1 })
    },
    iterations
  )

  // Zustand
  const zustandStore = createZustand<{ count: number }>(() => ({ count: 0 }))
  for (let i = 0; i < subscriberCount; i++) {
    zustandStore.subscribe(() => {})
  }
  const zustand = benchmark(
    'Zustand',
    () => {
      zustandStore.setState((s) => ({ count: s.count + 1 }))
    },
    iterations
  )

  // Jotai
  const countAtom = atom(0)
  const jotaiStore = createJotaiStore()
  for (let i = 0; i < subscriberCount; i++) {
    jotaiStore.sub(countAtom, () => {})
  }
  const jotai = benchmark(
    'Jotai',
    () => {
      const current = jotaiStore.get(countAtom)
      jotaiStore.set(countAtom, current + 1)
    },
    iterations
  )

  results.push({ name: `Subscribers (${subscriberCount})`, sthira, zustand, jotai })
}

// ============================================================================
// Benchmark 4: Read Performance
// ============================================================================
function benchRead(): void {
  const iterations = 100000

  // Sthira
  const sthiraStore = createSthira({ name: 'read', state: { count: 0 } })
  const sthira = benchmark(
    'Sthira',
    () => {
      sthiraStore.getState()
    },
    iterations
  )

  // Zustand
  const zustandStore = createZustand(() => ({ count: 0 }))
  const zustand = benchmark(
    'Zustand',
    () => {
      zustandStore.getState()
    },
    iterations
  )

  // Jotai
  const countAtom = atom(0)
  const jotaiStore = createJotaiStore()
  const jotai = benchmark(
    'Jotai',
    () => {
      jotaiStore.get(countAtom)
    },
    iterations
  )

  results.push({ name: 'Read State', sthira, zustand, jotai })
}

// ============================================================================
// Run & Report
// ============================================================================
function printResults(): void {
  console.log('\n📊 Comparative Benchmarks: Sthira vs Zustand vs Jotai\n')
  console.log('='.repeat(70))
  console.log(
    '| Operation'.padEnd(25) +
      '| Sthira'.padEnd(12) +
      '| Zustand'.padEnd(12) +
      '| Jotai'.padEnd(12) +
      '| Winner'
  )
  console.log('-'.repeat(70))

  for (const r of results) {
    const min = Math.min(r.sthira, r.zustand, r.jotai)
    const winner = r.sthira === min ? 'Sthira' : r.zustand === min ? 'Zustand' : 'Jotai'
    console.log(
      `| ${r.name}`.padEnd(25) +
        `| ${r.sthira.toFixed(2)}ms`.padEnd(12) +
        `| ${r.zustand.toFixed(2)}ms`.padEnd(12) +
        `| ${r.jotai.toFixed(2)}ms`.padEnd(12) +
        `| ${winner}`
    )
  }

  console.log('='.repeat(70))
  console.log('\n✅ Benchmarks complete\n')
}

// Run all
benchStoreCreation()
benchStateUpdate()
benchSubscribers()
benchRead()
printResults()
