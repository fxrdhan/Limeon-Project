/**
 * ItemType Entity - Refactored using BaseEntity system
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
 * ItemType entity interface - extends base pattern
 * 
 * Note: This interface extends BaseEntityWithDescription and maintains
 * backward compatibility with existing code while eliminating duplication.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemType extends BaseEntityWithDescription {}

/**
 * ItemType create input interface - generated from base
 */
export type ItemTypeCreateInput = CreateInputFor<ItemType>;

/**
 * ItemType update input interface - generated from base
 */
export type ItemTypeUpdateInput = UpdateInputFor<ItemType>;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Type-specific validation configuration
 */
const ITEM_TYPE_CONFIG: ValidationConfigWithDescription = {
  ...STANDARD_ENTITY_CONFIG,
  entityDisplayName: 'jenis item',
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * ItemType business rules - generated using base factory
 * 
 * Maintains the exact same interface as before for backward compatibility:
 * - maxNameLength: number
 * - maxDescriptionLength: number  
 * - requiredFields: readonly string[]
 * - validate: (data: Partial<ItemType>) => string[]
 */
export const ItemTypeRules = createEntityRulesWithDescription<ItemType>(
  ITEM_TYPE_CONFIG
);
