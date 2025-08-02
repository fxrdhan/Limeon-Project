/**
 * Item Management Module
 *
 * Main entry point for item management functionality.
 * Provides core components, hooks, and utilities for managing items,
 * categories, types, units, and dosages.
 *
 * Architecture: Clean Architecture with Domain-Driven Design
 * - Domain: Core business entities and use cases
 * - Application: Hooks and business logic
 * - Presentation: UI components following atomic design
 * - Shared: Types, contexts, and utilities
 */

// Core Templates
export { default as ItemManagementModal } from './presentation/templates/item/ItemManagementModal';
export { EntityManagementModal } from './presentation/templates/entity';

// Data Components
export { ItemDataTable } from './presentation/organisms';
export { useItemGridColumns } from './application/hooks/ui';

// Context Providers
export { ItemManagementProvider } from './shared/contexts/ItemFormContext';
export { useItemManagement } from './shared/contexts/useItemFormContext';
export {
  EntityModalProvider,
  useEntityModal,
} from './shared/contexts/EntityModalContext';

// Core Hooks
export { useAddItemForm } from './application/hooks/core/useItemCrud';
export { useItemFormValidation } from './application/hooks/form/useItemValidation';
export { useUnitConversion } from './application/hooks/utils/useUnitConversion';
export { useEntityModalLogic } from './application/hooks/entity/useEntityModalLogic';

// Type Definitions
export type {
  ItemFormData,
  ItemManagementModalProps,
  ItemManagementContextValue,
  UnitConversion,
} from './shared/types';

// Utility Functions
export {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
} from './shared/utils/PriceCalculator';

// Constants
export { CACHE_KEY, DEFAULT_MIN_STOCK } from './constants';
