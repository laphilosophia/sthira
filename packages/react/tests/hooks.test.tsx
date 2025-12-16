import { createStore } from '@sthira/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { shallowEqual, useSelector, useStore, useStoreActions, useStoreState } from '../src/hooks';

// Test store schema
const counterSchema = z.object({
  count: z.number(),
  name: z.string(),
});

// Helper to create test store
function createTestStore(initialState = { count: 0, name: 'test' }) {
  return createStore({
    name: 'counter',
    schema: counterSchema,
    state: initialState,
    actions: (set, get) => ({
      increment: () => set({ count: get().count + 1 }),
      decrement: () => set({ count: get().count - 1 }),
      setName: (name: string) => set({ name }),
    }),
  });
}

describe('useStore', () => {
  it('should return state and actions', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useStore(store));

    expect(result.current.count).toBe(0);
    expect(result.current.name).toBe('test');
    expect(typeof result.current.increment).toBe('function');
    expect(typeof result.current.decrement).toBe('function');
  });

  it('should update when state changes', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useStore(store));

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should provide getState and subscribe', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useStore(store));

    expect(typeof result.current.getState).toBe('function');
    expect(typeof result.current.subscribe).toBe('function');
    expect(result.current.getState()).toEqual({ count: 0, name: 'test' });
  });
});

describe('useSelector', () => {
  it('should select a slice of state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSelector(store, (s) => s.count));

    expect(result.current).toBe(0);
  });

  it('should update when selected value changes', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useSelector(store, (s) => s.count));

    expect(result.current).toBe(0);

    act(() => {
      store.setState({ count: 5 });
    });

    expect(result.current).toBe(5);
  });

  it('should not update when unrelated state changes', () => {
    const store = createTestStore();
    const renderCount = { current: 0 };

    const { result } = renderHook(() => {
      renderCount.current++;
      return useSelector(store, (s) => s.count);
    });

    expect(result.current).toBe(0);
    expect(renderCount.current).toBe(1);

    act(() => {
      store.setState({ name: 'changed' });
    });

    // Should not re-render since count didn't change
    expect(renderCount.current).toBe(1);
    expect(result.current).toBe(0);
  });

  it('should use custom equality function', () => {
    const store = createTestStore();
    const { result } = renderHook(() =>
      useSelector(store, (s) => ({ count: s.count }), shallowEqual),
    );

    expect(result.current).toEqual({ count: 0 });
  });
});

describe('useStoreState', () => {
  it('should return only state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useStoreState(store));

    expect(result.current).toEqual({ count: 0, name: 'test' });
    expect((result.current as Record<string, unknown>).increment).toBeUndefined();
  });

  it('should update when state changes', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useStoreState(store));

    act(() => {
      store.setState({ count: 10 });
    });

    expect(result.current.count).toBe(10);
  });
});

describe('useStoreActions', () => {
  it('should return only actions', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useStoreActions(store));

    expect(typeof result.current.increment).toBe('function');
    expect(typeof result.current.decrement).toBe('function');
    expect(typeof result.current.setName).toBe('function');
    expect((result.current as Record<string, unknown>).count).toBeUndefined();
  });

  it('should not re-render when state changes', () => {
    const store = createTestStore();
    const renderCount = { current: 0 };

    renderHook(() => {
      renderCount.current++;
      return useStoreActions(store);
    });

    expect(renderCount.current).toBe(1);

    act(() => {
      store.setState({ count: 100 });
    });

    // Actions hook should not cause re-render
    expect(renderCount.current).toBe(1);
  });
});

describe('shallowEqual', () => {
  it('should return true for equal objects', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('should return true for same reference', () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('should return false for nested objects', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });
});
