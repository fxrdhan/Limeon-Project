import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import toast from 'react-hot-toast';
import type { ItemManufacturer } from '@/types/database';
import { itemManufacturerService } from '@/services/api/masterData.service';

// Query hook for manufacturers with realtime
export const useManufacturersRealtime = ({
  enabled = true,
}: { enabled?: boolean } = {}) => {
  return useQuery<ItemManufacturer[]>({
    queryKey: QueryKeys.masterData.manufacturers.list(),
    queryFn: async () => {
      const { data, error } =
        await itemManufacturerService.getActiveManufacturers();

      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Base query hook for manufacturers
export const useManufacturers = ({
  enabled = true,
}: { enabled?: boolean } = {}) => {
  return useQuery<ItemManufacturer[]>({
    queryKey: QueryKeys.masterData.manufacturers.list(),
    queryFn: async () => {
      const { data, error } =
        await itemManufacturerService.getActiveManufacturers();

      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Mutation hooks for CRUD operations
export const useManufacturerMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (manufacturerData: {
      code?: string;
      name: string;
      address: string;
    }) => {
      const { data, error } =
        await itemManufacturerService.create(manufacturerData);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Manufaktur berhasil ditambahkan');
      const keysToInvalidate = getInvalidationKeys.masterData.manufacturers();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error creating manufacturer:', error);
      toast.error('Gagal menambahkan manufaktur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: { id: string } & Partial<ItemManufacturer>) => {
      const { data, error } = await itemManufacturerService.update(
        id,
        updateData
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Manufaktur berhasil diperbarui');
      const keysToInvalidate = getInvalidationKeys.masterData.manufacturers();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error updating manufacturer:', error);
      toast.error('Gagal memperbarui manufaktur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await itemManufacturerService.delete(id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Manufaktur berhasil dihapus');
      const keysToInvalidate = getInvalidationKeys.masterData.manufacturers();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error deleting manufacturer:', error);
      toast.error('Gagal menghapus manufaktur');
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
