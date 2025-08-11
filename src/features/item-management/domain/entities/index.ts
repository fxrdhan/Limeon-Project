// Base Entity System - Foundation for all entity types
export * from './BaseEntity';

// Core Domain entities
export * from './Item';

// Master data entities - use aliases to avoid conflicts with global types
export * from './Category';
export type { ItemType as ItemTypeEntity } from './ItemType';
export * from './ItemPackage';
export type { ItemDosage as ItemDosageEntity } from './ItemDosage';
export type { ItemManufacturer as ItemManufacturerEntity } from './ItemManufacturer';
export type { ItemUnit as ItemUnitEntity } from './ItemUnit';

// Re-export individual interfaces for convenience (backward compatibility)
export type { ItemCategory } from './Category';
export type { ItemType } from './ItemType';
export type { ItemDosage } from './ItemDosage';
export type { ItemManufacturer } from './ItemManufacturer';
export type { ItemUnit } from './ItemUnit';

// Re-export create/update input types
export type {
  ItemCategoryCreateInput,
  ItemCategoryUpdateInput,
} from './Category';
export type {
  ItemTypeCreateInput,
  ItemTypeUpdateInput,
} from './ItemType';
export type {
  ItemUnitCreateInput,
  ItemUnitUpdateInput,
} from './ItemUnit';
export type {
  ItemDosageCreateInput,
  ItemDosageUpdateInput,
} from './ItemDosage';
export type {
  ItemPackageCreateInput,
  ItemPackageUpdateInput,
} from './ItemPackage';
export type {
  ItemManufacturerCreateInput,
  ItemManufacturerUpdateInput,
} from './ItemManufacturer';

// Re-export business rules
export { ItemCategoryRules } from './Category';
export { ItemTypeRules } from './ItemType';
export { ItemUnitRules } from './ItemUnit';
export { ItemDosageRules } from './ItemDosage';
export { ItemPackageRules } from './ItemPackage';
export { ItemManufacturerRules } from './ItemManufacturer';
