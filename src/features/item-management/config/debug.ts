/**
 * Debug configuration for item management features
 */
export const DEBUG_CONFIG = {
  // History debug logging - set to true to enable console logs for history operations
  HISTORY_DEBUG: false,

  // Future debug flags can be added here
  // ENTITY_DEBUG: false,
  // SEARCH_DEBUG: false,
} as const;

export const { HISTORY_DEBUG } = DEBUG_CONFIG;
