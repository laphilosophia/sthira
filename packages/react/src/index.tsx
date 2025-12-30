import {
  Authority,
  Scope,
  createAuthority,
  createScope,
  createTask,
  type AuthorityConfig,
  type ScopeConfig,
  type TaskContext,
  type TaskFactory,
  type TaskRunOptions,
} from '@sthira/core'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// AUTHORITY CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const AuthorityContext = createContext<Authority | null>(null)

/**
 * Provider for Authority context.
 *
 * Wrap your app with this provider to use Sthira hooks.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AuthorityProvider config={{ engine: { maxWorkers: 4 } }}>
 *       <Dashboard />
 *     </AuthorityProvider>
 *   )
 * }
 * ```
 */
export function AuthorityProvider({
  children,
  config = {},
}: {
  children: ReactNode
  config?: AuthorityConfig
}): ReactElement {
  const authorityRef = useRef<Authority | null>(null)

  authorityRef.current ??= createAuthority(config)

  useEffect(() => {
    return () => {
      authorityRef.current?.dispose()
    }
  }, [])

  return (
    <AuthorityContext.Provider value={authorityRef.current}>
      {children}
    </AuthorityContext.Provider>
  )
}

/**
 * Get the Authority instance from context.
 *
 * @throws If used outside AuthorityProvider
 */
export function useAuthority(): Authority {
  const authority = useContext(AuthorityContext)
  if (!authority) {
    throw new Error('useAuthority must be used within an AuthorityProvider')
  }
  return authority
}

// ═══════════════════════════════════════════════════════════════════════════
// SCOPE CONTEXT (Auto-Subscribe Model)
// ═══════════════════════════════════════════════════════════════════════════

const ScopeContext = createContext<Scope | null>(null)

/**
 * Provider for Scope context.
 *
 * Tasks inside this provider automatically bind to this scope.
 * Nested ScopeProviders create isolated execution lanes.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <ScopeProvider id="dashboard" name="Dashboard">
 *       <Header />
 *       <DataTable />  // Auto-bound to dashboard scope
 *     </ScopeProvider>
 *   )
 * }
 * ```
 */
export function ScopeProvider({
  children,
  id,
  name,
  workers,
}: {
  children: ReactNode
  /** Scope id — unique registry key */
  id: string
  /** Scope name — for logs/DevTools */
  name: string
  /** Worker count override (optional) */
  workers?: number
}): ReactElement {
  const authority = useAuthority()

  const scope = useMemo(() => {
    const config: ScopeConfig = { id, name }
    if (workers !== undefined) {
      Object.assign(config, { engine: { workers } })
    }
    const s = createScope(authority)(config)
    s.mount()
    return s
  }, [authority, id, name, workers])

  useEffect(() => {
    return () => {
      scope.dispose()
      authority.unregisterScope(id)
    }
  }, [scope, authority, id])

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
}

/**
 * Get the current Scope from context.
 *
 * @throws If used outside ScopeProvider
 */
export function useScope(): Scope {
  const scope = useContext(ScopeContext)
  if (!scope) {
    throw new Error('useScope must be used within a ScopeProvider')
  }
  return scope
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK HOOK (Auto-bound to parent Scope)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a TaskFactory bound to the current scope.
 *
 * Automatically uses the nearest parent ScopeProvider.
 *
 * @example
 * ```tsx
 * function DataProcessor() {
 *   const task = useTask()
 *
 *   // Light execution
 *   const value = task.effect(() => calculate())
 *
 *   // Heavy execution
 *   const handleClick = async () => {
 *     const result = await task.run(async (ctx) => {
 *       return processData(ctx.signal)
 *     })
 *   }
 * }
 * ```
 */
export function useTask(): TaskFactory {
  const scope = useScope()
  return useMemo(() => createTask(scope), [scope])
}

// ═══════════════════════════════════════════════════════════════════════════
// ASYNC EXECUTION HOOK (Auto-bound to parent Scope)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * State for async execution.
 */
export interface UseRunState<T> {
  /** Current data */
  data: T | null
  /** Loading state */
  loading: boolean
  /** Error if execution failed */
  error: Error | null
  /** Execute the task */
  execute: () => Promise<T>
}

/**
 * Execute an async task with loading/error state management.
 *
 * Automatically binds to the nearest parent ScopeProvider.
 *
 * @param fn - Task function
 * @param options - Task options
 * @returns Execution state and trigger
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }) {
 *   const { data, loading, error, execute } = useRun(
 *     async (ctx) => {
 *       const response = await fetch(`/api/users/${userId}`, {
 *         signal: ctx.signal
 *       })
 *       return response.json()
 *     }
 *   )
 *
 *   useEffect(() => { execute() }, [userId])
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *   return <UserCard user={data} />
 * }
 * ```
 */
export function useRun<T>(
  fn: (ctx: TaskContext) => Promise<T>,
  options?: TaskRunOptions
): UseRunState<T> {
  const scope = useScope()

  const stateRef = useRef<{
    data: T | null
    loading: boolean
    error: Error | null
    version: number
  }>({
    data: null,
    loading: false,
    error: null,
    version: 0,
  })

  const listenersRef = useRef(new Set<() => void>())

  const subscribe = (listener: () => void) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }

  const getSnapshot = (): typeof stateRef.current => stateRef.current

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const notify = (): void => {
    stateRef.current = {
      ...stateRef.current,
      version: stateRef.current.version + 1,
    }
    listenersRef.current.forEach((l) => {
      l()
    })
  }

  const execute = async (): Promise<T> => {
    stateRef.current = { ...stateRef.current, loading: true, error: null }
    notify()

    try {
      const result = await scope.run(fn, options)
      stateRef.current = { ...stateRef.current, data: result, loading: false }
      notify()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      stateRef.current = { ...stateRef.current, error, loading: false }
      notify()
      throw error
    }
  }

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BROADCAST HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to Authority broadcast channel.
 *
 * @param channel - Channel name
 * @param handler - Handler function
 *
 * @example
 * ```tsx
 * function NotificationListener() {
 *   useBroadcast('notification', (data) => {
 *     toast.show(data.message)
 *   })
 *
 *   return null
 * }
 * ```
 */
export function useBroadcast(
  channel: string,
  handler: (data: unknown) => void
): void {
  const authority = useAuthority()

  useEffect(() => {
    return authority.subscribe(channel, handler)
  }, [authority, channel, handler])
}

/**
 * Broadcast to all listeners on a channel.
 *
 * @returns Broadcast function
 *
 * @example
 * ```tsx
 * function UserEditor() {
 *   const broadcast = useBroadcaster()
 *
 *   const handleSave = () => {
 *     broadcast('user-updated', { id: 1, name: 'John' })
 *   }
 * }
 * ```
 */
export function useBroadcaster(): (channel: string, data: unknown) => void {
  const authority = useAuthority()
  return (channel, data) => {
    authority.broadcast(channel, data)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type {
  Authority,
  AuthorityConfig,
  Scope,
  ScopeConfig,
  TaskContext,
  TaskFactory,
  TaskRunOptions,
}
