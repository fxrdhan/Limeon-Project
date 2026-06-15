import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getInvalidationKeys, QueryKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import { masterDataService } from '@/services/api/masterData.service';
import type { MedicineType } from '@/types/database';
import type { MutationOptions } from './types';

export const useMedicineTypes = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.types.list(),
    queryFn: async () => {
      const result = await masterDataService.types.getActiveTypes();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useMedicineType = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.masterData.types.detail(id),
    queryFn: async () => {
      const result = await masterDataService.types.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useMedicineTypeMutations = () => {
  const queryClient = useQueryClient();

  const createMedicineType = useMutation({
    mutationFn: async (data: Omit<MedicineType, 'id' | 'updated_at'>) => {
      const result = await masterDataService.types.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Jenis obat berhasil ditambahkan');
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.types()
      );
    },
    onError: error => {
      console.error('Error creating medicine type:', error);
      toast.error('Gagal menambahkan jenis obat');
    },
  });

  const updateMedicineType = useMutation({
    mutationFn: async ({
      id,
      data,
      options: _options,
    }: {
      id: string;
      data: Partial<MedicineType>;
      options?: MutationOptions;
    }) => {
      const result = await masterDataService.types.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Jenis obat berhasil diperbarui');
      }
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.types()
      );
    },
    onError: (error, variables) => {
      console.error('Error updating medicine type:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui jenis obat');
      }
    },
  });

  const deleteMedicineType = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.types.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Jenis obat berhasil dihapus');
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.types()
      );
    },
    onError: error => {
      console.error('Error deleting medicine type:', error);
      toast.error('Gagal menghapus jenis obat');
    },
  });

  return { createMedicineType, updateMedicineType, deleteMedicineType };
};
