import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { masterDataService } from '@/services/api/masterData.service';
import type { Category, MedicineType, Unit, Supplier } from '@/types/database';

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
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.categories() });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      const result = await masterDataService.categories.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.categories() });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.categories.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.categories() });
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

export const useMedicineType = (id: string, options?: { enabled?: boolean }) => {
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

  const createType = useMutation({
    mutationFn: async (data: Omit<MedicineType, 'id' | 'updated_at'>) => {
      const result = await masterDataService.types.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.types() });
    },
  });

  const updateType = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MedicineType> }) => {
      const result = await masterDataService.types.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.types() });
    },
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.types.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.types() });
    },
  });

  return { createType, updateType, deleteType };
};

// Unit Hooks
export const useUnits = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.units.list(),
    queryFn: async () => {
      const result = await masterDataService.units.getActiveUnits();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useUnit = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.units.detail(id),
    queryFn: async () => {
      const result = await masterDataService.units.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useUnitMutations = () => {
  const queryClient = useQueryClient();

  const createUnit = useMutation({
    mutationFn: async (data: Omit<Unit, 'id' | 'updated_at'>) => {
      const result = await masterDataService.units.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.units() });
    },
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Unit> }) => {
      const result = await masterDataService.units.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.units() });
    },
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.units.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.units() });
    },
  });

  return { createUnit, updateUnit, deleteUnit };
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
  });
};

export const useSearchSuppliers = (query: string, options?: { enabled?: boolean }) => {
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
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.suppliers() });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      const result = await masterDataService.suppliers.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.suppliers() });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const result = await masterDataService.suppliers.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvalidationKeys.masterData.suppliers() });
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
      if (result.errors.categories || result.errors.types || result.errors.units || result.errors.suppliers) {
        throw new Error('Failed to fetch master data');
      }
      return result;
    },
    enabled: options?.enabled ?? true,
  });
};