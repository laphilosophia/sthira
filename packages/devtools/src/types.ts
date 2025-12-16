// ============================================================================
// DevTools Types
// ============================================================================

/**
 * DevTools configuration
 */
export interface DevToolsConfig {
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
export interface DevToolsFeatures {
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
export interface DevToolsExtension {
  connect(options?: DevToolsConfig): DevToolsConnection;
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
export interface DevToolsConnection {
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
export interface DevToolsAction {
  type: string;
  [key: string]: unknown;
}

/**
 * DevTools message
 */
export interface DevToolsMessage {
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
export interface InspectedState {
  state: unknown;
  computed: Record<string, unknown>;
  subscribers: number;
  actions: string[];
}

/**
 * State diff
 */
export interface StateDiff {
  path: string[];
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Action log entry
 */
export interface ActionLogEntry {
  id: number;
  type: string;
  payload?: unknown;
  timestamp: number;
  prevState: unknown;
  nextState: unknown;
}

/**
 * DevTools API
 */
export interface DevToolsApi {
  /** Connect to devtools */
  connect(): void;
  /** Disconnect from devtools */
  disconnect(): void;
  /** Log an action */
  logAction(type: string, payload?: unknown): void;
  /** Get action history */
  getHistory(): ActionLogEntry[];
  /** Clear history */
  clearHistory(): void;
  /** Jump to state at action index */
  jumpTo(actionId: number): void;
  /** Export state as JSON */
  exportState(): string;
  /** Import state from JSON */
  importState(json: string): void;
}
