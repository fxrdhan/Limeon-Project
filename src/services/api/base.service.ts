import { supabase } from '@/lib/supabase';
import { hasErrorStringFields } from '@/lib/errorFields';
import type { PostgrestError } from '@supabase/supabase-js';

export interface BaseEntity {
  id: string;
  updated_at?: string | null;
  created_at?: string;
}

export interface QueryOptions {
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export type ServiceError = PostgrestError | Error;

export interface ServiceResponse<T> {
  data: T | null;
  error: ServiceError | null;
  count?: number | null;
}

const isPostgrestError = (error: unknown): error is PostgrestError =>
  hasErrorStringFields(error, ['code', 'details', 'hint', 'message']);

const isMessageErrorLike = (
  error: unknown
): error is { message: string } & Record<string, unknown> =>
  hasErrorStringFields(error, ['message']);

export function toServiceError(error: unknown): ServiceError {
  if (isPostgrestError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return error;
  }

  if (isMessageErrorLike(error)) {
    return Object.assign(new Error(error.message), error);
  }

  return new Error(typeof error === 'string' ? error : 'Unknown service error');
}

const hasServiceData = <TData>(value: TData | null): value is TData =>
  value !== null;

export class BaseService<T extends BaseEntity> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getAll(options: QueryOptions = {}): Promise<ServiceResponse<T[]>> {
    try {
      let query = supabase
        .from(this.tableName)
        .select(options.select || '*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const result = await query.returns<T[]>();

      return {
        data: result.data || [],
        error: result.error,
        count: result.count,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
        count: null,
      };
    }
  }

  async getById(id: string, select?: string): Promise<ServiceResponse<T>> {
    try {
      const result = await supabase
        .from(this.tableName)
        .select(select || '*')
        .eq('id', id)
        .returns<T[]>()
        .single();

      return {
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  }

  async create(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResponse<T>> {
    try {
      const insertPayload: Record<string, unknown> = { ...data };
      const result = await supabase
        .from(this.tableName)
        .insert(insertPayload)
        .select()
        .returns<T[]>()
        .single();

      return {
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  }

  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<ServiceResponse<T>> {
    try {
      const result = await supabase
        .from(this.tableName)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .returns<T[]>()
        .single();

      return {
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  }

  async delete(id: string): Promise<ServiceResponse<null>> {
    try {
      const result = await supabase.from(this.tableName).delete().eq('id', id);

      return {
        data: null,
        error: result.error,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  }

  async search(
    query: string,
    columns: string[],
    options: QueryOptions = {}
  ): Promise<ServiceResponse<T[]>> {
    try {
      let searchQuery = supabase
        .from(this.tableName)
        .select(options.select || '*', { count: 'exact' });

      // Build search filter
      if (query && columns.length > 0) {
        const searchFilter = columns
          .map(column => `${column}.ilike.%${query}%`)
          .join(',');
        searchQuery = searchQuery.or(searchFilter);
      }

      // Apply additional filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchQuery = searchQuery.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        searchQuery = searchQuery.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply pagination
      if (options.limit) {
        searchQuery = searchQuery.limit(options.limit);
      }

      const result = await searchQuery.returns<T[]>();

      return {
        data: result.data || [],
        error: result.error,
        count: result.count,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
        count: null,
      };
    }
  }

  async bulkCreate(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<ServiceResponse<T[]>> {
    try {
      const insertPayload: Record<string, unknown>[] = data.map(item => ({
        ...item,
      }));
      const result = await supabase
        .from(this.tableName)
        .insert(insertPayload)
        .select()
        .returns<T[]>();

      return {
        data: result.data || [],
        error: result.error,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  }

  async bulkUpdate(
    updates: { id: string; data: Partial<Omit<T, 'id' | 'created_at'>> }[]
  ): Promise<ServiceResponse<T[]>> {
    try {
      const updatePromises = updates.map(({ id, data }) =>
        this.update(id, data)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        return {
          data: null,
          error: errors[0].error,
        };
      }

      return {
        data: results.map(result => result.data).filter(hasServiceData),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: toServiceError(error),
      };
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      return !result.error && result.data !== null;
    } catch {
      return false;
    }
  }
}
