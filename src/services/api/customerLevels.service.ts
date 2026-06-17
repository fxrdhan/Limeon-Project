import { supabase } from '@/lib/supabase';
import type { CustomerLevel } from '@/types/database';
import { toServiceError, type ServiceResponse } from './base.service';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeCustomerLevelPercentage = (value: unknown) => {
  const percentage =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 0;

  return Number.isFinite(percentage) ? percentage : 0;
};

export const normalizeCustomerLevel = (
  value: unknown
): CustomerLevel | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { description, id, level_name, price_percentage } = value;
  if (typeof id !== 'string' || typeof level_name !== 'string') {
    return null;
  }

  return {
    id,
    level_name,
    price_percentage: normalizeCustomerLevelPercentage(price_percentage),
    description:
      typeof description === 'string' || description === null
        ? description
        : null,
  };
};

export const normalizeCustomerLevels = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap(level => {
        const normalizedLevel = normalizeCustomerLevel(level);
        return normalizedLevel ? [normalizedLevel] : [];
      })
    : [];

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

      return { data: normalizeCustomerLevels(data), error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
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

      const customerLevel = normalizeCustomerLevel(data);
      if (!customerLevel) {
        throw new Error('Customer level response is malformed');
      }

      return { data: customerLevel, error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
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
      return { data: null, error: toServiceError(error) };
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
      return { data: null, error: toServiceError(error) };
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
      return { data: null, error: toServiceError(error) };
    }
  }
}

export const customerLevelsService = new CustomerLevelsService();
