import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

interface ListOptions {
  select: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

export class GenericEntityService<TEntity> {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async list(options: ListOptions): Promise<ServiceResponse<TEntity[]>> {
    try {
      let query = supabase.from(this.tableName).select(options.select);

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value);
          }
        });
      }

      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      const { data, error } = await query;
      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as TEntity[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async create(
    input: Record<string, unknown>,
    selectFields: string
  ): Promise<ServiceResponse<TEntity>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(input)
        .select(selectFields)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as TEntity, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async update(
    id: string,
    input: Record<string, unknown>,
    selectFields: string
  ): Promise<ServiceResponse<TEntity>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(input)
        .eq('id', id)
        .select(selectFields)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as TEntity, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async delete(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }
}
