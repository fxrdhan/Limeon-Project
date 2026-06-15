import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getInvalidationKeys, QueryKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import { masterDataService } from '@/services/api/masterData.service';
import type { ItemPackage } from '@/types/database';
import type { MutationOptions } from './types';

export const usePackages = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.packages.list(),
    queryFn: async () => {
      const result = await masterDataService.packages.getActivePackages();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePackage = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.packages.detail(id),
    queryFn: async () => {
      const result = await masterDataService.packages.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePackageMutations = () => {
  const queryClient = useQueryClient();

  const createPackage = useMutation({
    mutationFn: async (data: Omit<ItemPackage, 'id' | 'updated_at'>) => {
      const result = await masterDataService.packages.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Kemasan berhasil ditambahkan');
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.packages()
      );
    },
    onError: error => {
      console.error('Error creating package:', error);
      toast.error('Gagal menambahkan kemasan');
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({
      id,
      data,
      options: _options,
    }: {
      id: string;
      data: Partial<ItemPackage>;
      options?: MutationOptions;
    }) => {
      const result = await masterDataService.packages.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Kemasan berhasil diperbarui');
      }
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.packages()
      );
    },
    onError: (error, variables) => {
      console.error('Error updating package:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui kemasan');
      }
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.packages.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Kemasan berhasil dihapus');
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.packages()
      );
    },
    onError: error => {
      console.error('Error deleting package:', error);
      toast.error('Gagal menghapus kemasan');
    },
  });

  return { createPackage, updatePackage, deletePackage };
};
