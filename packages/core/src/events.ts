import type { EmitOptions, EventBus, EventHandler, StoreEvent, Unsubscribe } from './types';

/**
 * Event bus implementation for bi-directional communication
 */
export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler<unknown>>>();
  const onceHandlers = new WeakSet<EventHandler<unknown>>();

  return {
    /**
     * Emit an event
     */
    emit<T>(type: string, payload: T, options?: EmitOptions): void {
      const event: StoreEvent<T> = {
        type,
        payload,
        timestamp: Date.now(),
        source: options?.source ?? 'user',
        priority: options?.priority ?? 'normal',
        meta: options?.meta,
      };

      const typeHandlers = handlers.get(type);
      if (!typeHandlers) return;

      // Execute handlers in order added
      for (const handler of typeHandlers) {
        try {
          handler(event as StoreEvent<unknown>);

          // Remove if once handler
          if (onceHandlers.has(handler)) {
            typeHandlers.delete(handler);
            onceHandlers.delete(handler);
          }
        } catch (error) {
          console.error(`[Sthira] Error in event handler for "${type}":`, error);
        }
      }
    },

    /**
     * Subscribe to an event type
     */
    on<T>(type: string, handler: EventHandler<T>): Unsubscribe {
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }

      handlers.get(type)!.add(handler as EventHandler<unknown>);

      return () => {
        handlers.get(type)?.delete(handler as EventHandler<unknown>);
      };
    },

    /**
     * Subscribe to an event type (once)
     */
    once<T>(type: string, handler: EventHandler<T>): Unsubscribe {
      const wrappedHandler = handler as EventHandler<unknown>;
      onceHandlers.add(wrappedHandler);
      return this.on(type, handler);
    },

    /**
     * Unsubscribe from an event type
     */
    off(type: string, handler?: EventHandler): void {
      if (!handler) {
        handlers.delete(type);
        return;
      }

      handlers.get(type)?.delete(handler as EventHandler<unknown>);
    },
  };
}

/**
 * Built-in event types
 */
export const StoreEvents = {
  STATE_CHANGE: 'state:change',
  STATE_RESET: 'state:reset',
  COMPUTED_INVALIDATE: 'computed:invalidate',
  ERROR: 'error',
  DESTROY: 'destroy',
} as const;
