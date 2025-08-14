import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import toast from 'react-hot-toast';
import type { ItemDosage } from '@/types/database';

// Simple dosages hook without realtime
export const useDosages = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery<ItemDosage[]>({
    queryKey: QueryKeys.masterData.dosages.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_dosages')
        .select('id, code, name, nci_code, description, created_at, updated_at')
        .order('code');

      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Query hook untuk dosages dengan realtime
export const useDosagesRealtime = ({
  enabled = true,
}: { enabled?: boolean } = {}) => {
  return useQuery<ItemDosage[]>({
    queryKey: QueryKeys.masterData.dosages.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_dosages')
        .select('id, code, name, nci_code, description, created_at, updated_at')
        .order('code');

      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Mutation hooks untuk CRUD operations
export const useDosageMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (dosageData: {
      code?: string;
      name: string;
      description: string;
    }) => {
      const { data, error } = await supabase
        .from('item_dosages')
        .insert([dosageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Dosis berhasil ditambahkan');
      const keysToInvalidate = getInvalidationKeys.masterData.dosages();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: (error) => {
      console.error('Error creating dosage:', error);
      toast.error('Gagal menambahkan dosis');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: { id: string } & Partial<ItemDosage>) => {
      const { data, error } = await supabase
        .from('item_dosages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Dosis berhasil diperbarui');
      const keysToInvalidate = getInvalidationKeys.masterData.dosages();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: (error) => {
      console.error('Error updating dosage:', error);
      toast.error('Gagal memperbarui dosis');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('item_dosages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dosis berhasil dihapus');
      const keysToInvalidate = getInvalidationKeys.masterData.dosages();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: (error) => {
      console.error('Error deleting dosage:', error);
      toast.error('Gagal menghapus dosis');
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
