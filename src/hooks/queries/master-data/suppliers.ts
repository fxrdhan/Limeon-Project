import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getInvalidationKeys, QueryKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import { masterDataService } from '@/services/api/masterData.service';
import { preloadImage, setCachedImage } from '@/utils/imageCache';
import type { Supplier } from '@/types/database';
import type { MutationOptions } from './types';

export const useSuppliers = (options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: QueryKeys.masterData.suppliers.list(),
    queryFn: async () => {
      const result = await masterDataService.suppliers.getActiveSuppliers();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    (query.data || []).forEach(supplier => {
      if (!supplier.id || !supplier.image_url) return;
      const cacheKey = `identity:${supplier.id}`;
      setCachedImage(cacheKey, supplier.image_url);
      preloadImage(supplier.image_url);
    });
  }, [query.data]);

  return query;
};

export const useSupplier = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.suppliers.detail(id),
    queryFn: async () => {
      const result = await masterDataService.suppliers.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
};

export const useSearchSuppliers = (
  query: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.masterData.suppliers.search(query),
    queryFn: async () => {
      const result = await masterDataService.suppliers.searchSuppliers(query);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && query.length > 0,
  });
};

export const useSupplierMutations = () => {
  const queryClient = useQueryClient();

  const createSupplier = useMutation({
    mutationFn: async (data: Omit<Supplier, 'id' | 'updated_at'>) => {
      const result = await masterDataService.suppliers.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Supplier berhasil ditambahkan');
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.suppliers()
      );
    },
    onError: error => {
      console.error('Error creating supplier:', error);
      toast.error('Gagal menambahkan supplier');
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({
      id,
      data,
      options: _options,
    }: {
      id: string;
      data: Partial<Supplier>;
      options?: MutationOptions;
    }) => {
      const result = await masterDataService.suppliers.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.options?.silent) {
        toast.success('Supplier berhasil diperbarui');
      }
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.suppliers()
      );
    },
    onError: (error, variables) => {
      console.error('Error updating supplier:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui supplier');
      }
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.suppliers.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success('Supplier berhasil dihapus');
      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.masterData.suppliers()
      );
    },
    onError: error => {
      console.error('Error deleting supplier:', error);
      toast.error('Gagal menghapus supplier');
    },
  });

  return { createSupplier, updateSupplier, deleteSupplier };
};
