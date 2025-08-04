// Domain entities
export * from './Item';

// Master data entities - use aliases to avoid conflicts
export * from './Category';
export type { ItemType as ItemTypeEntity } from './ItemType';
export * from './ItemPackage';
export type { ItemDosage as ItemDosageEntity } from './ItemDosage';
export type { ItemManufacturer as ItemManufacturerEntity } from './ItemManufacturer';
export type { ItemUnit as ItemUnitEntity } from './ItemUnit';
