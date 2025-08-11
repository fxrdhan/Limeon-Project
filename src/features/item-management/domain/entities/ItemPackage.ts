/**
 * ItemPackage Entity - Refactored using BaseEntity system
 * 
 * This entity uses the NCI code pattern:
 * - Optional code field
 * - NCI code field for pharmaceutical classification
 * - Standard description field
 */

import {
  BaseEntityWithNciCode,
  CreateInputFor,
  UpdateInputFor,
  createEntityRulesWithNciCode,
  NCI_ENTITY_CONFIG,
  type ValidationConfigWithNciCode,
} from './BaseEntity';

// ============================================================================
// ENTITY DEFINITION
// ============================================================================

/**
 * ItemPackage entity interface - extends NCI code pattern
 * 
 * Note: This interface extends BaseEntityWithNciCode and maintains
 * backward compatibility with existing code while eliminating duplication.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemPackage extends BaseEntityWithNciCode {}

/**
 * ItemPackage create input interface - generated from base
 */
export type ItemPackageCreateInput = CreateInputFor<ItemPackage>;

/**
 * ItemPackage update input interface - generated from base
 */
export type ItemPackageUpdateInput = UpdateInputFor<ItemPackage>;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Package-specific validation configuration
 */
const ITEM_PACKAGE_CONFIG: ValidationConfigWithNciCode = {
  ...NCI_ENTITY_CONFIG,
  entityDisplayName: 'kemasan',
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * ItemPackage business rules - generated using base factory
 * 
 * Maintains the exact same interface as before for backward compatibility:
 * - maxNameLength: number
 * - maxDescriptionLength: number
 * - maxNciCodeLength: number
 * - requiredFields: readonly string[]
 * - validate: (data: Partial<ItemPackage>) => string[]
 */
export const ItemPackageRules = createEntityRulesWithNciCode<ItemPackage>(
  ITEM_PACKAGE_CONFIG
);
