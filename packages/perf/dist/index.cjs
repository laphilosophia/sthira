'use strict';

// src/batcher.ts
function createBatcher(flush, options = {}) {
  const { maxSize = 100, maxWait = 50, debounceMs = 10 } = options;
  let queue = [];
  let debounceTimer = null;
  let maxWaitTimer = null;
  function doFlush() {
    if (queue.length === 0) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }
    const items = queue;
    queue = [];
    flush(items);
  }
  function scheduleFlush() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(doFlush, debounceMs);
  }
  return {
    add(item) {
      queue.push(item);
      if (queue.length >= maxSize) {
        doFlush();
        return;
      }
      if (queue.length === 1 && maxWait > 0) {
        maxWaitTimer = setTimeout(doFlush, maxWait);
      }
      scheduleFlush();
    },
    flush: doFlush,
    get pending() {
      return queue.length;
    }
  };
}
function createReactBatcher(setState, merger, options = {}) {
  const batcher = createBatcher((items) => {
    const merged = merger(items);
    setState((prev) => ({ ...prev, ...merged }));
  }, options);
  return {
    update: batcher.add,
    flush: batcher.flush
  };
}
function defaultMerger(batch) {
  return batch.reduce((acc, item) => ({ ...acc, ...item }), {});
}
function deepMerger(batch) {
  const result = {};
  for (const item of batch) {
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value) && typeof result[key] === "object" && result[key] !== null) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// src/scheduler.ts
var TaskScheduler = class {
  queue = [];
  isProcessing = false;
  frameBudget;
  useIdleCallback;
  frameDeadline = 0;
  constructor(options = {}) {
    this.frameBudget = options.frameBudget ?? 5;
    this.useIdleCallback = options.useIdleCallback ?? true;
  }
  /**
   * Schedule a task with priority
   */
  schedule(task, priority = "normal") {
    return new Promise((resolve, reject) => {
      const scheduledTask = {
        id: crypto.randomUUID(),
        task,
        priority,
        createdAt: Date.now()
      };
      this.queue.push(scheduledTask);
      this.sortQueue();
      this.requestProcessing();
      const originalTask = scheduledTask.task;
      scheduledTask.task = async () => {
        try {
          const result = await originalTask();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      };
    });
  }
  /**
   * Sort queue by priority
   */
  sortQueue() {
    const priorityOrder = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
      idle: 4
    };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }
  /**
   * Request processing time
   */
  requestProcessing() {
    if (this.isProcessing) return;
    if (typeof requestIdleCallback !== "undefined" && this.useIdleCallback) {
      requestIdleCallback((deadline) => {
        this.frameDeadline = performance.now() + deadline.timeRemaining();
        this.processQueue();
      });
    } else if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame((timestamp) => {
        this.frameDeadline = timestamp + this.frameBudget;
        this.processQueue();
      });
    } else {
      setTimeout(() => this.processQueue(), 0);
    }
  }
  /**
   * Process queue within frame budget
   */
  async processQueue() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      if (this.shouldYield()) {
        this.isProcessing = false;
        this.requestProcessing();
        return;
      }
      const task = this.queue.shift();
      if (!task) break;
      try {
        await task.task();
      } catch (error) {
        console.error("[Sthira Perf] Task error:", error);
      }
    }
    this.isProcessing = false;
  }
  /**
   * Check if we should yield to browser
   */
  shouldYield() {
    if (typeof performance === "undefined") return false;
    return performance.now() >= this.frameDeadline;
  }
  /**
   * Get queue length
   */
  get pending() {
    return this.queue.length;
  }
  /**
   * Clear all pending tasks
   */
  clear() {
    this.queue = [];
  }
};
async function chunked(items, processor, options = {}) {
  const { chunkSize = 100, yieldBetweenChunks = true, signal } = options;
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    if (signal?.aborted) {
      throw new DOMException("Chunked processing aborted", "AbortError");
    }
    const chunk = items.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j];
      results.push(await processor(item, i + j));
    }
    if (yieldBetweenChunks && i + chunkSize < items.length) {
      await yieldToMain();
    }
  }
  return results;
}
async function yieldToMain() {
  const g = globalThis;
  if (g.scheduler?.yield) {
    return g.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}
var defaultScheduler = null;
function getScheduler(options) {
  if (!defaultScheduler) {
    defaultScheduler = new TaskScheduler(options);
  }
  return defaultScheduler;
}

// src/memory.ts
var THRESHOLDS = {
  moderate: 0.7,
  critical: 0.9
};
function getMemoryInfo() {
  const perf = performance;
  if (!perf.memory) {
    return null;
  }
  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;
  return {
    usedHeap: usedJSHeapSize,
    totalHeap: totalJSHeapSize,
    heapLimit: jsHeapSizeLimit,
    usagePercent: usedJSHeapSize / jsHeapSizeLimit
  };
}
function getMemoryPressure() {
  const info = getMemoryInfo();
  if (!info) return "none";
  if (info.usagePercent >= THRESHOLDS.critical) {
    return "critical";
  }
  if (info.usagePercent >= THRESHOLDS.moderate) {
    return "moderate";
  }
  return "none";
}
function isMemoryPressured() {
  return getMemoryPressure() !== "none";
}
var MemoryMonitor = class {
  intervalId = null;
  callbacks = /* @__PURE__ */ new Set();
  lastPressure = "none";
  intervalMs;
  constructor(intervalMs = 5e3) {
    this.intervalMs = intervalMs;
  }
  /**
   * Start monitoring
   */
  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.check();
    }, this.intervalMs);
    this.check();
  }
  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  /**
   * Check memory pressure and notify if changed
   */
  check() {
    const pressure = getMemoryPressure();
    if (pressure !== this.lastPressure) {
      this.lastPressure = pressure;
      this.notify(pressure);
    }
  }
  /**
   * Subscribe to pressure changes
   */
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  /**
   * Notify all subscribers
   */
  notify(pressure) {
    for (const callback of this.callbacks) {
      try {
        callback(pressure);
      } catch (error) {
        console.error("[Sthira MemoryMonitor] Callback error:", error);
      }
    }
  }
  /**
   * Get current memory info
   */
  getInfo() {
    return getMemoryInfo();
  }
  /**
   * Get current pressure level
   */
  getPressure() {
    return this.lastPressure;
  }
};
function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
var defaultMonitor = null;
function getMemoryMonitor(intervalMs) {
  if (!defaultMonitor) {
    defaultMonitor = new MemoryMonitor(intervalMs);
  }
  return defaultMonitor;
}

// src/utils.ts
function createDebounced(fn, options) {
  const { delay, maxWait } = typeof options === "number" ? { delay: options, maxWait: void 0 } : options;
  let debounceTimer = null;
  let maxWaitTimer = null;
  let lastArgs = null;
  let lastCallTime = 0;
  function execute() {
    if (lastArgs === null) return;
    fn(...lastArgs);
    lastArgs = null;
    lastCallTime = 0;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }
  }
  function debounced(...args) {
    lastArgs = args;
    const now = Date.now();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (maxWait && !maxWaitTimer && !lastCallTime) {
      lastCallTime = now;
      maxWaitTimer = setTimeout(execute, maxWait);
    }
    debounceTimer = setTimeout(execute, delay);
  }
  debounced.flush = () => {
    execute();
  };
  debounced.cancel = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }
    lastArgs = null;
    lastCallTime = 0;
  };
  debounced.pending = () => {
    return debounceTimer !== null;
  };
  return debounced;
}
function createPausable() {
  let paused = false;
  return {
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    isPaused: () => paused
  };
}

exports.MemoryMonitor = MemoryMonitor;
exports.TaskScheduler = TaskScheduler;
exports.chunked = chunked;
exports.createBatcher = createBatcher;
exports.createDebounced = createDebounced;
exports.createPausable = createPausable;
exports.createReactBatcher = createReactBatcher;
exports.deepMerger = deepMerger;
exports.defaultMerger = defaultMerger;
exports.formatBytes = formatBytes;
exports.getMemoryInfo = getMemoryInfo;
exports.getMemoryMonitor = getMemoryMonitor;
exports.getMemoryPressure = getMemoryPressure;
exports.getScheduler = getScheduler;
exports.isMemoryPressured = isMemoryPressured;
exports.yieldToMain = yieldToMain;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map