import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import toast from 'react-hot-toast';
import type { ItemDosage } from '@/types/database';
import { itemDosageService } from '@/services/api/masterData.service';

type MutationOptions = {
  silent?: boolean;
};

// Simple dosages hook without realtime
export const useDosages = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery<ItemDosage[]>({
    queryKey: QueryKeys.masterData.dosages.list(),
    queryFn: async () => {
      const { data, error } = await itemDosageService.getActiveDosages();
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
      const { data, error } = await itemDosageService.getActiveDosages();
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
      const { data, error } = await itemDosageService.create(dosageData);

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
    onError: error => {
      console.error('Error creating dosage:', error);
      toast.error('Gagal menambahkan dosis');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      options: _options,
      ...updateData
    }: { id: string; options?: MutationOptions } & Partial<ItemDosage>) => {
      const { data, error } = await itemDosageService.update(id, updateData);

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Dosis berhasil diperbarui');
      }
      const keysToInvalidate = getInvalidationKeys.masterData.dosages();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: (error, variables) => {
      console.error('Error updating dosage:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui dosis');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await itemDosageService.delete(id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dosis berhasil dihapus');
      const keysToInvalidate = getInvalidationKeys.masterData.dosages();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
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
