import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { CustomerLevel } from '@/types/database';

const CUSTOMER_LEVELS_QUERY_KEY = ['customer-levels'];
const DEFAULT_LEVELS: CreateCustomerLevelInput[] = [
  {
    level_name: 'Level 1',
    price_percentage: 100,
    description: 'Harga penuh',
  },
  {
    level_name: 'Level 2',
    price_percentage: 95,
    description: 'Diskon 5%',
  },
  {
    level_name: 'Level 3',
    price_percentage: 90,
    description: 'Diskon 10%',
  },
];

interface CreateCustomerLevelInput {
  level_name: string;
  price_percentage: number;
  description?: string | null;
}

interface UpdateCustomerLevelInput {
  id: string;
  price_percentage: number;
  level_name?: string;
}

interface DeleteCustomerLevelInput {
  id: string;
  levels: CustomerLevel[];
}

const normalizeCustomerLevels = (levels: CustomerLevel[]) =>
  levels.map(level => ({
    ...level,
    price_percentage: Number(level.price_percentage) || 0,
  }));

export const useCustomerLevels = () => {
  const queryClient = useQueryClient();
  const hasSeededDefaults = useRef(false);

  const levelsQuery = useQuery({
    queryKey: CUSTOMER_LEVELS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_levels')
        .select('id, level_name, price_percentage, description')
        .order('level_name');

      if (error) {
        throw error;
      }

      return normalizeCustomerLevels((data || []) as CustomerLevel[]);
    },
  });

  const createLevelMutation = useMutation({
    mutationFn: async (payload: CreateCustomerLevelInput) => {
      const { data, error } = await supabase
        .from('customer_levels')
        .insert(payload)
        .select('id, level_name, price_percentage, description')
        .single();

      if (error) {
        throw error;
      }

      return data as CustomerLevel;
    },
    onSuccess: () => {
      toast.success('Level pelanggan berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: CUSTOMER_LEVELS_QUERY_KEY });
    },
    onError: error => {
      console.error('Error creating customer level:', error);
      toast.error('Gagal menambahkan level pelanggan.');
    },
  });

  const updateLevelsMutation = useMutation({
    mutationFn: async (payload: UpdateCustomerLevelInput[]) => {
      if (!payload.length) return [];

      await Promise.all(
        payload.map(async update => {
          const { error } = await supabase
            .from('customer_levels')
            .update({
              price_percentage: update.price_percentage,
              level_name: update.level_name,
            })
            .eq('id', update.id);

          if (error) {
            throw error;
          }
        })
      );

      return payload;
    },
    onSuccess: () => {
      toast.success('Baseline level berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: CUSTOMER_LEVELS_QUERY_KEY });
    },
    onError: error => {
      console.error('Error updating customer levels:', error);
      toast.error('Gagal memperbarui baseline level.');
    },
  });

  const deleteLevelMutation = useMutation({
    mutationFn: async (payload: DeleteCustomerLevelInput) => {
      const { id, levels } = payload;

      const { error } = await supabase
        .from('customer_levels')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      const remaining = levels.filter(level => level.id !== id);
      const renameUpdates = remaining
        .map((level, index) => {
          const nextName = `Level ${index + 1}`;
          if (level.level_name === nextName) return null;
          return { id: level.id, level_name: nextName };
        })
        .filter(
          (update): update is { id: string; level_name: string } =>
            update !== null
        );

      if (!renameUpdates.length) {
        return { id };
      }

      await Promise.all(
        renameUpdates.map(async update => {
          const { error: updateError } = await supabase
            .from('customer_levels')
            .update({ level_name: update.level_name })
            .eq('id', update.id);

          if (updateError) {
            throw updateError;
          }
        })
      );

      return { id };
    },
    onSuccess: () => {
      toast.success('Level pelanggan berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: CUSTOMER_LEVELS_QUERY_KEY });
    },
    onError: error => {
      console.error('Error deleting customer level:', error);
      toast.error('Gagal menghapus level pelanggan.');
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('customer_levels')
        .upsert(DEFAULT_LEVELS, {
          onConflict: 'level_name',
          ignoreDuplicates: true,
        })
        .select('id');

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_LEVELS_QUERY_KEY });
    },
    onError: error => {
      console.error('Error seeding default customer levels:', error);
      toast.error('Gagal memuat level pelanggan.');
    },
  });

  useEffect(() => {
    if (hasSeededDefaults.current) return;
    if (levelsQuery.isLoading || levelsQuery.isError) return;
    if ((levelsQuery.data || []).length > 0) return;

    hasSeededDefaults.current = true;
    seedDefaultsMutation.mutate();
  }, [
    levelsQuery.data,
    levelsQuery.isError,
    levelsQuery.isLoading,
    seedDefaultsMutation,
  ]);

  return {
    levels: levelsQuery.data ?? [],
    isLoading: levelsQuery.isLoading,
    isError: levelsQuery.isError,
    error: levelsQuery.error,
    createLevel: createLevelMutation,
    updateLevels: updateLevelsMutation,
    deleteLevel: deleteLevelMutation,
  };
};
