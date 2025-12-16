import { createStore } from '@sthira/core'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createSyncPlugin } from '../src/plugin'

describe('createSyncPlugin', () => {
  const schema = z.object({
    count: z.number(),
    name: z.string(),
  })

  it('should create sync plugin with API', () => {
    const plugin = createSyncPlugin({
      channel: 'test-channel',
    })

    expect(plugin.name).toBe('sync')
    expect(plugin.api).toBeDefined()
    expect(plugin.api.broadcast).toBeInstanceOf(Function)
    expect(plugin.api.disconnect).toBeInstanceOf(Function)
    expect(plugin.api.getStatus).toBeInstanceOf(Function)
  })

  it('should return status with tabId', () => {
    const plugin = createSyncPlugin({
      channel: 'status-test',
    })

    const status = plugin.api.getStatus()

    expect(status.tabId).toBeDefined()
    expect(typeof status.tabId).toBe('string')
    expect(status.connected).toBe(false) // Not initialized yet
  })

  it('should integrate with store', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'sync-plugin-test',
      schema,
      state: { count: 0, name: 'test' },
      plugins: [
        createSyncPlugin({
          channel: 'sync-test',
        }),
      ],
    })

    // Plugin should have extended the store
    expect((store as any).sync).toBeDefined()

    const status = (store as any).sync.getStatus()
    expect(status).toHaveProperty('connected')
    expect(status).toHaveProperty('tabId')

    warnSpy.mockRestore()
  })

  it('should not throw on API calls before init', () => {
    const plugin = createSyncPlugin({
      channel: 'noop-test',
    })

    expect(() => plugin.api.broadcast()).not.toThrow()
    expect(() => plugin.api.disconnect()).not.toThrow()
  })
})

// Note: Full cross-tab tests require browser environment
// These are basic integration tests for Node.js compatibility
