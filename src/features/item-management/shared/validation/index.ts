/**
 * Centralized Validation Rules for Item Management
 *
 * Replaces the over-engineered domain/entities validation system
 * with simple, focused validation functions.
 */

import type {
  Category,
  MedicineType,
  Unit,
  ItemPackage,
  ItemManufacturer,
  ItemDosage,
} from '@/types/database';

// ============================================================================
// VALIDATION CONFIGURATIONS
// ============================================================================

interface ValidationConfig {
  maxNameLength: number;
  maxDescriptionLength?: number;
  maxAddressLength?: number;
  maxNciCodeLength?: number;
  entityDisplayName: string;
  requiredFields: readonly string[];
}

const STANDARD_CONFIG: Omit<ValidationConfig, 'entityDisplayName'> = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  requiredFields: ['name'] as const,
};

const NCI_CONFIG: Omit<ValidationConfig, 'entityDisplayName'> = {
  ...STANDARD_CONFIG,
  maxNciCodeLength: 20,
};

// ============================================================================
// ENTITY-SPECIFIC CONFIGURATIONS
// ============================================================================

export const VALIDATION_CONFIGS = {
  categories: {
    ...STANDARD_CONFIG,
    entityDisplayName: 'kategori',
  },
  types: {
    ...STANDARD_CONFIG,
    entityDisplayName: 'jenis item',
  },
  packages: {
    ...NCI_CONFIG,
    entityDisplayName: 'kemasan',
  },
  units: {
    ...STANDARD_CONFIG,
    entityDisplayName: 'satuan',
  },
  dosages: {
    ...NCI_CONFIG,
    entityDisplayName: 'dosis',
  },
  manufacturers: {
    maxNameLength: 100,
    maxAddressLength: 500,
    requiredFields: ['name'] as const,
    entityDisplayName: 'manufaktur',
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Generic validator for standard entities (with description)
 */
function validateStandardEntity<
  T extends { name?: string; description?: string },
>(data: Partial<T>, config: ValidationConfig): string[] {
  const errors: string[] = [];

  // Name validation
  if (!data.name?.trim()) {
    errors.push(`Nama ${config.entityDisplayName} wajib diisi`);
  } else if (data.name.length > config.maxNameLength) {
    errors.push(
      `Nama ${config.entityDisplayName} maksimal ${config.maxNameLength} karakter`
    );
  }

  // Description validation
  if (
    config.maxDescriptionLength &&
    data.description &&
    data.description.length > config.maxDescriptionLength
  ) {
    errors.push(`Deskripsi maksimal ${config.maxDescriptionLength} karakter`);
  }

  return errors;
}

/**
 * Validator for entities with NCI code
 */
function validateNciEntity<
  T extends { name?: string; description?: string; nci_code?: string },
>(data: Partial<T>, config: ValidationConfig): string[] {
  const errors = validateStandardEntity(data, config);

  // NCI code validation
  if (
    config.maxNciCodeLength &&
    data.nci_code &&
    data.nci_code.length > config.maxNciCodeLength
  ) {
    errors.push(`Kode NCI maksimal ${config.maxNciCodeLength} karakter`);
  }

  return errors;
}

/**
 * Validator for manufacturer (with address)
 */
function validateManufacturer(
  data: Partial<ItemManufacturer>,
  config: ValidationConfig
): string[] {
  const errors: string[] = [];

  // Name validation
  if (!data.name?.trim()) {
    errors.push(`Nama ${config.entityDisplayName} wajib diisi`);
  } else if (data.name.length > config.maxNameLength) {
    errors.push(
      `Nama ${config.entityDisplayName} maksimal ${config.maxNameLength} karakter`
    );
  }

  // Address validation
  if (
    config.maxAddressLength &&
    data.address &&
    data.address.length > config.maxAddressLength
  ) {
    errors.push(`Alamat maksimal ${config.maxAddressLength} karakter`);
  }

  return errors;
}

// ============================================================================
// EXPORTED VALIDATION RULES
// ============================================================================

export const EntityValidation = {
  // Categories
  categories: {
    maxNameLength: VALIDATION_CONFIGS.categories.maxNameLength,
    maxDescriptionLength: VALIDATION_CONFIGS.categories.maxDescriptionLength!,
    requiredFields: VALIDATION_CONFIGS.categories.requiredFields,
    validate: (data: Partial<Category>) =>
      validateStandardEntity(data, VALIDATION_CONFIGS.categories),
  },

  // Types
  types: {
    maxNameLength: VALIDATION_CONFIGS.types.maxNameLength,
    maxDescriptionLength: VALIDATION_CONFIGS.types.maxDescriptionLength!,
    requiredFields: VALIDATION_CONFIGS.types.requiredFields,
    validate: (data: Partial<MedicineType>) =>
      validateStandardEntity(data, VALIDATION_CONFIGS.types),
  },

  // Packages
  packages: {
    maxNameLength: VALIDATION_CONFIGS.packages.maxNameLength,
    maxDescriptionLength: VALIDATION_CONFIGS.packages.maxDescriptionLength!,
    maxNciCodeLength: VALIDATION_CONFIGS.packages.maxNciCodeLength!,
    requiredFields: VALIDATION_CONFIGS.packages.requiredFields,
    validate: (data: Partial<ItemPackage>) =>
      validateNciEntity(data, VALIDATION_CONFIGS.packages),
  },

  // Units
  units: {
    maxNameLength: VALIDATION_CONFIGS.units.maxNameLength,
    maxDescriptionLength: VALIDATION_CONFIGS.units.maxDescriptionLength!,
    requiredFields: VALIDATION_CONFIGS.units.requiredFields,
    validate: (data: Partial<Unit>) =>
      validateStandardEntity(data, VALIDATION_CONFIGS.units),
  },

  // Dosages
  dosages: {
    maxNameLength: VALIDATION_CONFIGS.dosages.maxNameLength,
    maxDescriptionLength: VALIDATION_CONFIGS.dosages.maxDescriptionLength!,
    maxNciCodeLength: VALIDATION_CONFIGS.dosages.maxNciCodeLength!,
    requiredFields: VALIDATION_CONFIGS.dosages.requiredFields,
    validate: (data: Partial<ItemDosage>) =>
      validateNciEntity(data, VALIDATION_CONFIGS.dosages),
  },

  // Manufacturers
  manufacturers: {
    maxNameLength: VALIDATION_CONFIGS.manufacturers.maxNameLength,
    maxAddressLength: VALIDATION_CONFIGS.manufacturers.maxAddressLength!,
    requiredFields: VALIDATION_CONFIGS.manufacturers.requiredFields,
    validate: (data: Partial<ItemManufacturer>) =>
      validateManufacturer(data, VALIDATION_CONFIGS.manufacturers),
  },
} as const;
