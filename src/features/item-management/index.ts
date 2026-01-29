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
export { default as ItemModal } from './presentation/templates/item/ItemModal';
export { EntityModal } from './presentation/templates/entity';

// Data Components
export { EntityGrid } from './presentation/organisms';
export { useItemGridColumns } from './application/hooks/ui';

// Context Providers
export { ItemManagementProvider } from './shared/contexts/ItemFormContext';
export {
  useItemForm,
  useItemUI,
  useItemModal,
  useItemPrice,
  useItemActions,
  useItemRealtime,
} from './shared/contexts/useItemFormContext';
export {
  EntityModalProvider,
  useEntityModal,
} from './shared/contexts/EntityModalContext';

// Core Hooks
export { useAddItemForm } from './application/hooks/core/useItemCrud';
export { useItemFormValidation } from './application/hooks/form/useItemValidation';
export { usePackageConversion } from './application/hooks/utils/usePackageConversion';
export { useEntityModalLogic } from './application/hooks/instances/useEntityModalLogic';

// Type Definitions
export type {
  ItemFormData,
  ItemModalProps,
  ItemManagementContextValue,
  PackageConversion,
} from './shared/types';

// Utility Functions
export {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
} from './shared/utils/PriceCalculator';

// Constants
export { CACHE_KEY, DEFAULT_MIN_STOCK } from './constants';
