/**
 * Entity Hook Configuration System
 *
 * This module provides a centralized configuration system for entity-related hooks,
 * eliminating massive switch statements and providing type-safe entity operations.
 *
 * Replaces:
 * - useEntityCrudOperations switch statements (376 lines)
 * - useGenericEntityManagement switch logic (270 lines)
 * - useItemQueries duplication (94 lines)
 * - useItemMutations duplication (500+ lines)
 */

import type {
  ItemCategory,
  ItemTypeEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
  ItemUnitEntity,
  ItemCategoryCreateInput,
  ItemCategoryUpdateInput,
  ItemTypeCreateInput,
  ItemTypeUpdateInput,
  ItemUnitCreateInput,
  ItemUnitUpdateInput,
  ItemDosageCreateInput,
  ItemDosageUpdateInput,
  ItemPackageCreateInput,
  ItemPackageUpdateInput,
  ItemManufacturerCreateInput,
  ItemManufacturerUpdateInput,
} from '../../../shared/types';
import { QueryKeys } from '@/constants/queryKeys';

// ============================================================================
// ENTITY TYPE DEFINITIONS
// ============================================================================

/**
 * Supported entity types for configuration
 */
export type EntityTypeKey =
  | 'categories'
  | 'types'
  | 'packages'
  | 'units'
  | 'dosages'
  | 'manufacturers';

/**
 * Union type of all entity interfaces
 */
export type AnyEntity =
  | ItemCategory
  | ItemTypeEntity
  | ItemPackage
  | ItemUnitEntity
  | ItemDosageEntity
  | ItemManufacturerEntity;

/**
 * Union type of all create input interfaces
 */
export type AnyCreateInput =
  | ItemCategoryCreateInput
  | ItemTypeCreateInput
  | ItemPackageCreateInput
  | ItemUnitCreateInput
  | ItemDosageCreateInput
  | ItemManufacturerCreateInput;

/**
 * Union type of all update input interfaces
 */
export type AnyUpdateInput =
  | ItemCategoryUpdateInput
  | ItemTypeUpdateInput
  | ItemPackageUpdateInput
  | ItemUnitUpdateInput
  | ItemDosageUpdateInput
  | ItemManufacturerUpdateInput;

// ============================================================================
// QUERY CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for database queries
 */
export interface EntityQueryConfig<TEntity extends AnyEntity> {
  /** Database table name */
  tableName: string;
  /** React Query cache key */
  queryKey: string;
  /** Fields to select from database */
  selectFields: string;
  /** Field to order by */
  orderByField: string;
  /** Entity display name for error messages */
  entityDisplayName: string;
  /** TypeScript type for the entity */
  entityType: () => TEntity; // Function to preserve type info
}

/**
 * Configuration for database mutations
 */
export interface EntityMutationConfig<
  TCreateInput extends AnyCreateInput,
  TUpdateInput extends AnyUpdateInput,
> {
  /** Database table name */
  tableName: string;
  /** React Query cache key for invalidation */
  queryKey: string;
  /** Fields to select after mutation */
  selectFields: string;
  /** Entity display name for error messages */
  entityDisplayName: string;
  /** TypeScript type for create input */
  createInputType: () => TCreateInput;
  /** TypeScript type for update input */
  updateInputType: () => TUpdateInput;
}

/**
 * External hook configuration for integration with existing hooks
 */
export interface EntityExternalHookConfig {
  /** Import path for the data hook */
  dataHookImportPath: string;
  /** Hook function name */
  dataHookName: string;
  /** Import path for the mutations hook */
  mutationsHookImportPath: string;
  /** Mutations hook function name */
  mutationsHookName: string;
}

/**
 * Complete entity configuration
 */
export interface EntityConfig<
  TEntity extends AnyEntity,
  TCreateInput extends AnyCreateInput,
  TUpdateInput extends AnyUpdateInput,
> {
  /** Query configuration */
  query: EntityQueryConfig<TEntity>;
  /** Mutation configuration */
  mutation: EntityMutationConfig<TCreateInput, TUpdateInput>;
  /** External hook integration */
  external: EntityExternalHookConfig;
}

// ============================================================================
// CENTRALIZED ENTITY CONFIGURATIONS
// ============================================================================

/**
 * Categories entity configuration
 */
const CATEGORIES_CONFIG: EntityConfig<
  ItemCategory,
  ItemCategoryCreateInput,
  ItemCategoryUpdateInput
> = {
  query: {
    tableName: 'item_categories',
    queryKey: QueryKeys.legacyEntities.categories,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'kategori',
    entityType: () => ({}) as ItemCategory,
  },
  mutation: {
    tableName: 'item_categories',
    queryKey: QueryKeys.legacyEntities.categories,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'kategori',
    createInputType: () => ({}) as ItemCategoryCreateInput,
    updateInputType: () => ({}) as ItemCategoryUpdateInput,
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useMasterData',
    dataHookName: 'useCategories',
    mutationsHookImportPath: '@/hooks/queries/useMasterData',
    mutationsHookName: 'useCategoryMutations',
  },
};

/**
 * Types entity configuration
 */
const TYPES_CONFIG: EntityConfig<
  ItemTypeEntity,
  ItemTypeCreateInput,
  ItemTypeUpdateInput
> = {
  query: {
    tableName: 'item_types',
    queryKey: QueryKeys.legacyEntities.types,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'jenis item',
    entityType: () => ({}) as ItemTypeEntity,
  },
  mutation: {
    tableName: 'item_types',
    queryKey: QueryKeys.legacyEntities.types,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'jenis item',
    createInputType: () => ({}) as ItemTypeCreateInput,
    updateInputType: () => ({}) as ItemTypeUpdateInput,
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useMasterData',
    dataHookName: 'useMedicineTypes',
    mutationsHookImportPath: '@/hooks/queries/useMasterData',
    mutationsHookName: 'useMedicineTypeMutations',
  },
};

/**
 * Packages entity configuration
 */
const PACKAGES_CONFIG: EntityConfig<
  ItemPackage,
  ItemPackageCreateInput,
  ItemPackageUpdateInput
> = {
  query: {
    tableName: 'item_packages',
    queryKey: QueryKeys.legacyEntities.packages,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'kemasan',
    entityType: () => ({}) as ItemPackage,
  },
  mutation: {
    tableName: 'item_packages',
    queryKey: QueryKeys.legacyEntities.packages,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'kemasan',
    createInputType: () => ({}) as ItemPackageCreateInput,
    updateInputType: () => ({}) as ItemPackageUpdateInput,
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useMasterData',
    dataHookName: 'usePackages',
    mutationsHookImportPath: '@/hooks/queries/useMasterData',
    mutationsHookName: 'usePackageMutations',
  },
};

/**
 * Units entity configuration
 */
const UNITS_CONFIG: EntityConfig<
  ItemUnitEntity,
  ItemUnitCreateInput,
  ItemUnitUpdateInput
> = {
  query: {
    tableName: 'item_units',
    queryKey: QueryKeys.legacyEntities.units,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'satuan',
    entityType: () => ({}) as ItemUnitEntity,
  },
  mutation: {
    tableName: 'item_units',
    queryKey: QueryKeys.legacyEntities.units,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'satuan',
    createInputType: () => ({}) as ItemUnitCreateInput,
    updateInputType: () => ({}) as ItemUnitUpdateInput,
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useMasterData',
    dataHookName: 'useItemUnits',
    mutationsHookImportPath: '@/hooks/queries/useMasterData',
    mutationsHookName: 'useItemUnitMutations',
  },
};

/**
 * Dosages entity configuration
 */
const DOSAGES_CONFIG: EntityConfig<
  ItemDosageEntity,
  ItemDosageCreateInput,
  ItemDosageUpdateInput
> = {
  query: {
    tableName: 'item_dosages',
    queryKey: QueryKeys.legacyEntities.dosages,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'sediaan',
    entityType: () => ({}) as ItemDosageEntity,
  },
  mutation: {
    tableName: 'item_dosages',
    queryKey: QueryKeys.legacyEntities.dosages,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'sediaan',
    createInputType: () => ({}) as ItemDosageCreateInput,
    updateInputType: () => ({}) as ItemDosageUpdateInput,
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useDosages',
    dataHookName: 'useDosages',
    mutationsHookImportPath: '@/hooks/queries/useDosages',
    mutationsHookName: 'useDosageMutations',
  },
};

/**
 * Manufacturers entity configuration
 */
const MANUFACTURERS_CONFIG: EntityConfig<
  ItemManufacturerEntity,
  ItemManufacturerCreateInput,
  ItemManufacturerUpdateInput
> = {
  query: {
    tableName: 'item_manufacturers',
    queryKey: QueryKeys.legacyEntities.manufacturers,
    selectFields: 'id, code, name, address, created_at, updated_at', // Note: address instead of description
    orderByField: 'name', // Note: order by name instead of code
    entityDisplayName: 'produsen',
    entityType: () => ({}) as ItemManufacturerEntity,
  },
  mutation: {
    tableName: 'item_manufacturers',
    queryKey: QueryKeys.legacyEntities.manufacturers,
    selectFields: 'id, code, name, address, created_at, updated_at',
    entityDisplayName: 'produsen',
    createInputType: () => ({}) as ItemManufacturerCreateInput,
    updateInputType: () => ({}) as ItemManufacturerUpdateInput,
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useManufacturers',
    dataHookName: 'useManufacturers',
    mutationsHookImportPath: '@/hooks/queries/useManufacturers',
    mutationsHookName: 'useManufacturerMutations',
  },
};

// ============================================================================
// CONFIGURATION REGISTRY
// ============================================================================

/**
 * Centralized registry of all entity configurations
 *
 * This replaces all switch statements across the codebase with a single
 * configuration lookup system.
 */
export const ENTITY_CONFIGURATIONS = {
  categories: CATEGORIES_CONFIG,
  types: TYPES_CONFIG,
  packages: PACKAGES_CONFIG,
  units: UNITS_CONFIG,
  dosages: DOSAGES_CONFIG,
  manufacturers: MANUFACTURERS_CONFIG,
} as const;

/**
 * Type-safe configuration getter
 */
export function getEntityConfig<T extends EntityTypeKey>(
  entityType: T
): (typeof ENTITY_CONFIGURATIONS)[T] {
  const config = ENTITY_CONFIGURATIONS[entityType];
  if (!config) {
    throw new Error(`Unsupported entity type: ${entityType}`);
  }
  return config;
}

/**
 * Get all supported entity types
 */
export function getSupportedEntityTypes(): EntityTypeKey[] {
  return Object.keys(ENTITY_CONFIGURATIONS) as EntityTypeKey[];
}

/**
 * Check if an entity type is supported
 */
export function isEntityTypeSupported(
  entityType: string
): entityType is EntityTypeKey {
  return entityType in ENTITY_CONFIGURATIONS;
}

// ============================================================================
// CONFIGURATION UTILITIES
// ============================================================================

/**
 * Extract query configuration for an entity type
 */
export function getQueryConfig<T extends EntityTypeKey>(entityType: T) {
  return getEntityConfig(entityType).query;
}

/**
 * Extract mutation configuration for an entity type
 */
export function getMutationConfig<T extends EntityTypeKey>(entityType: T) {
  return getEntityConfig(entityType).mutation;
}

/**
 * Extract external hook configuration for an entity type
 */
export function getExternalHookConfig<T extends EntityTypeKey>(entityType: T) {
  return getEntityConfig(entityType).external;
}
