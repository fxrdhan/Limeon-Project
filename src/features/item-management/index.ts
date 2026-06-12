/**
 * Item Management Module
 *
 * Main entry point for item management functionality.
 * Provides core components, hooks, and utilities for managing items,
 * categories, types, units, and dosages.
 *
 * Architecture: layered feature module
 * - Domain: pure business rules and validators
 * - Application: hook composition, data loading, mutations, and form workflows
 * - Infrastructure: Supabase and storage adapters
 * - Presentation: UI components following local component conventions
 * - Shared: feature-level types, contexts, and utilities
 *
 * Some reusable services and hooks still live in the app-wide shared layers.
 * Keep new feature-specific behavior inside this module unless it is genuinely
 * reused by multiple domains.
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
