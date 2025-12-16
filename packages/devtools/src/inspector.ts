import type { Store } from '@sthira/core';
import type { InspectedState, StateDiff } from './types';

/**
 * State inspector for debugging stores
 */
export class StoreInspector<TState extends object, TActions extends object> {
  private store: Store<TState, TActions>;
  private stateHistory: { state: TState; timestamp: number }[] = [];
  private maxHistory: number;

  constructor(store: Store<TState, TActions>, maxHistory = 100) {
    this.store = store;
    this.maxHistory = maxHistory;
    this.startTracking();
  }

  /**
   * Start tracking state changes
   */
  private startTracking(): void {
    this.store.subscribe((state) => {
      this.stateHistory.push({
        state: structuredClone(state) as TState,
        timestamp: Date.now(),
      });

      // Trim history
      while (this.stateHistory.length > this.maxHistory) {
        this.stateHistory.shift();
      }
    });
  }

  /**
   * Get current inspected state
   */
  inspect(): InspectedState {
    return {
      state: this.store.getState(),
      computed: this.store.computed as Record<string, unknown>,
      subscribers: 0, // Would need exposure from core
      actions: Object.keys(this.store.actions),
    };
  }

  /**
   * Get state history
   */
  getHistory(): { state: TState; timestamp: number }[] {
    return [...this.stateHistory];
  }

  /**
   * Get state at specific time
   */
  getStateAt(timestamp: number): TState | undefined {
    // Find closest state before or at timestamp
    for (let i = this.stateHistory.length - 1; i >= 0; i--) {
      const entry = this.stateHistory[i];
      if (entry && entry.timestamp <= timestamp) {
        return entry.state;
      }
    }
    return undefined;
  }

  /**
   * Compare two states and get diff
   */
  diff(oldState: TState, newState: TState): StateDiff[] {
    const diffs: StateDiff[] = [];
    this.diffRecursive(oldState, newState, [], diffs);
    return diffs;
  }

  /**
   * Recursive diff helper
   */
  private diffRecursive(
    oldVal: unknown,
    newVal: unknown,
    path: string[],
    diffs: StateDiff[],
  ): void {
    if (oldVal === newVal) return;

    if (
      typeof oldVal !== 'object' ||
      typeof newVal !== 'object' ||
      oldVal === null ||
      newVal === null ||
      Array.isArray(oldVal) !== Array.isArray(newVal)
    ) {
      diffs.push({ path, oldValue: oldVal, newValue: newVal });
      return;
    }

    const oldObj = oldVal as Record<string, unknown>;
    const newObj = newVal as Record<string, unknown>;

    // Check all keys
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      this.diffRecursive(oldObj[key], newObj[key], [...path, key], diffs);
    }
  }

  /**
   * Get computed values
   */
  getComputed(): Record<string, unknown> {
    return this.store.computed as Record<string, unknown>;
  }

  /**
   * Get action names
   */
  getActions(): string[] {
    return Object.keys(this.store.actions);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.stateHistory = [];
  }

  /**
   * Format state for display (JSON with indentation)
   */
  formatState(state: unknown = this.store.getState()): string {
    return JSON.stringify(state, null, 2);
  }
}

/**
 * Create inspector for a store
 */
export function createInspector<TState extends object, TActions extends object>(
  store: Store<TState, TActions>,
  maxHistory = 100,
): StoreInspector<TState, TActions> {
  return new StoreInspector(store, maxHistory);
}
