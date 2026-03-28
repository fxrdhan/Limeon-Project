import type {
  DBItem,
  Item,
  ItemInventoryUnit,
  ItemUnitHierarchyEntry,
  PackageConversion,
  DBPackageConversion,
  ItemManufacturer,
} from '@/types/database';
import type { DBItemWithRelations } from '../repositories/ItemRepository';
import { formatItemDisplayName } from '@/lib/item-display';

export class ItemTransformer {
  private static resolveInventoryUnit(
    unit?: {
      id: string;
      code?: string;
      name: string;
      kind: 'packaging' | 'retail_unit' | 'custom';
      source_package_id?: string | null;
      source_dosage_id?: string | null;
      description?: string | null;
    } | null
  ): ItemInventoryUnit {
    return {
      id: unit?.id || '',
      code: unit?.code,
      name: unit?.name || '',
      kind: unit?.kind || 'custom',
      source_package_id: unit?.source_package_id ?? null,
      source_dosage_id: unit?.source_dosage_id ?? null,
      description: unit?.description ?? null,
    };
  }

  private static mapHierarchyEntries(
    dbItem: DBItemWithRelations
  ): ItemUnitHierarchyEntry[] {
    if (!Array.isArray(dbItem.item_unit_hierarchy)) {
      return [];
    }

    const itemBasePrice = Number(dbItem.base_price) || 0;
    const itemSellPrice = Number(dbItem.sell_price) || 0;

    return dbItem.item_unit_hierarchy
      .map(entry => {
        const factorToBase = Number(entry.factor_to_base) || 1;
        const baseOverride =
          entry.base_price_override != null
            ? Number(entry.base_price_override) || 0
            : null;
        const sellOverride =
          entry.sell_price_override != null
            ? Number(entry.sell_price_override) || 0
            : null;

        return {
          id: entry.id,
          item_id: entry.item_id,
          inventory_unit_id: entry.inventory_unit_id,
          parent_inventory_unit_id: entry.parent_inventory_unit_id ?? null,
          contains_quantity: Number(entry.contains_quantity) || 1,
          factor_to_base: factorToBase,
          base_price_override: baseOverride,
          sell_price_override: sellOverride,
          unit: this.resolveInventoryUnit(entry.inventory_unit),
          parent_unit: entry.parent_unit
            ? this.resolveInventoryUnit(entry.parent_unit)
            : null,
          base_price:
            baseOverride != null ? baseOverride : itemBasePrice * factorToBase,
          sell_price:
            sellOverride != null ? sellOverride : itemSellPrice * factorToBase,
        };
      })
      .sort((a, b) => a.factor_to_base - b.factor_to_base);
  }

  private static toLegacyPackageConversions(
    inventoryUnits: ItemUnitHierarchyEntry[]
  ): PackageConversion[] {
    return inventoryUnits
      .filter(entry => entry.factor_to_base > 1)
      .map(entry => ({
        id: entry.id,
        conversion_rate: entry.factor_to_base,
        unit_name: entry.unit.name,
        to_unit_id: entry.inventory_unit_id,
        inventory_unit_id: entry.inventory_unit_id,
        parent_inventory_unit_id: entry.parent_inventory_unit_id ?? null,
        contains_quantity: entry.contains_quantity,
        factor_to_base: entry.factor_to_base,
        base_price_override: entry.base_price_override ?? null,
        sell_price_override: entry.sell_price_override ?? null,
        unit: entry.unit,
        base_price: entry.base_price,
        sell_price: entry.sell_price,
      }));
  }

  /**
   * Parse package conversions from string or array format
   */
  static parsePackageConversions(
    packageConversions: unknown
  ): PackageConversion[] {
    if (!packageConversions) {
      return [];
    }

    if (typeof packageConversions === 'string') {
      try {
        return JSON.parse(packageConversions);
      } catch {
        return [];
      }
    }

    if (Array.isArray(packageConversions)) {
      return packageConversions;
    }

    return [];
  }

  /**
   * Get manufacturer info from JOIN data (no lookup needed!)
   */
  static getManufacturerInfo(
    manufacturerData:
      | { id: string; code?: string; name: string }
      | null
      | undefined
  ): ItemManufacturer {
    // Use JOIN data if available (new FK relationship)
    if (manufacturerData) {
      return {
        id: manufacturerData.id,
        code: manufacturerData.code,
        name: manufacturerData.name,
      };
    }

    return {
      id: '',
      code: undefined,
      name: '',
    };
  }

  /**
   * Transform single DB item to UI Item format
   */
  static transformDBItemToItem(dbItem: DBItemWithRelations): Item {
    const manufacturerInfo = this.getManufacturerInfo(
      dbItem.item_manufacturers
    );
    const inventoryUnits = this.mapHierarchyEntries(dbItem);
    const packageConversions = this.toLegacyPackageConversions(inventoryUnits);
    const resolvedBaseUnit =
      dbItem.base_inventory_unit?.name || dbItem.base_unit || '';
    const customerLevelDiscounts = Array.isArray(
      dbItem.customer_level_discounts
    )
      ? dbItem.customer_level_discounts.map(discount => ({
          customer_level_id: discount.customer_level_id,
          discount_percentage: Number(discount.discount_percentage) || 0,
        }))
      : [];

    return {
      ...dbItem,
      display_name: formatItemDisplayName({
        name: dbItem.name,
        measurement_value: dbItem.measurement_value ?? null,
        measurement_unit: dbItem.measurement_unit || null,
        measurement_denominator_value:
          dbItem.measurement_denominator_value ?? null,
        measurement_denominator_unit:
          dbItem.measurement_denominator_unit || null,
      }),
      category: dbItem.item_categories || { name: '' },
      type: dbItem.item_types || { name: '' },
      package: dbItem.item_packages || { name: '' }, // Kemasan dari item_packages
      unit: { name: resolvedBaseUnit },
      dosage: dbItem.item_dosages || { name: '' },
      measurement_value: dbItem.measurement_value ?? null,
      measurement_unit: dbItem.measurement_unit || null,
      measurement_denominator_value:
        dbItem.measurement_denominator_value ?? null,
      measurement_denominator_unit: dbItem.measurement_denominator_unit || null,
      manufacturer: manufacturerInfo,
      package_conversions: packageConversions,
      inventory_units: inventoryUnits,
      base_inventory_unit_id: dbItem.base_inventory_unit_id ?? null,
      base_unit: resolvedBaseUnit,
      image_urls: Array.isArray(dbItem.image_urls) ? dbItem.image_urls : [],
      is_level_pricing_active:
        dbItem.is_level_pricing_active !== undefined
          ? Boolean(dbItem.is_level_pricing_active)
          : true,
      customer_level_discounts: customerLevelDiscounts,
    };
  }

  /**
   * Transform array of DB items to UI Items format
   */
  static transformDBItemsToItems(dbItems: DBItemWithRelations[]): Item[] {
    return dbItems.map(item => this.transformDBItemToItem(item));
  }

  /**
   * Transform UI Item data to DB format for creation
   */
  static transformItemToDBItem(
    itemData: Omit<DBItem, 'id' | 'created_at' | 'updated_at'>,
    packageConversions?: DBPackageConversion[]
  ): Omit<DBItem, 'id' | 'created_at' | 'updated_at'> {
    return {
      ...itemData,
      package_conversions: packageConversions
        ? JSON.stringify(packageConversions)
        : '[]',
    };
  }

  /**
   * Transform UI Item data to DB format for updates
   */
  static transformItemUpdateToDBItem(
    itemData: Partial<Omit<DBItem, 'id' | 'created_at'>>,
    packageConversions?: DBPackageConversion[]
  ): Partial<Omit<DBItem, 'id' | 'created_at'>> {
    const updateData = { ...itemData };

    if (packageConversions !== undefined) {
      updateData.package_conversions = JSON.stringify(packageConversions);
    }

    return updateData;
  }

  /**
   * Validate item data before transformation
   */
  static validateItemData(itemData: Partial<DBItem>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!itemData.name?.trim()) {
      errors.push('Item name is required');
    }

    if (!itemData.code?.trim()) {
      errors.push('Item code is required');
    }

    if (itemData.stock !== undefined && itemData.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create empty item template for forms
   */
  static createEmptyItem(): Partial<Item> {
    return {
      name: '',
      display_name: '',
      code: '',
      barcode: '',
      stock: 0,
      base_price: 0,
      sell_price: 0,
      category: { name: '' },
      type: { name: '' },
      package: { name: '' }, // Kemasan
      unit: { name: '' }, // Satuan
      dosage: { name: '' },
      manufacturer: { id: '', code: undefined, name: '' },
      package_conversions: [],
      inventory_units: [],
      base_inventory_unit_id: null,
      base_unit: '',
      measurement_value: null,
      measurement_unit: null,
      measurement_denominator_value: null,
      measurement_denominator_unit: null,
    };
  }

  /**
   * Extract search-relevant fields from item
   */
  static extractSearchableFields(item: Item): string[] {
    return [
      item.display_name || '',
      item.name || '',
      item.code || '',
      item.barcode || '',
      item.manufacturer?.name || '',
      item.category?.name || '',
      item.type?.name || '',
    ].filter(field => field.trim() !== '');
  }

  /**
   * Calculate total package units based on conversions
   */
  static calculateTotalUnits(
    stock: number,
    inventoryUnits: ItemUnitHierarchyEntry[]
  ): number {
    const derivedUnits = inventoryUnits.filter(unit => unit.factor_to_base > 1);
    if (!derivedUnits.length) {
      return stock;
    }

    // Find the largest package conversion rate
    const maxRate = Math.max(...derivedUnits.map(unit => unit.factor_to_base));
    return stock * maxRate;
  }

  /**
   * Format stock display with unit conversions
   */
  static formatStockDisplay(
    stock: number,
    inventoryUnits: ItemUnitHierarchyEntry[],
    baseUnit: string
  ): string {
    const derivedUnits = inventoryUnits.filter(unit => unit.factor_to_base > 1);
    if (!derivedUnits.length) {
      return `${stock} ${baseUnit}`;
    }

    // Display stock in largest unit first
    const sorted = [...derivedUnits].sort(
      (a, b) => b.factor_to_base - a.factor_to_base
    );

    let remaining = stock;
    const parts: string[] = [];

    for (const inventoryUnit of sorted) {
      const rate = inventoryUnit.factor_to_base || 1;
      const units = Math.floor(remaining / rate);

      if (units > 0) {
        parts.push(`${units} ${inventoryUnit.unit.name}`);
        remaining = remaining % rate;
      }
    }

    if (remaining > 0) {
      parts.push(`${remaining} ${baseUnit}`);
    }

    return parts.join(', ') || `0 ${baseUnit}`;
  }
}
