import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { masterDataService } from '@/services/api/masterData.service';
import type { Category, MedicineType, ItemPackage, Supplier } from '@/types/database';
import type { ItemUnit } from '@/services/api/masterData.service';

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
    staleTime: 0,
    gcTime: 0,
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
    staleTime: 0,
    gcTime: 0,
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
      // Local cache update
      queryClient.invalidateQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.refetchQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Category>;
    }) => {
      const result = await masterDataService.categories.update(id, data);
      if (result.error) {
        console.error(`Failed to update category:`, result.error);
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      // Local cache update
      queryClient.invalidateQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.refetchQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.categories.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      // Local cache update
      queryClient.invalidateQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.refetchQueries({
        queryKey: QueryKeys.masterData.categories.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
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
    staleTime: 0,
    gcTime: 0,
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
    staleTime: 0,
    gcTime: 0,
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.types(),
      });
    },
  });

  const updateMedicineType = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<MedicineType>;
    }) => {
      const result = await masterDataService.types.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.types(),
      });
    },
  });

  const deleteMedicineType = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.types.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.types(),
      });
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
    staleTime: 0,
    gcTime: 0,
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
    staleTime: 0,
    gcTime: 0,
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.packages(),
      });
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ItemPackage>;
    }) => {
      const result = await masterDataService.packages.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.packages(),
      });
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.packages.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.packages(),
      });
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
    staleTime: 0,
    gcTime: 0,
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
    staleTime: 0,
    gcTime: 0,
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
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
  });

  const updateItemUnit = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ItemUnit>;
    }) => {
      const result = await masterDataService.itemUnits.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
  });

  const deleteItemUnit = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.itemUnits.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      const keysToInvalidate = getInvalidationKeys.masterData.itemUnits();
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
  });

  return { createItemUnit, updateItemUnit, deleteItemUnit };
};

// Supplier Hooks
export const useSuppliers = (options?: { enabled?: boolean }) => {
  return useQuery({
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
    queryKey: ['suppliers', 'search', query],
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
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.suppliers(),
      });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Supplier>;
    }) => {
      const result = await masterDataService.suppliers.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.suppliers(),
      });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.suppliers.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.masterData.suppliers(),
      });
    },
  });

  return { createSupplier, updateSupplier, deleteSupplier };
};

// Combined Master Data Hook
export const useAllMasterData = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['masterData', 'all'],
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
