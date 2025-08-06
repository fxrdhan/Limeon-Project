/**
 * Diff utilities - now using local jsdiff implementation
 * No server dependencies, pure client-side processing
 * No caching needed - local diff is instant
 */

// Re-export from jsdiff
export type { DiffSegment } from '@/utils/jsdiff';
