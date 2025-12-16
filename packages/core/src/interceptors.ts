import type { ErrorContext, Interceptors } from './types';

/**
 * Interceptors manager - Axios-style hooks
 */
export class InterceptorsManager<TState> {
  private interceptors: Interceptors<TState>;

  constructor(interceptors?: Interceptors<TState>) {
    this.interceptors = interceptors ?? {};
  }

  /**
   * Execute beforeSet interceptor
   * Returns transformed value or original if no transform
   */
  beforeSet(path: string | null, value: Partial<TState>, prevState: TState): Partial<TState> {
    if (!this.interceptors.beforeSet) {
      return value;
    }

    try {
      const result = this.interceptors.beforeSet(path, value, prevState);
      return result ?? value;
    } catch (error) {
      this.handleError(error as Error, {
        action: 'beforeSet',
        state: prevState,
        error: error as Error,
      });
      return value;
    }
  }

  /**
   * Execute afterSet interceptor
   */
  afterSet(path: string | null, value: Partial<TState>, newState: TState): void {
    if (!this.interceptors.afterSet) {
      return;
    }

    try {
      this.interceptors.afterSet(path, value, newState);
    } catch (error) {
      this.handleError(error as Error, {
        action: 'afterSet',
        state: newState,
        error: error as Error,
      });
    }
  }

  /**
   * Handle error through interceptor or console
   */
  handleError(error: Error, context: ErrorContext): void {
    if (this.interceptors.onError) {
      try {
        this.interceptors.onError(error, context);
      } catch (e) {
        console.error('[Sthira] Error in onError interceptor:', e);
      }
    } else {
      console.error('[Sthira] Error:', error, context);
    }
  }

  /**
   * Check if any interceptors are defined
   */
  hasInterceptors(): boolean {
    return !!(
      this.interceptors.beforeSet ||
      this.interceptors.afterSet ||
      this.interceptors.onError
    );
  }

  /**
   * Update interceptors
   */
  setInterceptors(interceptors: Interceptors<TState>): void {
    this.interceptors = interceptors;
  }
}
