import { describe, expect, it, vi } from 'vitest';
import { batch, computed, effect, isComputed, isSignal, signal, untracked } from '../src';

describe('Signal Primitives', () => {
  describe('signal()', () => {
    it('should create a signal with initial value', () => {
      const count = signal(0);
      expect(count.get()).toBe(0);
    });

    it('should update value with set()', () => {
      const count = signal(0);
      count.set(5);
      expect(count.get()).toBe(5);
    });

    it('should update value with update()', () => {
      const count = signal(10);
      count.update((n) => n * 2);
      expect(count.get()).toBe(20);
    });

    it('should skip update if value unchanged', () => {
      const count = signal(5);
      const subscriber = vi.fn();
      count.subscribe(subscriber);

      count.set(5); // Same value

      // Wait for microtask
      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(subscriber).not.toHaveBeenCalled();
          resolve(undefined);
        });
      });
    });

    it('should notify subscribers on value change', () => {
      const count = signal(0);
      const subscriber = vi.fn();
      count.subscribe(subscriber);

      count.set(1);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(subscriber).toHaveBeenCalledWith(1);
          resolve(undefined);
        });
      });
    });

    it('should return unsubscribe function', () => {
      const count = signal(0);
      const subscriber = vi.fn();
      const unsubscribe = count.subscribe(subscriber);

      unsubscribe();
      count.set(1);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(subscriber).not.toHaveBeenCalled();
          resolve(undefined);
        });
      });
    });

    it('peek() should get value without tracking', () => {
      const count = signal(5);
      expect(count.peek()).toBe(5);
    });

    it('isSignal() should identify signals', () => {
      const s = signal(0);
      expect(isSignal(s)).toBe(true);
      expect(isSignal({})).toBe(false);
    });
  });

  describe('computed()', () => {
    it('should compute derived value', () => {
      const count = signal(5);
      const double = computed(() => count.get() * 2);

      expect(double.get()).toBe(10);
    });

    it('should be lazy (compute only on access)', () => {
      const fn = vi.fn(() => 42);
      const c = computed(fn);

      expect(fn).not.toHaveBeenCalled();
      c.get();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should memoize result', () => {
      const count = signal(5);
      const fn = vi.fn(() => count.get() * 2);
      const double = computed(fn);

      double.get();
      double.get();
      double.get();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should recompute when dependency changes', () => {
      const count = signal(5);
      const double = computed(() => count.get() * 2);

      expect(double.get()).toBe(10);

      count.set(10);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(double.get()).toBe(20);
          resolve(undefined);
        });
      });
    });

    it('should track multiple dependencies', () => {
      const a = signal(2);
      const b = signal(3);
      const sum = computed(() => a.get() + b.get());

      expect(sum.get()).toBe(5);

      a.set(10);
      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(sum.get()).toBe(13);

          b.set(7);
          queueMicrotask(() => {
            expect(sum.get()).toBe(17);
            resolve(undefined);
          });
        });
      });
    });

    it('should support nested computed', () => {
      const count = signal(2);
      const double = computed(() => count.get() * 2);
      const quadruple = computed(() => double.get() * 2);

      expect(quadruple.get()).toBe(8);

      count.set(5);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(quadruple.get()).toBe(20);
          resolve(undefined);
        });
      });
    });

    it('isComputed() should identify computed', () => {
      const c = computed(() => 42);
      expect(isComputed(c)).toBe(true);
      expect(isComputed(signal(0))).toBe(false);
    });
  });

  describe('effect()', () => {
    it('should run immediately', () => {
      const fn = vi.fn();
      effect(fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track dependencies and re-run', () => {
      const count = signal(0);
      const fn = vi.fn(() => {
        count.get();
      });

      effect(fn);
      expect(fn).toHaveBeenCalledTimes(1);

      count.set(1);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          // Effect runs in microtask, need another microtask
          queueMicrotask(() => {
            expect(fn).toHaveBeenCalledTimes(2);
            resolve(undefined);
          });
        });
      });
    });

    it('should run cleanup on re-run', () => {
      const count = signal(0);
      const cleanup = vi.fn();

      effect(() => {
        count.get();
        return cleanup;
      });

      expect(cleanup).not.toHaveBeenCalled();

      count.set(1);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          // Effect runs in microtask, so we need another microtask to see the result
          queueMicrotask(() => {
            expect(cleanup).toHaveBeenCalledTimes(1);
            resolve(undefined);
          });
        });
      });
    });

    it('should stop on dispose', () => {
      const count = signal(0);
      const fn = vi.fn(() => {
        count.get();
      });

      const dispose = effect(fn);
      dispose();

      count.set(1);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(fn).toHaveBeenCalledTimes(1); // Only initial run
          resolve(undefined);
        });
      });
    });

    it('should run cleanup on dispose', () => {
      const cleanup = vi.fn();
      const dispose = effect(() => cleanup);

      dispose();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('batch()', () => {
    it('should batch multiple updates', () => {
      const count = signal(0);
      const subscriber = vi.fn();
      count.subscribe(subscriber);

      batch(() => {
        count.set(1);
        count.set(2);
        count.set(3);
      });

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(subscriber).toHaveBeenCalledTimes(1);
          expect(subscriber).toHaveBeenCalledWith(3);
          resolve(undefined);
        });
      });
    });

    it('should work with computed', () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a.get() + b.get());

      batch(() => {
        a.set(10);
        b.set(20);
      });

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(sum.get()).toBe(30);
          resolve(undefined);
        });
      });
    });

    it('should support nested batches', () => {
      const count = signal(0);
      const subscriber = vi.fn();
      count.subscribe(subscriber);

      batch(() => {
        count.set(1);
        batch(() => {
          count.set(2);
        });
        count.set(3);
      });

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(subscriber).toHaveBeenCalledTimes(1);
          resolve(undefined);
        });
      });
    });

    it('should return value from batch function', () => {
      const result = batch(() => {
        return 42;
      });
      expect(result).toBe(42);
    });
  });

  describe('untracked()', () => {
    it('should not track dependencies inside untracked', () => {
      const tracked = signal(0);
      const untracked_ = signal(0);
      const fn = vi.fn(() => {
        tracked.get();
        untracked(() => untracked_.get());
      });

      effect(fn);
      expect(fn).toHaveBeenCalledTimes(1);

      // Change untracked signal - effect should NOT re-run
      untracked_.set(1);

      return new Promise((resolve) => {
        queueMicrotask(() => {
          expect(fn).toHaveBeenCalledTimes(1);

          // Change tracked signal - effect SHOULD re-run
          tracked.set(1);
          queueMicrotask(() => {
            // Effect runs in microtask, so need another microtask
            queueMicrotask(() => {
              expect(fn).toHaveBeenCalledTimes(2);
              resolve(undefined);
            });
          });
        });
      });
    });
  });
});
