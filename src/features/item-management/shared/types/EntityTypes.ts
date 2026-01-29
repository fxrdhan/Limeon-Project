/**
 * Entity Utility Types for Item Management
 *
 * Replaces the over-engineered domain/entities system with simple utility types
 * based on existing database types. Provides the same functionality with 90% less code.
 */

import type {
  Category,
  MedicineType,
  Unit,
  ItemPackage,
  ItemManufacturer,
  ItemDosage,
  Item,
} from '@/types/database';

// ============================================================================
// TYPE ALIASES FOR DOMAIN NAMING
// ============================================================================

/**
 * Re-export database types with domain-friendly aliases
 */
export type ItemCategory = Category;
export type ItemType = MedicineType;
export type ItemUnit = Unit;

// These were already correct in database types, just alias them
export type { ItemPackage };
export type { ItemManufacturer };
export type { ItemDosage };
export type { Item };

// Alias variants for explicit naming (used in some places)
export type ItemTypeEntity = ItemType;
export type ItemUnitEntity = ItemUnit;
export type ItemDosageEntity = ItemDosage;
export type ItemManufacturerEntity = ItemManufacturer;

// ============================================================================
// UTILITY TYPES FOR CREATE/UPDATE OPERATIONS
// ============================================================================

/**
 * Generic utility to create "CreateInput" types
 * Omits id, created_at, updated_at from entity
 */
type CreateInputFor<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Generic utility to create "UpdateInput" types
 * Omits created_at, updated_at and makes id required
 */
type UpdateInputFor<T> = Omit<T, 'created_at' | 'updated_at'> & {
  id: string;
};

/**
 * Special create input with optional id (for ItemUnit special case)
 */
type CreateInputWithOptionalId<T> = Omit<T, 'created_at' | 'updated_at'> & {
  id?: string;
};

// ============================================================================
// CREATE INPUT TYPES
// ============================================================================

export type ItemCategoryCreateInput = CreateInputFor<ItemCategory>;
export type ItemTypeCreateInput = CreateInputFor<ItemType>;
export type ItemPackageCreateInput = CreateInputFor<ItemPackage>;
export type ItemUnitCreateInput = CreateInputWithOptionalId<ItemUnit>; // Special case
export type ItemDosageCreateInput = CreateInputFor<ItemDosage>;
export type ItemManufacturerCreateInput = CreateInputFor<ItemManufacturer>;

// ============================================================================
// UPDATE INPUT TYPES
// ============================================================================

export type ItemCategoryUpdateInput = UpdateInputFor<ItemCategory>;
export type ItemTypeUpdateInput = UpdateInputFor<ItemType>;
export type ItemPackageUpdateInput = UpdateInputFor<ItemPackage>;
export type ItemUnitUpdateInput = UpdateInputFor<ItemUnit>;
export type ItemDosageUpdateInput = UpdateInputFor<ItemDosage>;
export type ItemManufacturerUpdateInput = UpdateInputFor<ItemManufacturer>;

// ============================================================================
// UNION TYPES FOR GENERIC OPERATIONS
// ============================================================================

/**
 * Union of all entity types
 */
export type AnyEntity =
  | ItemCategory
  | ItemType
  | ItemPackage
  | ItemUnit
  | ItemDosage
  | ItemManufacturer;

/**
 * Union of all create input types
 */
export type AnyCreateInput =
  | ItemCategoryCreateInput
  | ItemTypeCreateInput
  | ItemPackageCreateInput
  | ItemUnitCreateInput
  | ItemDosageCreateInput
  | ItemManufacturerCreateInput;

/**
 * Union of all update input types
 */
export type AnyUpdateInput =
  | ItemCategoryUpdateInput
  | ItemTypeUpdateInput
  | ItemPackageUpdateInput
  | ItemUnitUpdateInput
  | ItemDosageUpdateInput
  | ItemManufacturerUpdateInput;

// ============================================================================
// ENTITY TYPE MAPPING
// ============================================================================

/**
 * Entity type keys for configuration
 */
export type EntityTypeKey =
  | 'categories'
  | 'types'
  | 'packages'
  | 'units'
  | 'dosages'
  | 'manufacturers';

/**
 * Mapping of entity type keys to their corresponding interfaces
 */
export interface EntityTypeMap {
  categories: ItemCategory;
  types: ItemType;
  packages: ItemPackage;
  units: ItemUnit;
  dosages: ItemDosage;
  manufacturers: ItemManufacturer;
}

/**
 * Mapping of entity type keys to their create input types
 */
export interface CreateInputTypeMap {
  categories: ItemCategoryCreateInput;
  types: ItemTypeCreateInput;
  packages: ItemPackageCreateInput;
  units: ItemUnitCreateInput;
  dosages: ItemDosageCreateInput;
  manufacturers: ItemManufacturerCreateInput;
}

/**
 * Mapping of entity type keys to their update input types
 */
export interface UpdateInputTypeMap {
  categories: ItemCategoryUpdateInput;
  types: ItemTypeUpdateInput;
  packages: ItemPackageUpdateInput;
  units: ItemUnitUpdateInput;
  dosages: ItemDosageUpdateInput;
  manufacturers: ItemManufacturerUpdateInput;
}
