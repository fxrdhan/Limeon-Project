/**
 * ItemUnit Entity - Refactored using BaseEntity system
 * 
 * This entity uses a special pattern:
 * - Required code field (not optional like others)
 * - Optional id in CreateInput (special case)
 * - Standard description field
 */

import {
  BaseEntityWithRequiredCodeAndDescription,
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
 * ItemUnit entity interface - extends required code pattern
 * 
 * Note: This interface extends BaseEntityWithRequiredCodeAndDescription and maintains
 * backward compatibility with existing code while eliminating duplication.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemUnit extends BaseEntityWithRequiredCodeAndDescription {}

/**
 * ItemUnit create input - special case with optional id
 */
export type ItemUnitCreateInput = CreateInputFor<ItemUnit, true>; // HasOptionalId = true

/**
 * ItemUnit update input interface - generated from base
 */
export type ItemUnitUpdateInput = UpdateInputFor<ItemUnit>;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Unit-specific validation configuration
 */
const ITEM_UNIT_CONFIG: ValidationConfigWithDescription = {
  ...STANDARD_ENTITY_CONFIG,
  entityDisplayName: 'satuan',
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * ItemUnit business rules - generated using base factory
 * 
 * Maintains the exact same interface as before for backward compatibility:
 * - maxNameLength: number
 * - maxDescriptionLength: number  
 * - requiredFields: readonly string[]
 * - validate: (data: Partial<ItemUnit>) => string[]
 */
export const ItemUnitRules = createEntityRulesWithDescription<ItemUnit>(
  ITEM_UNIT_CONFIG
);
