import type { AsyncState, AsyncStatus } from './types';
import { ASYNC_TRANSITIONS } from './types';

/**
 * Create initial async state
 */
export function createAsyncState<TData, TError = Error>(): AsyncState<TData, TError> {
  return {
    status: 'idle',
    data: undefined,
    error: undefined,
    dataUpdatedAt: null,
    errorUpdatedAt: null,
    isFetching: false,
    isRefetching: false,
    fetchCount: 0,
  };
}

/**
 * Finite State Machine for async state transitions
 */
export class AsyncStateMachine<TData, TError = Error> {
  private state: AsyncState<TData, TError>;
  private listeners = new Set<(state: AsyncState<TData, TError>) => void>();

  constructor(initialState?: Partial<AsyncState<TData, TError>>) {
    this.state = {
      ...createAsyncState<TData, TError>(),
      ...initialState,
    };
  }

  /**
   * Get current state
   */
  getState(): AsyncState<TData, TError> {
    return this.state;
  }

  /**
   * Check if transition is valid
   */
  canTransition(to: AsyncStatus): boolean {
    const allowed = ASYNC_TRANSITIONS[this.state.status];
    return allowed?.includes(to) ?? false;
  }

  /**
   * Transition to a new status
   */
  transition(
    to: AsyncStatus,
    payload?: Partial<Omit<AsyncState<TData, TError>, 'status'>>,
  ): boolean {
    if (!this.canTransition(to)) {
      console.warn(`[Sthira FSM] Invalid transition: ${this.state.status} -> ${to}`);
      return false;
    }

    // Previous state stored for potential future use (event emission, debugging)
    const _prevState = this.state;
    void _prevState; // Acknowledge intentionally unused

    this.state = {
      ...this.state,
      ...payload,
      status: to,
    };

    this.notifyListeners();
    return true;
  }

  /**
   * Set loading state
   */
  setLoading(): void {
    const isRefetching = this.state.data !== undefined;

    this.transition('loading', {
      isFetching: true,
      isRefetching,
      fetchCount: this.state.fetchCount + 1,
    });
  }

  /**
   * Set success state
   */
  setSuccess(data: TData): void {
    this.transition('success', {
      data,
      error: undefined,
      dataUpdatedAt: Date.now(),
      isFetching: false,
      isRefetching: false,
    });
  }

  /**
   * Set error state
   */
  setError(error: TError): void {
    this.transition('error', {
      error,
      errorUpdatedAt: Date.now(),
      isFetching: false,
      isRefetching: false,
    });
  }

  /**
   * Set stale state
   */
  setStale(): void {
    if (this.state.status === 'success') {
      this.transition('stale');
    }
  }

  /**
   * Reset to idle
   */
  reset(): void {
    this.state = createAsyncState<TData, TError>();
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AsyncState<TData, TError>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // ============================================================================
  // Derived State (TanStack Query-like)
  // ============================================================================

  /**
   * Is loading (no data yet)
   */
  get isLoading(): boolean {
    return this.state.status === 'loading' && this.state.data === undefined;
  }

  /**
   * Is loading with error (no data, but has error)
   */
  get isLoadingError(): boolean {
    return this.state.status === 'error' && this.state.data === undefined;
  }

  /**
   * Is success
   */
  get isSuccess(): boolean {
    return this.state.status === 'success';
  }

  /**
   * Is error
   */
  get isError(): boolean {
    return this.state.status === 'error';
  }

  /**
   * Is stale
   */
  get isStale(): boolean {
    return this.state.status === 'stale';
  }

  /**
   * Is fetching (includes refetching)
   */
  get isFetching(): boolean {
    return this.state.isFetching;
  }

  /**
   * Is refetching (fetching with existing data)
   */
  get isRefetching(): boolean {
    return this.state.isRefetching;
  }

  /**
   * Has data
   */
  get hasData(): boolean {
    return this.state.data !== undefined;
  }
}

/**
 * Check if data is stale based on staleTime
 */
export function isDataStale(dataUpdatedAt: number | null, staleTime: number): boolean {
  if (dataUpdatedAt === null) return true;
  return Date.now() - dataUpdatedAt > staleTime;
}
