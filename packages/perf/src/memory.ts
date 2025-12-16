import type { MemoryInfo, MemoryPressure } from './types';

/**
 * Memory pressure thresholds
 */
const THRESHOLDS = {
  moderate: 0.7,
  critical: 0.9,
};

/**
 * Get current memory info (Chrome only)
 */
export function getMemoryInfo(): MemoryInfo | null {
  // Only available in Chrome with performance.memory
  const perf = performance as unknown as {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (!perf.memory) {
    return null;
  }

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;

  return {
    usedHeap: usedJSHeapSize,
    totalHeap: totalJSHeapSize,
    heapLimit: jsHeapSizeLimit,
    usagePercent: usedJSHeapSize / jsHeapSizeLimit,
  };
}

/**
 * Get memory pressure level
 */
export function getMemoryPressure(): MemoryPressure {
  const info = getMemoryInfo();
  if (!info) return 'none';

  if (info.usagePercent >= THRESHOLDS.critical) {
    return 'critical';
  }

  if (info.usagePercent >= THRESHOLDS.moderate) {
    return 'moderate';
  }

  return 'none';
}

/**
 * Check if memory is under pressure
 */
export function isMemoryPressured(): boolean {
  return getMemoryPressure() !== 'none';
}

/**
 * Memory pressure callback type
 */
export type MemoryPressureCallback = (pressure: MemoryPressure) => void;

/**
 * Memory monitor for watching memory pressure
 */
export class MemoryMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks = new Set<MemoryPressureCallback>();
  private lastPressure: MemoryPressure = 'none';
  private intervalMs: number;

  constructor(intervalMs = 5000) {
    this.intervalMs = intervalMs;
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.check();
    }, this.intervalMs);

    // Initial check
    this.check();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check memory pressure and notify if changed
   */
  private check(): void {
    const pressure = getMemoryPressure();

    if (pressure !== this.lastPressure) {
      this.lastPressure = pressure;
      this.notify(pressure);
    }
  }

  /**
   * Subscribe to pressure changes
   */
  subscribe(callback: MemoryPressureCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify all subscribers
   */
  private notify(pressure: MemoryPressure): void {
    for (const callback of this.callbacks) {
      try {
        callback(pressure);
      } catch (error) {
        console.error('[Sthira MemoryMonitor] Callback error:', error);
      }
    }
  }

  /**
   * Get current memory info
   */
  getInfo(): MemoryInfo | null {
    return getMemoryInfo();
  }

  /**
   * Get current pressure level
   */
  getPressure(): MemoryPressure {
    return this.lastPressure;
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Default instance
let defaultMonitor: MemoryMonitor | null = null;

export function getMemoryMonitor(intervalMs?: number): MemoryMonitor {
  if (!defaultMonitor) {
    defaultMonitor = new MemoryMonitor(intervalMs);
  }
  return defaultMonitor;
}
