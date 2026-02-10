import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { useEffect } from 'react';
import { preloadImage, setCachedImage } from '@/utils/imageCache';
import { masterDataService } from '@/services/api/masterData.service';
import toast from 'react-hot-toast';
import type {
  Category,
  MedicineType,
  ItemPackage,
  Supplier,
} from '@/types/database';
import type { ItemUnit } from '@/services/api/masterData.service';

type MutationOptions = {
  silent?: boolean;
};

// Category Hooks
export const useCategories = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.categories.list(),
    queryFn: async () => {
      const result = await masterDataService.categories.getActiveCategories();
      if (result.error) throw result.error;
      return result.data;
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
      // Local cache update
      queryClient.invalidateQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.refetchQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
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
      // Local cache update
      queryClient.invalidateQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.refetchQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
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
      // Local cache update
      queryClient.invalidateQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.refetchQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
    },
    onError: error => {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus kategori');
    },
  });

  return { createCategory, updateCategory, deleteCategory };
};

// Medicine Type Hooks
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.types(),
      });
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.types(),
      });
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.types(),
      });
    },
    onError: error => {
      console.error('Error deleting medicine type:', error);
      toast.error('Gagal menghapus jenis obat');
    },
  });

  return { createMedicineType, updateMedicineType, deleteMedicineType };
};

// Item Package Hooks
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.packages(),
      });
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.packages(),
      });
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.packages(),
      });
    },
    onError: error => {
      console.error('Error deleting package:', error);
      toast.error('Gagal menghapus kemasan');
    },
  });

  return { createPackage, updatePackage, deletePackage };
};

// Item Unit Hooks (for item_units table)
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
      toast.success('Satuan berhasil ditambahkan');
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error creating item unit:', error);
      toast.error('Gagal menambahkan satuan');
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
        toast.success('Satuan berhasil diperbarui');
      }
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: (error, variables) => {
      console.error('Error updating item unit:', error);
      if (!variables.options?.silent) {
        toast.error('Gagal memperbarui satuan');
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
      toast.success('Satuan berhasil dihapus');
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
    onError: error => {
      console.error('Error deleting item unit:', error);
      toast.error('Gagal menghapus satuan');
    },
  });

  return { createItemUnit, updateItemUnit, deleteItemUnit };
};

// Supplier Hooks
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
      const keysToInvalidate = getInvalidationKeys.masterData.suppliers();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({
          queryKey: keySet,
        });
      });
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
      const keysToInvalidate = getInvalidationKeys.masterData.suppliers();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({
          queryKey: keySet,
        });
      });
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
      const keysToInvalidate = getInvalidationKeys.masterData.suppliers();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({
          queryKey: keySet,
        });
      });
    },
    onError: error => {
      console.error('Error deleting supplier:', error);
      toast.error('Gagal menghapus supplier');
    },
  });

  return { createSupplier, updateSupplier, deleteSupplier };
};

// Combined Master Data Hook
export const useAllMasterData = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.all,
    queryFn: async () => {
      const result = await masterDataService.getAllMasterData();
      if (
        result.errors.categories ||
        result.errors.types ||
        result.errors.packages ||
        result.errors.suppliers
      ) {
        throw new Error('Failed to fetch master data');
      }
      return result;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
};
