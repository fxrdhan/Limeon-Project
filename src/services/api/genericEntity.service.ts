import { supabase } from '@/lib/supabase';
import { toServiceError, type ServiceResponse } from './base.service';

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

      const { data, error } = await query.returns<TEntity[]>();
      if (error) {
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
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
        .returns<TEntity[]>()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
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
        .returns<TEntity[]>()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
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
      return { data: null, error: toServiceError(error) };
    }
  }
}
