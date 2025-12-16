import { Plugin, Store } from '@sthira/core';

/**
 * DevTools configuration
 */
interface DevToolsConfig$1 {
    /** Store name for DevTools */
    name?: string;
    /** Enable action names */
    actionNames?: boolean;
    /** Max number of actions to keep in history */
    maxAge?: number;
    /** Serialize options */
    serialize?: boolean;
    /** Enable features */
    features?: DevToolsFeatures;
}
/**
 * DevTools features
 */
interface DevToolsFeatures {
    /** Enable pause/resume */
    pause?: boolean;
    /** Enable lock actions */
    lock?: boolean;
    /** Enable export state */
    export?: boolean;
    /** Enable import state */
    import?: boolean;
    /** Enable jump to action */
    jump?: boolean;
    /** Enable skip action */
    skip?: boolean;
    /** Enable reorder actions */
    reorder?: boolean;
    /** Enable persist state */
    persist?: boolean;
    /** Enable dispatch custom actions */
    dispatch?: boolean;
    /** Enable testing mode */
    test?: boolean;
}
/**
 * Extension connection interface
 */
interface DevToolsExtension {
    connect(options?: DevToolsConfig$1): DevToolsConnection;
    disconnect(): void;
    send(action: string | DevToolsAction, state: unknown): void;
    subscribe(listener: (message: DevToolsMessage) => void): () => void;
    unsubscribe(): void;
    init(state: unknown): void;
    error(message: string): void;
}
/**
 * DevTools connection
 */
interface DevToolsConnection {
    /** Initialize with state */
    init(state: unknown): void;
    /** Send action */
    send(action: string | DevToolsAction, state: unknown): void;
    /** Subscribe to messages */
    subscribe(listener: (message: DevToolsMessage) => void): () => void;
    /** Unsubscribe */
    unsubscribe(): void;
    /** Error */
    error(message: string): void;
}
/**
 * DevTools action
 */
interface DevToolsAction {
    type: string;
    [key: string]: unknown;
}
/**
 * DevTools message
 */
interface DevToolsMessage {
    type: string;
    state?: string;
    payload?: {
        type: string;
        actionId?: number;
        index?: number;
        [key: string]: unknown;
    };
}
/**
 * Inspected state
 */
interface InspectedState {
    state: unknown;
    computed: Record<string, unknown>;
    subscribers: number;
    actions: string[];
}
/**
 * State diff
 */
interface StateDiff {
    path: string[];
    oldValue: unknown;
    newValue: unknown;
}
/**
 * Action log entry
 */
interface ActionLogEntry {
    id: number;
    type: string;
    payload?: unknown;
    timestamp: number;
    prevState: unknown;
    nextState: unknown;
}

/**
 * DevTools configuration
 */
interface DevToolsConfig {
    /** Instance name in DevTools */
    name?: string;
    /** Max action history */
    maxAge?: number;
    /** Enable features */
    features?: DevToolsFeatures;
}
/**
 * DevTools API exposed on store
 */
interface DevToolsApi {
    /** Connect to DevTools */
    connect: () => void;
    /** Disconnect from DevTools */
    disconnect: () => void;
    /** Log an action */
    logAction: (type: string, payload?: unknown) => void;
    /** Get action history */
    getHistory: () => ActionLogEntry[];
    /** Clear history */
    clearHistory: () => void;
    /** Jump to state at action */
    jumpTo: (actionId: number) => void;
    /** Export state as JSON */
    exportState: () => string;
    /** Import state from JSON */
    importState: (json: string) => void;
    /** Get status */
    getStatus: () => {
        connected: boolean;
    };
}
/**
 * Check if Redux DevTools Extension is available
 */
declare function isDevToolsAvailable(): boolean;
/**
 * Create DevTools plugin
 */
declare function createDevToolsPlugin<T extends object>(config?: DevToolsConfig): Plugin<T> & {
    api: DevToolsApi;
};

/**
 * State inspector for debugging stores
 */
declare class StoreInspector<TState extends object, TActions extends object> {
    private store;
    private stateHistory;
    private maxHistory;
    constructor(store: Store<TState, TActions>, maxHistory?: number);
    /**
     * Start tracking state changes
     */
    private startTracking;
    /**
     * Get current inspected state
     */
    inspect(): InspectedState;
    /**
     * Get state history
     */
    getHistory(): {
        state: TState;
        timestamp: number;
    }[];
    /**
     * Get state at specific time
     */
    getStateAt(timestamp: number): TState | undefined;
    /**
     * Compare two states and get diff
     */
    diff(oldState: TState, newState: TState): StateDiff[];
    /**
     * Recursive diff helper
     */
    private diffRecursive;
    /**
     * Get computed values
     */
    getComputed(): Record<string, unknown>;
    /**
     * Get action names
     */
    getActions(): string[];
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Format state for display (JSON with indentation)
     */
    formatState(state?: unknown): string;
}
/**
 * Create inspector for a store
 */
declare function createInspector<TState extends object, TActions extends object>(store: Store<TState, TActions>, maxHistory?: number): StoreInspector<TState, TActions>;

export { type ActionLogEntry, type DevToolsApi, type DevToolsConfig, type DevToolsConnection, type DevToolsExtension, type DevToolsFeatures, type DevToolsMessage, type InspectedState, type StateDiff, StoreInspector, createDevToolsPlugin, createInspector, isDevToolsAvailable };
