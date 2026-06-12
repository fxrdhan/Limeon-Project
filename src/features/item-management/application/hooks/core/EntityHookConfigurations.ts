/**
 * Entity Hook Configuration System
 *
 * Centralizes the table, query, mutation, and external hook metadata for
 * supported item-management entity types.
 */

import type { QueryKey } from '@tanstack/react-query';
import type {
  ItemCategory,
  ItemTypeEntity,
  ItemInventoryUnitEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
  ItemUnitEntity,
  ItemCategoryCreateInput,
  ItemCategoryUpdateInput,
  ItemTypeCreateInput,
  ItemTypeUpdateInput,
  ItemInventoryUnitCreateInput,
  ItemInventoryUnitUpdateInput,
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
const ENTITY_TYPE_KEYS = [
  'categories',
  'types',
  'packages',
  'inventoryUnits',
  'units',
  'dosages',
  'manufacturers',
] as const;

export type EntityTypeKey = (typeof ENTITY_TYPE_KEYS)[number];

export interface EntityTypeMap {
  categories: ItemCategory;
  types: ItemTypeEntity;
  packages: ItemPackage;
  inventoryUnits: ItemInventoryUnitEntity;
  units: ItemUnitEntity;
  dosages: ItemDosageEntity;
  manufacturers: ItemManufacturerEntity;
}

export interface EntityCreateInputMap {
  categories: ItemCategoryCreateInput;
  types: ItemTypeCreateInput;
  packages: ItemPackageCreateInput;
  inventoryUnits: ItemInventoryUnitCreateInput;
  units: ItemUnitCreateInput;
  dosages: ItemDosageCreateInput;
  manufacturers: ItemManufacturerCreateInput;
}

export interface EntityUpdateInputMap {
  categories: ItemCategoryUpdateInput;
  types: ItemTypeUpdateInput;
  packages: ItemPackageUpdateInput;
  inventoryUnits: ItemInventoryUnitUpdateInput;
  units: ItemUnitUpdateInput;
  dosages: ItemDosageUpdateInput;
  manufacturers: ItemManufacturerUpdateInput;
}

export type EntityForType<TEntityType extends EntityTypeKey> =
  EntityTypeMap[TEntityType];

export type CreateInputForEntityType<TEntityType extends EntityTypeKey> =
  EntityCreateInputMap[TEntityType];

export type UpdateInputForEntityType<TEntityType extends EntityTypeKey> =
  EntityUpdateInputMap[TEntityType];

// ============================================================================
// QUERY CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for database queries
 */
export interface EntityQueryConfig {
  /** Database table name */
  tableName: string;
  /** React Query cache key */
  queryKey: QueryKey;
  /** Fields to select from database */
  selectFields: string;
  /** Field to order by */
  orderByField: string;
  /** Entity display name for error messages */
  entityDisplayName: string;
}

/**
 * Configuration for database mutations
 */
export interface EntityMutationConfig {
  /** Database table name */
  tableName: string;
  /** React Query cache key for invalidation */
  queryKey: QueryKey;
  /** Fields to select after mutation */
  selectFields: string;
  /** Entity display name for error messages */
  entityDisplayName: string;
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
export interface EntityConfig {
  /** Query configuration */
  query: EntityQueryConfig;
  /** Mutation configuration */
  mutation: EntityMutationConfig;
  /** External hook integration */
  external: EntityExternalHookConfig;
}

// ============================================================================
// CENTRALIZED ENTITY CONFIGURATIONS
// ============================================================================

/**
 * Categories entity configuration
 */
const CATEGORIES_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_categories',
    queryKey: QueryKeys.masterData.categories.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'kategori',
  },
  mutation: {
    tableName: 'item_categories',
    queryKey: QueryKeys.masterData.categories.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'kategori',
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
const TYPES_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_types',
    queryKey: QueryKeys.masterData.types.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'jenis item',
  },
  mutation: {
    tableName: 'item_types',
    queryKey: QueryKeys.masterData.types.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'jenis item',
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
const PACKAGES_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_packages',
    queryKey: QueryKeys.masterData.packages.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'kemasan',
  },
  mutation: {
    tableName: 'item_packages',
    queryKey: QueryKeys.masterData.packages.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'kemasan',
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useMasterData',
    dataHookName: 'usePackages',
    mutationsHookImportPath: '@/hooks/queries/useMasterData',
    mutationsHookName: 'usePackageMutations',
  },
};

/**
 * Inventory units entity configuration
 */
const INVENTORY_UNITS_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_inventory_units',
    queryKey: QueryKeys.masterData.inventoryUnits.all,
    selectFields:
      'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at',
    orderByField: 'name',
    entityDisplayName: 'unit stok/jual',
  },
  mutation: {
    tableName: 'item_inventory_units',
    queryKey: QueryKeys.masterData.inventoryUnits.all,
    selectFields:
      'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at',
    entityDisplayName: 'unit stok/jual',
  },
  external: {
    dataHookImportPath: '@/hooks/queries/useMasterData',
    dataHookName: 'useInventoryUnits',
    mutationsHookImportPath: '@/hooks/queries/useMasterData',
    mutationsHookName: 'useInventoryUnitMutations',
  },
};

/**
 * Units entity configuration
 */
const UNITS_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_units',
    queryKey: QueryKeys.masterData.itemUnits.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'satuan',
  },
  mutation: {
    tableName: 'item_units',
    queryKey: QueryKeys.masterData.itemUnits.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'satuan',
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
const DOSAGES_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_dosages',
    queryKey: QueryKeys.masterData.dosages.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    orderByField: 'code',
    entityDisplayName: 'sediaan',
  },
  mutation: {
    tableName: 'item_dosages',
    queryKey: QueryKeys.masterData.dosages.all,
    selectFields: 'id, code, name, description, created_at, updated_at',
    entityDisplayName: 'sediaan',
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
const MANUFACTURERS_CONFIG: EntityConfig = {
  query: {
    tableName: 'item_manufacturers',
    queryKey: QueryKeys.masterData.manufacturers.all,
    selectFields: 'id, code, name, address, created_at, updated_at', // Note: address instead of description
    orderByField: 'name', // Note: order by name instead of code
    entityDisplayName: 'produsen',
  },
  mutation: {
    tableName: 'item_manufacturers',
    queryKey: QueryKeys.masterData.manufacturers.all,
    selectFields: 'id, code, name, address, created_at, updated_at',
    entityDisplayName: 'produsen',
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
  inventoryUnits: INVENTORY_UNITS_CONFIG,
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
  return [...ENTITY_TYPE_KEYS];
}

/**
 * Check if an entity type is supported
 */
export function isEntityTypeSupported(
  entityType: string
): entityType is EntityTypeKey {
  return Object.prototype.hasOwnProperty.call(
    ENTITY_CONFIGURATIONS,
    entityType
  );
}

export function getEntityTypeForTableName(
  tableName: string
): EntityTypeKey | undefined {
  return ENTITY_TYPE_KEYS.find(
    entityType =>
      ENTITY_CONFIGURATIONS[entityType].query.tableName === tableName
  );
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
