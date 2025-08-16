import { supabase } from '@/lib/supabase';
import type { ItemManufacturer } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

// Raw database result with joined tables
export interface DBItemWithRelations {
  id: string;
  name: string;
  code?: string;
  barcode?: string | null;
  manufacturer?: string;
  base_price: number;
  sell_price: number;
  stock: number;
  package_conversions: string;
  category_id?: string;
  type_id?: string;
  package_id?: string;
  dosage_id?: string;
  item_categories?: { id: string; code?: string; name: string } | null;
  item_types?: { id: string; code?: string; name: string } | null;
  item_packages?: { id: string; code?: string; name: string } | null;
  item_dosages?: { id: string; code?: string; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface ItemQueryOptions {
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  select?: string;
}

export interface ItemRepositoryResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

export class ItemRepository {
  private static readonly DEFAULT_SELECT = `
    *,
    item_categories!inner(id, code, name),
    item_types!inner(id, code, name), 
    item_packages!inner(id, code, name),
    item_dosages(id, code, name)
  `;

  // Cached manufacturer data to avoid N+1 queries
  private static manufacturerCache: ItemManufacturer[] | null = null;
  private static manufacturerCacheExpiry = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getManufacturers(): Promise<ItemManufacturer[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (ItemRepository.manufacturerCache && now < ItemRepository.manufacturerCacheExpiry) {
      return ItemRepository.manufacturerCache;
    }

    // Fetch fresh data
    const { data } = await supabase
      .from('item_manufacturers')
      .select('id, code, name');

    if (data) {
      ItemRepository.manufacturerCache = data;
      ItemRepository.manufacturerCacheExpiry = now + ItemRepository.CACHE_TTL;
      return data;
    }

    return ItemRepository.manufacturerCache || [];
  }

  async getItems(options: ItemQueryOptions = {}): Promise<ItemRepositoryResponse<DBItemWithRelations[]>> {
    try {
      let query = supabase
        .from('items')
        .select(options.select || ItemRepository.DEFAULT_SELECT);

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      const { data, error } = await query;
      return { data: data as DBItemWithRelations[] | null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async getItemById(id: string): Promise<ItemRepositoryResponse<DBItemWithRelations>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(ItemRepository.DEFAULT_SELECT)
        .eq('id', id)
        .single();

      return { data: data as DBItemWithRelations | null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async searchItems(
    query: string, 
    searchFields: string[] = ['name', 'code', 'barcode', 'manufacturer'],
    options: ItemQueryOptions = {}
  ): Promise<ItemRepositoryResponse<DBItemWithRelations[]>> {
    try {
      let supabaseQuery = supabase
        .from('items')
        .select(options.select || ItemRepository.DEFAULT_SELECT);

      // Build OR condition for search
      const orConditions = searchFields
        .map(field => `${field}.ilike.%${query}%`)
        .join(',');
      
      supabaseQuery = supabaseQuery.or(orConditions);

      // Apply additional filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        supabaseQuery = supabaseQuery.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }

      const { data, error } = await supabaseQuery;
      return { data: data as DBItemWithRelations[] | null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async getLowStockItems(threshold: number = 10): Promise<ItemRepositoryResponse<DBItemWithRelations[]>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(ItemRepository.DEFAULT_SELECT)
        .lte('stock', threshold)
        .order('stock', { ascending: true });

      return { data: data as DBItemWithRelations[] | null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

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

  static clearManufacturerCache(): void {
    ItemRepository.manufacturerCache = null;
    ItemRepository.manufacturerCacheExpiry = 0;
  }
}

export const itemRepository = new ItemRepository();