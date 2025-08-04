import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  DBItem,
  PackageConversion,
  DBPackageConversion,
} from '@/types/database';
import type { Item } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

export class ItemsService extends BaseService<DBItem> {
  constructor() {
    super('items');
  }

  // Override getAll to include related data
  async getAll(options: Parameters<BaseService<DBItem>['getAll']>[0] = {}) {
    try {
      const defaultSelect = `
        *,
        item_categories!inner(id, name),
        item_types!inner(id, name),
        item_packages!inner(id, name)
      `;

      const result = await super.getAll({
        ...options,
        select: options.select || defaultSelect,
      });

      if (result.error || !result.data) {
        return result;
      }

      // Get manufacturer data separately
      const { data: manufacturers } = await supabase
        .from('item_manufacturers')
        .select('id, name');

      const manufacturerMap = new Map(
        manufacturers?.map(m => [m.id, m.name]) || []
      );

      // Transform the data to the expected format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = (result.data as any[]).map((item: any) => {
        // Parse unit conversions
        let packageConversions: PackageConversion[] = [];
        if (item.package_conversions) {
          if (typeof item.package_conversions === 'string') {
            try {
              packageConversions = JSON.parse(item.package_conversions);
            } catch {
              packageConversions = [];
            }
          } else if (Array.isArray(item.package_conversions)) {
            packageConversions = item.package_conversions;
          }
        }

        // Get manufacturer name from map
        const manufacturerName = item.manufacturer
          ? manufacturerMap.get(item.manufacturer) || ''
          : '';

        // Transform to Item interface
        return {
          ...item,
          category: item.item_categories || { name: '' },
          type: item.item_types || { name: '' },
          unit: item.item_packages || { name: '' },
          manufacturer: manufacturerName,
          package_conversions: packageConversions,
          base_unit: item.item_packages?.name || '',
        };
      });

      return {
        ...result,
        data: transformedData,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get item with full details including unit conversions
  async getItemWithDetails(id: string): Promise<ServiceResponse<Item>> {
    try {
      const { data: item, error } = await supabase
        .from('items')
        .select(
          `
          *,
          item_categories!inner(id, name),
          item_types!inner(id, name),
          item_packages!inner(id, name)
        `
        )
        .eq('id', id)
        .single();

      if (error || !item) {
        return { data: null, error };
      }

      // Get manufacturer name if exists
      let manufacturerName = '';
      if (item.manufacturer) {
        const { data: manufacturer } = await supabase
          .from('item_manufacturers')
          .select('name')
          .eq('id', item.manufacturer)
          .single();
        manufacturerName = manufacturer?.name || '';
      }

      // Parse unit conversions
      let packageConversions: PackageConversion[] = [];
      if (item.package_conversions) {
        if (typeof item.package_conversions === 'string') {
          try {
            packageConversions = JSON.parse(item.package_conversions);
          } catch {
            packageConversions = [];
          }
        } else if (Array.isArray(item.package_conversions)) {
          packageConversions = item.package_conversions;
        }
      }

      // Transform to Item interface
      const transformedItem: Item = {
        ...item,
        category: item.item_categories || { name: '' },
        type: item.item_types || { name: '' },
        unit: item.item_packages || { name: '' },
        manufacturer: manufacturerName,
        package_conversions: packageConversions,
        base_unit: item.item_packages?.name || '',
      };

      return { data: transformedItem, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Search items with related data
  async searchItems(
    query: string,
    options: Parameters<BaseService<DBItem>['getAll']>[0] = {}
  ) {
    try {
      const defaultSelect = `
        *,
        item_categories!inner(id, name),
        item_types!inner(id, name),
        item_packages!inner(id, name)
      `;

      const result = await this.search(
        query,
        ['name', 'code', 'barcode', 'manufacturer'],
        {
          ...options,
          select: options.select || defaultSelect,
        }
      );

      if (result.error || !result.data) {
        return result;
      }

      // Get manufacturer data separately
      const { data: manufacturers } = await supabase
        .from('item_manufacturers')
        .select('id, name');

      const manufacturerMap = new Map(
        manufacturers?.map(m => [m.id, m.name]) || []
      );

      // Transform the data to the expected format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = (result.data as any[]).map((item: any) => {
        // Parse unit conversions
        let packageConversions: PackageConversion[] = [];
        if (item.package_conversions) {
          if (typeof item.package_conversions === 'string') {
            try {
              packageConversions = JSON.parse(item.package_conversions);
            } catch {
              packageConversions = [];
            }
          } else if (Array.isArray(item.package_conversions)) {
            packageConversions = item.package_conversions;
          }
        }

        // Get manufacturer name from map
        const manufacturerName = item.manufacturer
          ? manufacturerMap.get(item.manufacturer) || ''
          : '';

        // Transform to Item interface
        return {
          ...item,
          category: item.item_categories || { name: '' },
          type: item.item_types || { name: '' },
          unit: item.item_packages || { name: '' },
          manufacturer: manufacturerName,
          package_conversions: packageConversions,
          base_unit: item.item_packages?.name || '',
        };
      });

      return {
        ...result,
        data: transformedData,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get items by category
  async getItemsByCategory(categoryId: string) {
    return this.getAll({
      filters: { category_id: categoryId },
      orderBy: { column: 'name', ascending: true },
    });
  }

  // Get items by type
  async getItemsByType(typeId: string) {
    return this.getAll({
      filters: { type_id: typeId },
      orderBy: { column: 'name', ascending: true },
    });
  }

  // Get low stock items
  async getLowStockItems(threshold: number = 10) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(
          `
          *,
          item_categories!inner(id, name),
          item_types!inner(id, name),
          item_packages!inner(id, name)
        `
        )
        .lte('stock', threshold)
        .order('stock', { ascending: true });

      if (error || !data) {
        return { data, error };
      }

      // Get manufacturer data separately
      const { data: manufacturers } = await supabase
        .from('item_manufacturers')
        .select('id, name');

      const manufacturerMap = new Map(
        manufacturers?.map(m => [m.id, m.name]) || []
      );

      // Transform the data to the expected format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData = (data as any[]).map((item: any) => {
        // Parse unit conversions
        let packageConversions: PackageConversion[] = [];
        if (item.package_conversions) {
          if (typeof item.package_conversions === 'string') {
            try {
              packageConversions = JSON.parse(item.package_conversions);
            } catch {
              packageConversions = [];
            }
          } else if (Array.isArray(item.package_conversions)) {
            packageConversions = item.package_conversions;
          }
        }

        // Get manufacturer name from map
        const manufacturerName = item.manufacturer
          ? manufacturerMap.get(item.manufacturer) || ''
          : '';

        // Transform to Item interface
        return {
          ...item,
          category: item.item_categories || { name: '' },
          type: item.item_types || { name: '' },
          unit: item.item_packages || { name: '' },
          manufacturer: manufacturerName,
          package_conversions: packageConversions,
          base_unit: item.item_packages?.name || '',
        };
      });

      return { data: transformedData, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Create item with unit conversions
  async createItemWithConversions(
    itemData: Omit<DBItem, 'id' | 'created_at' | 'updated_at'>,
    packageConversions?: DBPackageConversion[]
  ): Promise<ServiceResponse<DBItem>> {
    try {
      // Prepare item data with unit conversions
      const dataToInsert = {
        ...itemData,
        package_conversions: packageConversions
          ? JSON.stringify(packageConversions)
          : '[]',
      };

      return this.create(dataToInsert);
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Update item with unit conversions
  async updateItemWithConversions(
    id: string,
    itemData: Partial<Omit<DBItem, 'id' | 'created_at'>>,
    packageConversions?: DBPackageConversion[]
  ): Promise<ServiceResponse<DBItem>> {
    try {
      const updateData = { ...itemData };

      if (packageConversions !== undefined) {
        updateData.package_conversions = JSON.stringify(packageConversions);
      }

      return this.update(id, updateData);
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Update stock
  async updateStock(
    id: string,
    newStock: number
  ): Promise<ServiceResponse<DBItem>> {
    return this.update(id, { stock: newStock });
  }

  // Bulk update stock (for purchases/sales)
  async bulkUpdateStock(
    updates: { id: string; stock: number }[]
  ): Promise<ServiceResponse<DBItem[]>> {
    return this.bulkUpdate(
      updates.map(({ id, stock }) => ({ id, data: { stock } }))
    );
  }

  // Check if code exists
  async isCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase.from('items').select('id').eq('code', code);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking code uniqueness:', error);
        return false;
      }

      return !data || data.length === 0;
    } catch {
      return false;
    }
  }

  // Check if barcode exists
  async isBarcodeUnique(barcode: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase.from('items').select('id').eq('barcode', barcode);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking barcode uniqueness:', error);
        return false;
      }

      return !data || data.length === 0;
    } catch {
      return false;
    }
  }
}

export const itemsService = new ItemsService();
