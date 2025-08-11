/**
 * ItemManufacturer Entity - Refactored using BaseEntity system
 * 
 * This entity uses the address pattern:
 * - Optional code field
 * - Address field instead of description (for manufacturer location)
 * - Special validation for address length
 */

import {
  BaseEntityWithAddress,
  CreateInputFor,
  UpdateInputFor,
  createEntityRulesWithAddress,
  ADDRESS_ENTITY_CONFIG,
  type ValidationConfigWithAddress,
} from './BaseEntity';

// ============================================================================
// ENTITY DEFINITION
// ============================================================================

/**
 * ItemManufacturer entity interface - extends address pattern
 * 
 * Note: This interface extends BaseEntityWithAddress and maintains
 * backward compatibility with existing code while eliminating duplication.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemManufacturer extends BaseEntityWithAddress {}

/**
 * ItemManufacturer create input interface - generated from base
 */
export type ItemManufacturerCreateInput = CreateInputFor<ItemManufacturer>;

/**
 * ItemManufacturer update input interface - generated from base
 */
export type ItemManufacturerUpdateInput = UpdateInputFor<ItemManufacturer>;

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Manufacturer-specific validation configuration
 */
const ITEM_MANUFACTURER_CONFIG: ValidationConfigWithAddress = {
  ...ADDRESS_ENTITY_CONFIG,
  entityDisplayName: 'produsen',
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * ItemManufacturer business rules - generated using base factory
 * 
 * Maintains the exact same interface as before for backward compatibility:
 * - maxNameLength: number
 * - maxAddressLength: number  
 * - requiredFields: readonly string[]
 * - validate: (data: Partial<ItemManufacturer>) => string[]
 */
export const ItemManufacturerRules = createEntityRulesWithAddress<ItemManufacturer>(
  ITEM_MANUFACTURER_CONFIG
);
