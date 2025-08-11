/**
 * ItemDosage Entity - Refactored using BaseEntity system
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
 * ItemDosage entity interface - extends NCI code pattern
 * 
 * Note: This interface extends BaseEntityWithNciCode and maintains
 * backward compatibility with existing code while eliminating duplication.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemDosage extends BaseEntityWithNciCode {}

/**
 * ItemDosage create input interface - generated from base
 */
export type ItemDosageCreateInput = CreateInputFor<ItemDosage>;

/**
 * ItemDosage update input interface - generated from base
 */
export type ItemDosageUpdateInput = UpdateInputFor<ItemDosage>;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Dosage-specific validation configuration
 */
const ITEM_DOSAGE_CONFIG: ValidationConfigWithNciCode = {
  ...NCI_ENTITY_CONFIG,
  entityDisplayName: 'sediaan',
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * ItemDosage business rules - generated using base factory
 * 
 * Maintains the exact same interface as before for backward compatibility:
 * - maxNameLength: number
 * - maxDescriptionLength: number
 * - maxNciCodeLength: number
 * - requiredFields: readonly string[]
 * - validate: (data: Partial<ItemDosage>) => string[]
 */
export const ItemDosageRules = createEntityRulesWithNciCode<ItemDosage>(
  ITEM_DOSAGE_CONFIG
);
