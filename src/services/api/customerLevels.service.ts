import { supabase } from '@/lib/supabase';
import type { CustomerLevel } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

export class CustomerLevelsService {
  async getAll(): Promise<ServiceResponse<CustomerLevel[]>> {
    try {
      const { data, error } = await supabase
        .from('customer_levels')
        .select('id, level_name, price_percentage, description')
        .order('level_name');

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as CustomerLevel[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async create(
    payload: Omit<CustomerLevel, 'id'>
  ): Promise<ServiceResponse<CustomerLevel>> {
    try {
      const { data, error } = await supabase
        .from('customer_levels')
        .insert(payload)
        .select('id, level_name, price_percentage, description')
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as CustomerLevel, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async update(
    id: string,
    payload: Partial<CustomerLevel>
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('customer_levels')
        .update(payload)
        .eq('id', id);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async delete(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('customer_levels')
        .delete()
        .eq('id', id);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async seedDefaults(
    payload: Array<{
      level_name: string;
      price_percentage: number;
      description?: string | null;
    }>
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('customer_levels')
        .upsert(payload, {
          onConflict: 'level_name',
          ignoreDuplicates: true,
        })
        .select('id');

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }
}

export const customerLevelsService = new CustomerLevelsService();
