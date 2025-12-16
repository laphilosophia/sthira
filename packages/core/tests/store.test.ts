import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSelector, createStore, shallowEqual } from '../src/store';

describe('createStore', () => {
  const schema = z.object({
    count: z.number(),
    name: z.string(),
  });

  it('should create a store with initial state', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: { count: 0, name: 'test' },
    });

    expect(store.getState()).toEqual({ count: 0, name: 'test' });
    expect(store.name).toBe('test');
  });

  it('should create a store with factory function', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: () => ({ count: 10, name: 'factory' }),
    });

    expect(store.getState()).toEqual({ count: 10, name: 'factory' });
  });

  it('should update state with partial', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: { count: 0, name: 'test' },
    });

    store.setState({ count: 5 });
    expect(store.getState()).toEqual({ count: 5, name: 'test' });
  });

  it('should update state with function', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: { count: 0, name: 'test' },
    });

    store.setState((state) => ({ count: state.count + 1 }));
    expect(store.getState().count).toBe(1);
  });

  it('should notify subscribers on state change', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: { count: 0, name: 'test' },
    });

    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'test' }, { count: 0, name: 'test' });
  });

  it('should unsubscribe listener', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: { count: 0, name: 'test' },
    });

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not notify when silent option is true', () => {
    const store = createStore({
      name: 'test',
      schema,
      state: { count: 0, name: 'test' },
    });

    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 }, { silent: true });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().count).toBe(1);
  });
});

describe('createStore with actions', () => {
  const schema = z.object({
    count: z.number(),
  });

  it('should expose actions', () => {
    const store = createStore({
      name: 'counter',
      schema,
      state: { count: 0 },
      actions: (set, get) => ({
        increment: () => set({ count: get().count + 1 }),
        decrement: () => set({ count: get().count - 1 }),
        reset: () => set({ count: 0 }),
      }),
    });

    expect(store.increment).toBeDefined();
    expect(store.decrement).toBeDefined();
    expect(store.reset).toBeDefined();

    store.increment();
    expect(store.getState().count).toBe(1);

    store.decrement();
    expect(store.getState().count).toBe(0);
  });
});

describe('createStore with computed', () => {
  const schema = z.object({
    items: z.array(z.number()),
    multiplier: z.number(),
  });

  it('should compute derived values', () => {
    const store = createStore({
      name: 'computed-test',
      schema,
      state: { items: [1, 2, 3], multiplier: 2 },
      computed: {
        sum: (state) => state.items.reduce((a, b) => a + b, 0),
        doubled: (state, computed) => (computed.sum as number) * state.multiplier,
      },
    });

    const computed = store.getComputed();
    expect(computed.sum).toBe(6);
    expect(computed.doubled).toBe(12);
  });

  it('should invalidate computed on state change', () => {
    const store = createStore({
      name: 'computed-test',
      schema,
      state: { items: [1, 2, 3], multiplier: 2 },
      computed: {
        sum: (state) => state.items.reduce((a, b) => a + b, 0),
      },
    });

    expect(store.getComputed().sum).toBe(6);

    store.setState({ items: [1, 2, 3, 4] });

    expect(store.getComputed().sum).toBe(10);
  });
});

describe('createStore with interceptors', () => {
  const schema = z.object({
    value: z.number(),
  });

  it('should call beforeSet interceptor', () => {
    const beforeSet = vi.fn((path, value) => value);

    const store = createStore({
      name: 'interceptor-test',
      schema,
      state: { value: 0 },
      interceptors: { beforeSet },
    });

    store.setState({ value: 5 });

    expect(beforeSet).toHaveBeenCalledWith(null, { value: 5 }, { value: 0 });
  });

  it('should call afterSet interceptor', () => {
    const afterSet = vi.fn();

    const store = createStore({
      name: 'interceptor-test',
      schema,
      state: { value: 0 },
      interceptors: { afterSet },
    });

    store.setState({ value: 5 });

    expect(afterSet).toHaveBeenCalledWith(null, { value: 5 }, { value: 5 });
  });

  it('should allow beforeSet to transform value', () => {
    const store = createStore({
      name: 'interceptor-test',
      schema,
      state: { value: 0 },
      interceptors: {
        beforeSet: (path, value) => ({ value: (value.value ?? 0) * 2 }),
      },
    });

    store.setState({ value: 5 });

    expect(store.getState().value).toBe(10);
  });

  it('should skip interceptors with option', () => {
    const beforeSet = vi.fn((path, value) => value);

    const store = createStore({
      name: 'interceptor-test',
      schema,
      state: { value: 0 },
      interceptors: { beforeSet },
    });

    store.setState({ value: 5 }, { skipInterceptors: true });

    expect(beforeSet).not.toHaveBeenCalled();
    expect(store.getState().value).toBe(5);
  });
});

describe('shallowEqual', () => {
  it('should return true for identical values', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
  });

  it('should return true for shallow equal objects', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('should return false for nested objects', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });
});

describe('createSelector', () => {
  it('should memoize selector result', () => {
    const state = { count: 5, name: 'test' };
    const selectDouble = createSelector((s: typeof state) => s.count * 2);

    const result1 = selectDouble(state);
    const result2 = selectDouble(state);

    expect(result1).toBe(10);
    expect(result1).toBe(result2);
  });

  it('should recalculate on state change', () => {
    const selectDouble = createSelector((s: { count: number }) => s.count * 2);

    expect(selectDouble({ count: 5 })).toBe(10);
    expect(selectDouble({ count: 10 })).toBe(20);
  });
});
