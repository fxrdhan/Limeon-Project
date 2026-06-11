import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getInvalidationKeys, QueryKeys } from '@/constants/queryKeys';
import {
  masterDataService,
  type ItemUnit,
} from '@/services/api/masterData.service';
import type { MutationOptions } from './types';

export const useItemUnits = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.itemUnits.list(),
    queryFn: async () => {
      const result = await masterDataService.itemUnits.getActiveItemUnits();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useItemUnit = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.itemUnits.detail(id),
    queryFn: async () => {
      const result = await masterDataService.itemUnits.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useItemUnitMutations = () => {
  const queryClient = useQueryClient();

  const createItemUnit = useMutation({
    mutationFn: async (data: Omit<ItemUnit, 'id' | 'updated_at'>) => {
      const result = await masterDataService.itemUnits.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Satuan ukur berhasil ditambahkan');
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        void queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error creating item unit:', error);
      toast.error('Gagal menambahkan satuan ukur');
    },
  });

  const updateItemUnit = useMutation({
    mutationFn: async ({
      id,
      data,
      options: _options,
    }: {
      id: string;
      data: Partial<ItemUnit>;
      options?: MutationOptions;
    }) => {
      const result = await masterDataService.itemUnits.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Satuan ukur berhasil diperbarui');
      }
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        void queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: (error, variables) => {
      console.error('Error updating item unit:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui satuan ukur');
      }
    },
  });

  const deleteItemUnit = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.itemUnits.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Satuan ukur berhasil dihapus');
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        void queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error deleting item unit:', error);
      toast.error('Gagal menghapus satuan ukur');
    },
  });

  return { createItemUnit, updateItemUnit, deleteItemUnit };
};
