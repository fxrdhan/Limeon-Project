import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getInvalidationKeys, QueryKeys } from '@/constants/queryKeys';
import { masterDataService } from '@/services/api/masterData.service';
import type { ItemInventoryUnit } from '@/types/database';
import type { MutationOptions } from './types';

export const useInventoryUnits = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.inventoryUnits.list(),
    queryFn: async () => {
      const result =
        await masterDataService.inventoryUnits.getActiveInventoryUnits();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useInventoryUnit = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.masterData.inventoryUnits.detail(id),
    queryFn: async () => {
      const result = await masterDataService.inventoryUnits.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useInventoryUnitMutations = () => {
  const queryClient = useQueryClient();

  const createInventoryUnit = useMutation({
    mutationFn: async (
      data: Omit<ItemInventoryUnit, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const result = await masterDataService.inventoryUnits.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Unit stok/jual berhasil ditambahkan');
      void queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.inventoryUnits(),
      });
    },
    onError: error => {
      console.error('Error creating inventory unit:', error);
      toast.error('Gagal menambahkan unit stok/jual');
    },
  });

  const updateInventoryUnit = useMutation({
    mutationFn: async ({
      id,
      data,
      options: _options,
    }: {
      id: string;
      data: Partial<ItemInventoryUnit>;
      options?: MutationOptions;
    }) => {
      const result = await masterDataService.inventoryUnits.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Unit stok/jual berhasil diperbarui');
      }
      void queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.inventoryUnits(),
      });
    },
    onError: (error, variables) => {
      console.error('Error updating inventory unit:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui unit stok/jual');
      }
    },
  });

  const deleteInventoryUnit = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.inventoryUnits.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Unit stok/jual berhasil dihapus');
      void queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.inventoryUnits(),
      });
    },
    onError: error => {
      console.error('Error deleting inventory unit:', error);
      toast.error('Gagal menghapus unit stok/jual');
    },
  });

  return {
    createInventoryUnit,
    updateInventoryUnit,
    deleteInventoryUnit,
  };
};
