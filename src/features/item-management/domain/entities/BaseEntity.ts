/**
 * Base Entity System for Item Management Domain
 * 
 * This module provides a generic, type-safe foundation for all item management entities,
 * eliminating code duplication while maintaining full type safety and flexibility.
 * 
 * Architecture:
 * - Generic base interfaces for different entity patterns
 * - Type-safe validation factory
 * - Configurable entity creation system
 * - Full backward compatibility maintained
 */

// ============================================================================
// BASE ENTITY INTERFACES
// ============================================================================

/**
 * Core base interface for all entities
 */
export interface BaseEntity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Entity with optional code field (most common pattern)
 */
export interface BaseEntityWithOptionalCode extends BaseEntity {
  code?: string;
}

/**
 * Entity with required code field (ItemUnit only)
 */
export interface BaseEntityWithRequiredCode extends BaseEntity {
  code: string;
}

/**
 * Entity with description field (standard pattern)
 */
export interface BaseEntityWithDescription extends BaseEntityWithOptionalCode {
  description?: string;
}

/**
 * Entity with address field (ItemManufacturer only)
 */
export interface BaseEntityWithAddress extends BaseEntityWithOptionalCode {
  address?: string;
}

/**
 * Entity with NCI code field (ItemDosage, ItemPackage)
 */
export interface BaseEntityWithNciCode extends BaseEntityWithDescription {
  nci_code?: string;
}

/**
 * Entity with required code + description (ItemUnit pattern)
 */
export interface BaseEntityWithRequiredCodeAndDescription extends BaseEntityWithRequiredCode {
  description?: string;
}

// ============================================================================
// GENERIC INPUT INTERFACES
// ============================================================================

/**
 * Generic create input interface
 * Omits id, created_at, updated_at from entity
 */
export type BaseCreateInput<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Special create input with optional id (for ItemUnit)
 */
export type BaseCreateInputWithOptionalId<T extends BaseEntity> = Omit<T, 'created_at' | 'updated_at'> & {
  id?: string;
};

/**
 * Generic update input interface
 * Omits created_at, updated_at and makes id required
 */
export type BaseUpdateInput<T extends BaseEntity> = Omit<T, 'created_at' | 'updated_at'> & {
  id: string;
};

// ============================================================================
// VALIDATION CONFIGURATION TYPES
// ============================================================================

/**
 * Base validation configuration
 */
export interface BaseValidationConfig {
  maxNameLength: number;
  requiredFields: readonly string[];
  entityDisplayName: string; // For error messages (e.g., "kategori", "jenis item")
}

/**
 * Validation config for entities with description
 */
export interface ValidationConfigWithDescription extends BaseValidationConfig {
  maxDescriptionLength: number;
}

/**
 * Validation config for entities with address
 */
export interface ValidationConfigWithAddress extends BaseValidationConfig {
  maxAddressLength: number;
}

/**
 * Validation config for entities with NCI code
 */
export interface ValidationConfigWithNciCode extends ValidationConfigWithDescription {
  maxNciCodeLength: number;
}

// ============================================================================
// VALIDATION FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a generic validator function for any entity type
 */
export function createEntityValidator<T extends BaseEntity>(
  config: BaseValidationConfig
): (data: Partial<T>) => string[] {
  return (data: Partial<T>): string[] => {
    const errors: string[] = [];

    // Name validation (universal for all entities)
    if (!data.name?.trim()) {
      errors.push(`Nama ${config.entityDisplayName} wajib diisi`);
    } else if (data.name.length > config.maxNameLength) {
      errors.push(
        `Nama ${config.entityDisplayName} maksimal ${config.maxNameLength} karakter`
      );
    }

    return errors;
  };
}

/**
 * Creates validator with description support
 */
export function createEntityValidatorWithDescription<T extends BaseEntityWithDescription>(
  config: ValidationConfigWithDescription
): (data: Partial<T>) => string[] {
  const baseValidator = createEntityValidator<T>(config);
  
  return (data: Partial<T>): string[] => {
    const errors = baseValidator(data);

    // Description validation
    if (
      data.description &&
      data.description.length > config.maxDescriptionLength
    ) {
      errors.push(
        `Deskripsi maksimal ${config.maxDescriptionLength} karakter`
      );
    }

    return errors;
  };
}

/**
 * Creates validator with address support (for ItemManufacturer)
 */
export function createEntityValidatorWithAddress<T extends BaseEntityWithAddress>(
  config: ValidationConfigWithAddress
): (data: Partial<T>) => string[] {
  const baseValidator = createEntityValidator<T>(config);
  
  return (data: Partial<T>): string[] => {
    const errors = baseValidator(data);

    // Address validation
    if (
      data.address &&
      data.address.length > config.maxAddressLength
    ) {
      errors.push(
        `Alamat maksimal ${config.maxAddressLength} karakter`
      );
    }

    return errors;
  };
}

/**
 * Creates validator with NCI code support
 */
export function createEntityValidatorWithNciCode<T extends BaseEntityWithNciCode>(
  config: ValidationConfigWithNciCode
): (data: Partial<T>) => string[] {
  const baseValidator = createEntityValidatorWithDescription<T>(config);
  
  return (data: Partial<T>): string[] => {
    const errors = baseValidator(data);

    // NCI code validation
    if (
      data.nci_code &&
      data.nci_code.length > config.maxNciCodeLength
    ) {
      errors.push(
        `Kode NCI maksimal ${config.maxNciCodeLength} karakter`
      );
    }

    return errors;
  };
}

// ============================================================================
// ENTITY RULES FACTORY
// ============================================================================

/**
 * Generic entity rules factory
 */
export function createEntityRules<T extends BaseEntity>(
  config: BaseValidationConfig,
  validator: (data: Partial<T>) => string[]
) {
  return {
    maxNameLength: config.maxNameLength,
    requiredFields: config.requiredFields,
    validate: validator,
  };
}

/**
 * Entity rules factory with description
 */
export function createEntityRulesWithDescription<T extends BaseEntityWithDescription>(
  config: ValidationConfigWithDescription
) {
  const validator = createEntityValidatorWithDescription<T>(config);
  
  return {
    maxNameLength: config.maxNameLength,
    maxDescriptionLength: config.maxDescriptionLength,
    requiredFields: config.requiredFields,
    validate: validator,
  };
}

/**
 * Entity rules factory with address
 */
export function createEntityRulesWithAddress<T extends BaseEntityWithAddress>(
  config: ValidationConfigWithAddress
) {
  const validator = createEntityValidatorWithAddress<T>(config);
  
  return {
    maxNameLength: config.maxNameLength,
    maxAddressLength: config.maxAddressLength,
    requiredFields: config.requiredFields,
    validate: validator,
  };
}

/**
 * Entity rules factory with NCI code
 */
export function createEntityRulesWithNciCode<T extends BaseEntityWithNciCode>(
  config: ValidationConfigWithNciCode
) {
  const validator = createEntityValidatorWithNciCode<T>(config);
  
  return {
    maxNameLength: config.maxNameLength,
    maxDescriptionLength: config.maxDescriptionLength,
    maxNciCodeLength: config.maxNciCodeLength,
    requiredFields: config.requiredFields,
    validate: validator,
  };
}

// ============================================================================
// ENTITY PATTERNS (PRESET CONFIGURATIONS)
// ============================================================================

/**
 * Standard entity pattern configuration
 */
export const STANDARD_ENTITY_CONFIG: ValidationConfigWithDescription = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  requiredFields: ['name'] as const,
  entityDisplayName: 'entity', // Will be overridden
};

/**
 * NCI entity pattern configuration
 */
export const NCI_ENTITY_CONFIG: ValidationConfigWithNciCode = {
  ...STANDARD_ENTITY_CONFIG,
  maxNciCodeLength: 20,
};

/**
 * Address entity pattern configuration (for Manufacturer)
 */
export const ADDRESS_ENTITY_CONFIG: ValidationConfigWithAddress = {
  maxNameLength: 100,
  maxAddressLength: 500,
  requiredFields: ['name'] as const,
  entityDisplayName: 'entity', // Will be overridden
};

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Helper type to determine the appropriate create input type
 */
export type CreateInputFor<T extends BaseEntity, HasOptionalId extends boolean = false> =
  HasOptionalId extends true
    ? BaseCreateInputWithOptionalId<T>
    : BaseCreateInput<T>;

/**
 * Helper type for update input
 */
export type UpdateInputFor<T extends BaseEntity> = BaseUpdateInput<T>;

/**
 * Helper type for entity rules (simplified)
 */
export type EntityRulesFor<T> = {
  validate: (data: Partial<T>) => string[];
  requiredFields: readonly string[];
  maxNameLength: number;
} & (
  | { maxDescriptionLength: number }
  | { maxAddressLength: number }
  | { maxDescriptionLength: number; maxNciCodeLength: number }
);