/**
 * Testing Utilities
 *
 * Centralized exports for all testing-related utilities and hooks.
 * This module provides tools for generating test data, creating mock items,
 * and other testing functionalities.
 */

// Random item generation utilities
export {
  generateRandomItemData,
  validateEntitiesForGeneration,
  getEntitiesLoadingStatus,
  type RandomItemEntities,
  type GeneratedRandomItem,
} from './randomItemGenerator';

// Random item creation hook
export {
  useRandomItemCreation,
  type UseRandomItemCreationOptions,
  type UseRandomItemCreationReturn,
} from './useRandomItemCreation';

// Random item floating button component
export {
  RandomItemFloatingButton,
  type RandomItemFloatingButtonProps,
} from './RandomItemFloatingButton';

// Chat testing button component
export {
  ChatTestingButton,
  type ChatTestingButtonProps,
} from './ChatTestingButton';

// Re-export for convenience
export { useRandomItemCreation as useTestingItemCreation } from './useRandomItemCreation';
