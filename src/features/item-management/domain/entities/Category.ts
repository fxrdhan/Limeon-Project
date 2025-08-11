/**
 * ItemCategory Entity - Refactored using BaseEntity system
 * 
 * This entity now uses the generic base system to eliminate code duplication
 * while maintaining full backward compatibility and type safety.
 */

import {
  BaseEntityWithDescription,
  CreateInputFor,
  UpdateInputFor,
  createEntityRulesWithDescription,
  STANDARD_ENTITY_CONFIG,
  type ValidationConfigWithDescription,
} from './BaseEntity';

// ============================================================================
// ENTITY DEFINITION
// ============================================================================

/**
 * ItemCategory entity interface - extends base pattern
 * 
 * Note: This interface extends BaseEntityWithDescription and maintains
 * backward compatibility with existing code while eliminating duplication.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemCategory extends BaseEntityWithDescription {}

/**
 * ItemCategory create input interface - generated from base
 */
export type ItemCategoryCreateInput = CreateInputFor<ItemCategory>;

/**
 * ItemCategory update input interface - generated from base
 */
export type ItemCategoryUpdateInput = UpdateInputFor<ItemCategory>;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Category-specific validation configuration
 */
const ITEM_CATEGORY_CONFIG: ValidationConfigWithDescription = {
  ...STANDARD_ENTITY_CONFIG,
  entityDisplayName: 'kategori',
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * ItemCategory business rules - generated using base factory
 * 
 * Maintains the exact same interface as before for backward compatibility:
 * - maxNameLength: number
 * - maxDescriptionLength: number  
 * - requiredFields: readonly string[]
 * - validate: (data: Partial<ItemCategory>) => string[]
 */
export const ItemCategoryRules = createEntityRulesWithDescription<ItemCategory>(
  ITEM_CATEGORY_CONFIG
);
