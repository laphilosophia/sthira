import type { Listener, Unsubscribe } from './types';

/**
 * Deep proxy for fine-grained reactivity
 * Uses Proxy + Reflect pattern inspired by Vue 3 reactivity
 */

type ChangeCallback = () => void;

interface ProxyConfig {
  deep?: boolean;
  onChange?: ChangeCallback;
}

const PROXY_TARGET = Symbol('proxy_target');
const PROXY_RAW = Symbol('proxy_raw');

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Check if value can be made reactive
 */
function isReactive(value: unknown): boolean {
  return isPlainObject(value) || Array.isArray(value);
}

/**
 * Get raw value from proxy
 */
export function toRaw<T>(proxy: T): T {
  const raw = (proxy as Record<symbol, T>)?.[PROXY_RAW];
  return raw ? toRaw(raw) : proxy;
}

/**
 * Check if value is a proxy
 */
export function isProxy(value: unknown): boolean {
  return !!(value && (value as Record<symbol, unknown>)[PROXY_TARGET]);
}

/**
 * Create a deep reactive proxy
 */
export function createReactiveProxy<T extends object>(target: T, config: ProxyConfig = {}): T {
  const { deep = true, onChange } = config;

  // Already a proxy, return as-is
  if (isProxy(target)) {
    return target;
  }

  // WeakMap to cache nested proxies
  const proxyCache = new WeakMap<object, object>();

  function createProxy(obj: object): object {
    // Check cache first
    const cached = proxyCache.get(obj);
    if (cached) return cached;

    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        // Return raw target
        if (prop === PROXY_RAW) return target;
        if (prop === PROXY_TARGET) return true;

        const value = Reflect.get(target, prop, receiver);

        // Deep reactivity for nested objects
        if (deep && isReactive(value) && typeof prop !== 'symbol') {
          return createProxy(value as object);
        }

        return value;
      },

      set(target, prop, value, receiver) {
        const oldValue = Reflect.get(target, prop, receiver);

        // Skip if same value (shallow equality)
        if (Object.is(oldValue, value)) {
          return true;
        }

        const result = Reflect.set(target, prop, value, receiver);

        // Notify on change
        if (result && onChange) {
          onChange();
        }

        return result;
      },

      deleteProperty(target, prop) {
        const hadKey = Reflect.has(target, prop);
        const result = Reflect.deleteProperty(target, prop);

        if (result && hadKey && onChange) {
          onChange();
        }

        return result;
      },
    });

    proxyCache.set(obj, proxy);
    return proxy;
  }

  return createProxy(target) as T;
}

/**
 * Subscription manager for state changes
 */
export class SubscriptionManager<TState> {
  private listeners = new Set<Listener<TState>>();
  private batchedNotifications: Array<{ state: TState; prevState: TState }> = [];
  private isBatching = false;
  private notifyScheduled = false;

  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener<TState>): Unsubscribe {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notify(state: TState, prevState: TState): void {
    if (this.isBatching) {
      // Store for later batch notification
      this.batchedNotifications.push({ state, prevState });
      this.scheduleNotify();
      return;
    }

    this.notifyListeners(state, prevState);
  }

  /**
   * Start batching notifications
   */
  startBatch(): void {
    this.isBatching = true;
  }

  /**
   * End batching and flush notifications
   */
  endBatch(): void {
    this.isBatching = false;
    this.flushBatch();
  }

  /**
   * Schedule notification in next microtask
   */
  private scheduleNotify(): void {
    if (this.notifyScheduled) return;

    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      if (!this.isBatching) {
        this.flushBatch();
      }
    });
  }

  /**
   * Flush batched notifications
   */
  private flushBatch(): void {
    if (this.batchedNotifications.length === 0) return;

    // Get last state (most recent)
    const last = this.batchedNotifications[this.batchedNotifications.length - 1];
    // Get first prevState (original state before batch)
    const first = this.batchedNotifications[0];

    if (last && first) {
      this.notifyListeners(last.state, first.prevState);
    }

    this.batchedNotifications = [];
  }

  /**
   * Actually notify listeners
   */
  private notifyListeners(state: TState, prevState: TState): void {
    for (const listener of this.listeners) {
      try {
        listener(state, prevState);
      } catch (error) {
        console.error('[Sthira] Error in listener:', error);
      }
    }
  }

  /**
   * Get listener count
   */
  get size(): number {
    return this.listeners.size;
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.batchedNotifications = [];
  }
}
