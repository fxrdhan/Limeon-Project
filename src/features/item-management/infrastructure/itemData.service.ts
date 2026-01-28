import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/services/api/base.service';
import type { CustomerLevelDiscount } from '@/types/database';

export const itemDataService = {
  async fetchItemDataById(
    id: string
  ): Promise<ServiceResponse<Record<string, unknown>>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(
          `
          *, updated_at,
          package_conversions,
          manufacturer_id,
          package_id,
          customer_level_discounts (customer_level_id, discount_percentage)
        `
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        return { data: null, error };
      }

      return { data: data as Record<string, unknown>, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async updateItemFields(
    itemId: string,
    updates: Record<string, unknown>
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async createItem(
    payload: Record<string, unknown>
  ): Promise<ServiceResponse<{ id: string }>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .insert(payload)
        .select('id')
        .single();

      if (error || !data) {
        return { data: null, error };
      }

      return { data: { id: data.id as string }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async updateItemImages(
    itemId: string,
    urls: string[]
  ): Promise<ServiceResponse<null>> {
    return this.updateItemFields(itemId, { image_urls: urls });
  },

  async getCustomerLevelDiscounts(
    itemId: string
  ): Promise<ServiceResponse<CustomerLevelDiscount[]>> {
    try {
      const { data, error } = await supabase
        .from('customer_level_discounts')
        .select('customer_level_id, discount_percentage')
        .eq('item_id', itemId);

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as CustomerLevelDiscount[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async replaceCustomerLevelDiscounts(
    itemId: string,
    discounts: CustomerLevelDiscount[]
  ): Promise<ServiceResponse<null>> {
    try {
      const { error: deleteError } = await supabase
        .from('customer_level_discounts')
        .delete()
        .eq('item_id', itemId);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      if (!discounts.length) {
        return { data: null, error: null };
      }

      const insertPayload = discounts.map(discount => ({
        item_id: itemId,
        customer_level_id: discount.customer_level_id,
        discount_percentage: discount.discount_percentage,
      }));

      const { error: insertError } = await supabase
        .from('customer_level_discounts')
        .insert(insertPayload);

      return { data: null, error: insertError };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async getItemCodesLike(
    pattern: string
  ): Promise<ServiceResponse<{ code: string | null }[]>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('code')
        .like('code', pattern);

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as { code: string | null }[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
