import { createStore } from '@sthira/core'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createInspector } from '../src/inspector'
import { createDevToolsPlugin, isDevToolsAvailable } from '../src/plugin'

describe('isDevToolsAvailable', () => {
  it('should return false in Node.js (no window)', () => {
    expect(isDevToolsAvailable()).toBe(false)
  })
})

describe('createDevToolsPlugin', () => {
  const schema = z.object({
    count: z.number(),
    name: z.string(),
  })

  it('should create devtools plugin with API', () => {
    const plugin = createDevToolsPlugin({
      name: 'test-store',
    })

    expect(plugin.name).toBe('devtools')
    expect(plugin.api).toBeDefined()
    expect(plugin.api.exportState).toBeInstanceOf(Function)
    expect(plugin.api.importState).toBeInstanceOf(Function)
  })

  it('should export state as JSON', () => {
    const store = createStore({
      name: 'export-test',
      schema,
      state: { count: 42, name: 'exported' },
      plugins: [createDevToolsPlugin({})],
    })

    const exported = (store as any).devtools.exportState()
    const parsed = JSON.parse(exported)

    expect(parsed.state.count).toBe(42)
    expect(parsed.state.name).toBe('exported')
    expect(parsed.timestamp).toBeDefined()
  })

  it('should import state from JSON', () => {
    const store = createStore({
      name: 'import-test',
      schema,
      state: { count: 0, name: 'initial' },
      plugins: [createDevToolsPlugin({})],
    })

    ;(store as any).devtools.importState(
      JSON.stringify({
        state: { count: 100, name: 'imported' },
      })
    )

    expect((store.getState() as { count: number }).count).toBe(100)
    expect((store.getState() as { name: string }).name).toBe('imported')
  })

  it('should integrate with store', async () => {
    const store = createStore({
      name: 'devtools-plugin-test',
      schema,
      state: { count: 0, name: 'test' },
      plugins: [createDevToolsPlugin({ name: 'test' })],
    })

    // Plugin should have extended the store
    expect((store as any).devtools).toBeDefined()

    // API should be accessible
    const exported = (store as any).devtools.exportState()
    expect(typeof exported).toBe('string')
  })
})

describe('StoreInspector', () => {
  const schema = z.object({
    count: z.number(),
    items: z.array(z.string()),
  })

  it('should create inspector', () => {
    const store = createStore({
      name: 'inspect-test',
      schema,
      state: { count: 0, items: [] },
    })

    const inspector = createInspector(store)

    expect(inspector.inspect).toBeDefined()
    expect(inspector.getHistory).toBeDefined()
    expect(inspector.diff).toBeDefined()
  })

  it('should inspect current state', () => {
    const store = createStore({
      name: 'inspect-test',
      schema,
      state: { count: 5, items: ['a', 'b'] },
    })

    const inspector = createInspector(store)
    const inspected = inspector.inspect()

    expect(inspected.state).toEqual({ count: 5, items: ['a', 'b'] })
    expect(inspected.actions).toBeDefined()
  })

  it('should track state history', async () => {
    const store = createStore({
      name: 'history-test',
      schema,
      state: { count: 0, items: [] },
    })

    const inspector = createInspector(store)

    store.setState({ count: 1 })
    store.setState({ count: 2 })
    store.setState({ count: 3 })

    const history = inspector.getHistory()

    expect(history.length).toBe(3)
    expect((history[0]?.state as { count: number }).count).toBe(1)
    expect((history[2]?.state as { count: number }).count).toBe(3)
  })

  it('should diff two states', () => {
    const store = createStore({
      name: 'diff-test',
      schema,
      state: { count: 0, items: [] },
    })

    const inspector = createInspector(store)

    const oldState = { count: 1, items: ['a'] }
    const newState = { count: 2, items: ['a', 'b'] }

    const diffs = inspector.diff(oldState, newState)

    expect(diffs.length).toBeGreaterThan(0)
    expect(diffs.some((d) => d.path.includes('count'))).toBe(true)
  })

  it('should format state as JSON', () => {
    const store = createStore({
      name: 'format-test',
      schema,
      state: { count: 42, items: ['x'] },
    })

    const inspector = createInspector(store)
    const formatted = inspector.formatState()

    expect(formatted).toContain('"count": 42')
    expect(formatted).toContain('"items"')
  })

  it('should clear history', () => {
    const store = createStore({
      name: 'clear-test',
      schema,
      state: { count: 0, items: [] },
    })

    const inspector = createInspector(store)

    store.setState({ count: 1 })
    store.setState({ count: 2 })

    expect(inspector.getHistory().length).toBe(2)

    inspector.clearHistory()

    expect(inspector.getHistory().length).toBe(0)
  })
})
