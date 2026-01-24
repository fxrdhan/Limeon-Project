import type {
  DBItem,
  Item,
  PackageConversion,
  DBPackageConversion,
  ItemManufacturer,
} from '@/types/database';
import type { DBItemWithRelations } from '../repositories/ItemRepository';

export class ItemTransformer {
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
      | undefined,
    legacyManufacturerName?: string
  ): ItemManufacturer {
    // Use JOIN data if available (new FK relationship)
    if (manufacturerData) {
      return {
        id: manufacturerData.id,
        code: manufacturerData.code,
        name: manufacturerData.name,
      };
    }

    // Fallback for legacy data (should be rare after migration)
    return {
      id: '',
      code: undefined,
      name: legacyManufacturerName || '',
    };
  }

  /**
   * Transform single DB item to UI Item format
   */
  static transformDBItemToItem(dbItem: DBItemWithRelations): Item {
    const manufacturerInfo = this.getManufacturerInfo(
      dbItem.item_manufacturers,
      dbItem.manufacturer // Fallback for legacy data
    );
    const packageConversions = this.parsePackageConversions(
      dbItem.package_conversions
    );
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
      category: dbItem.item_categories || { name: '' },
      type: dbItem.item_types || { name: '' },
      package: dbItem.item_packages || { name: '' }, // Kemasan dari item_packages
      unit: { name: dbItem.base_unit || '' }, // Satuan dari base_unit string
      dosage: dbItem.item_dosages || { name: '' },
      manufacturer: manufacturerInfo,
      package_conversions: packageConversions,
      base_unit: dbItem.base_unit || '', // base_unit tetap dari field base_unit
      image_urls: Array.isArray(dbItem.image_urls) ? dbItem.image_urls : [],
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
      base_unit: '',
    };
  }

  /**
   * Extract search-relevant fields from item
   */
  static extractSearchableFields(item: Item): string[] {
    return [
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
    packageConversions: PackageConversion[]
  ): number {
    if (!packageConversions.length) {
      return stock;
    }

    // Find the largest package conversion rate
    const maxRate = Math.max(
      ...packageConversions.map(pc => pc.conversion_rate || 1)
    );
    return stock * maxRate;
  }

  /**
   * Format stock display with unit conversions
   */
  static formatStockDisplay(
    stock: number,
    packageConversions: PackageConversion[],
    baseUnit: string
  ): string {
    if (!packageConversions.length) {
      return `${stock} ${baseUnit}`;
    }

    // Display stock in largest unit first
    const sorted = packageConversions.sort(
      (a, b) => (b.conversion_rate || 1) - (a.conversion_rate || 1)
    );

    let remaining = stock;
    const parts: string[] = [];

    for (const conversion of sorted) {
      const rate = conversion.conversion_rate || 1;
      const units = Math.floor(remaining / rate);

      if (units > 0) {
        parts.push(`${units} ${conversion.unit_name}`);
        remaining = remaining % rate;
      }
    }

    if (remaining > 0) {
      parts.push(`${remaining} ${baseUnit}`);
    }

    return parts.join(', ') || `0 ${baseUnit}`;
  }
}
