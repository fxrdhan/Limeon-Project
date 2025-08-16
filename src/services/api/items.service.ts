import { BaseService, ServiceResponse } from './base.service';
import {
  itemRepository,
  ItemQueryOptions,
} from '../repositories/ItemRepository';
import { ItemTransformer } from '../transformers/ItemTransformer';
import type { DBItem, DBPackageConversion, Item } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

export class ItemsService extends BaseService<DBItem> {
  constructor() {
    super('items');
  }

  /**
   * Get all items with related data (optimized with caching)
   */
  async getAll(
    options: ItemQueryOptions = {}
  ): Promise<ServiceResponse<Item[]>> {
    try {
      // Get items from repository
      const { data: dbItems, error } = await itemRepository.getItems({
        ...options,
        orderBy: options.orderBy || { column: 'name', ascending: true },
      });

      if (error || !dbItems) {
        return { data: null, error };
      }

      // Transform data using transformer (manufacturer data included in JOIN)
      const transformedData = ItemTransformer.transformDBItemsToItems(dbItems);

      return { data: transformedData, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Get single item with full details
   */
  async getItemWithDetails(id: string): Promise<ServiceResponse<Item>> {
    try {
      // Get item from repository
      const { data: dbItem, error } = await itemRepository.getItemById(id);

      if (error || !dbItem) {
        return { data: null, error };
      }

      // Transform data using transformer (manufacturer data included in JOIN)
      const transformedItem = ItemTransformer.transformDBItemToItem(dbItem);

      return { data: transformedItem, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Search items with related data
   */
  async searchItems(
    query: string,
    options: ItemQueryOptions = {}
  ): Promise<ServiceResponse<Item[]>> {
    try {
      // Search using repository (using joined manufacturer table)
      const { data: dbItems, error } = await itemRepository.searchItems(
        query,
        ['name', 'code', 'barcode', 'item_manufacturers.name'],
        {
          ...options,
          orderBy: options.orderBy || { column: 'name', ascending: true },
        }
      );

      if (error || !dbItems) {
        return { data: null, error };
      }

      // Transform data using transformer (manufacturer data included in JOIN)
      const transformedData = ItemTransformer.transformDBItemsToItems(dbItems);

      return { data: transformedData, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(
    categoryId: string
  ): Promise<ServiceResponse<Item[]>> {
    return this.getAll({
      filters: { category_id: categoryId },
      orderBy: { column: 'name', ascending: true },
    });
  }

  /**
   * Get items by type
   */
  async getItemsByType(typeId: string): Promise<ServiceResponse<Item[]>> {
    return this.getAll({
      filters: { type_id: typeId },
      orderBy: { column: 'name', ascending: true },
    });
  }

  /**
   * Get low stock items (optimized)
   */
  async getLowStockItems(
    threshold: number = 10
  ): Promise<ServiceResponse<Item[]>> {
    try {
      // Get low stock items from repository
      const { data: dbItems, error } =
        await itemRepository.getLowStockItems(threshold);

      if (error || !dbItems) {
        return { data: null, error };
      }

      // Transform data using transformer (manufacturer data included in JOIN)
      const transformedData = ItemTransformer.transformDBItemsToItems(dbItems);

      return { data: transformedData, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Create item with unit conversions (with validation)
   */
  async createItemWithConversions(
    itemData: Omit<DBItem, 'id' | 'created_at' | 'updated_at'>,
    packageConversions?: DBPackageConversion[]
  ): Promise<ServiceResponse<DBItem>> {
    try {
      // Validate data before processing
      const validation = ItemTransformer.validateItemData(itemData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Transform data for database
      const dataToInsert = ItemTransformer.transformItemToDBItem(
        itemData,
        packageConversions
      );

      return this.create(dataToInsert);
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Update item with unit conversions (with validation)
   */
  async updateItemWithConversions(
    id: string,
    itemData: Partial<Omit<DBItem, 'id' | 'created_at'>>,
    packageConversions?: DBPackageConversion[]
  ): Promise<ServiceResponse<DBItem>> {
    try {
      // Validate data before processing
      if (Object.keys(itemData).length > 0) {
        const validation = ItemTransformer.validateItemData(itemData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Transform data for database
      const updateData = ItemTransformer.transformItemUpdateToDBItem(
        itemData,
        packageConversions
      );

      return this.update(id, updateData);
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Update stock
   */
  async updateStock(
    id: string,
    newStock: number
  ): Promise<ServiceResponse<DBItem>> {
    if (newStock < 0) {
      return {
        data: null,
        error: { message: 'Stock cannot be negative' } as PostgrestError,
      };
    }

    return this.update(id, { stock: newStock });
  }

  /**
   * Bulk update stock (for purchases/sales)
   */
  async bulkUpdateStock(
    updates: { id: string; stock: number }[]
  ): Promise<ServiceResponse<DBItem[]>> {
    // Validate all stock values
    for (const update of updates) {
      if (update.stock < 0) {
        return {
          data: null,
          error: {
            message: `Stock cannot be negative for item ${update.id}`,
          } as PostgrestError,
        };
      }
    }

    return this.bulkUpdate(
      updates.map(({ id, stock }) => ({ id, data: { stock } }))
    );
  }

  /**
   * Check if code is unique (using repository)
   */
  async isCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    return itemRepository.isCodeUnique(code, excludeId);
  }

  /**
   * Check if barcode is unique (using repository)
   */
  async isBarcodeUnique(barcode: string, excludeId?: string): Promise<boolean> {
    return itemRepository.isBarcodeUnique(barcode, excludeId);
  }

  /**
   * Get formatted stock display for an item
   */
  async getFormattedStock(id: string): Promise<string> {
    try {
      const result = await this.getItemWithDetails(id);
      if (!result.data) {
        return '0';
      }

      const item = result.data;
      return ItemTransformer.formatStockDisplay(
        item.stock || 0,
        item.package_conversions || [],
        item.base_unit || ''
      );
    } catch {
      return '0';
    }
  }

  /**
   * No cache to clear - manufacturer data comes from JOIN!
   */

  /**
   * Create empty item template
   */
  createEmptyItem(): Partial<Item> {
    return ItemTransformer.createEmptyItem();
  }
}

export const itemsService = new ItemsService();
