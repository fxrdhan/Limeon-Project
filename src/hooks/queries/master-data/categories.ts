import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys, refetchQueryKeys } from '@/lib/queryInvalidation';
import { masterDataService } from '@/services/api/masterData.service';
import type { Category } from '@/types/database';
import type { MutationOptions } from './types';

export const useCategories = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.categories.list(),
    queryFn: async () => {
      const result = await masterDataService.categories.getActiveCategories();
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCategory = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.categories.detail(id),
    queryFn: async () => {
      const result = await masterDataService.categories.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: async (data: Omit<Category, 'id' | 'updated_at'>) => {
      const result = await masterDataService.categories.create(data);
      if (result.error) {
        console.error(`Failed to create category:`, result.error);
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Kategori berhasil ditambahkan');
      const keysToInvalidate = getInvalidationKeys.masterData.categories();
      void invalidateQueryKeys(queryClient, keysToInvalidate);
      void refetchQueryKeys(queryClient, [QueryKeys.masterData.categories.all]);
    },
    onError: error => {
      console.error('Error creating category:', error);
      toast.error('Gagal menambahkan kategori');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      data,
      options: _options,
    }: {
      id: string;
      data: Partial<Category>;
      options?: MutationOptions;
    }) => {
      const result = await masterDataService.categories.update(id, data);
      if (result.error) {
        console.error(`Failed to update category:`, result.error);
        throw result.error;
      }
      return result.data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Kategori berhasil diperbarui');
      }
      const keysToInvalidate = getInvalidationKeys.masterData.categories();
      void invalidateQueryKeys(queryClient, keysToInvalidate);
      void refetchQueryKeys(queryClient, [QueryKeys.masterData.categories.all]);
    },
    onError: (error, variables) => {
      console.error('Error updating category:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui kategori');
      }
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.categories.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Kategori berhasil dihapus');
      const keysToInvalidate = getInvalidationKeys.masterData.categories();
      void invalidateQueryKeys(queryClient, keysToInvalidate);
      void refetchQueryKeys(queryClient, [QueryKeys.masterData.categories.all]);
    },
    onError: error => {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus kategori');
    },
  });

  return { createCategory, updateCategory, deleteCategory };
};
