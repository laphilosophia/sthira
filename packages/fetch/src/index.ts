// ============================================================================
// @sthira/fetch - REST data adapter for Sthira
// ============================================================================

// Fetch sources
export { createFetchSource, createMutation } from './fetch';

// Cache
export { QueryCache, getQueryCache, resetQueryCache } from './cache';

// Global API
export { sthira } from './sthira';

// Types
export type {
  CacheEntry,
  CacheOptions,
  DataSource,
  DataSourceType,
  FetchSourceConfig,
  HttpMethod,
  MutationConfig,
  MutationResult,
  QueryResult,
  QueryStatus,
} from './types';
