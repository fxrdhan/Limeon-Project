import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { itemsService } from '@/services/api/items.service';
import type { DBItem, DBPackageConversion } from '@/types/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Item Query Hooks
export const useItems = (options?: {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}) => {
  const queryKey = QueryKeys.items.list(options?.filters);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await itemsService.getAll({
        filters: options?.filters,
        orderBy: options?.orderBy || { column: 'name', ascending: true },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    // Extended cache for master data stability
    staleTime: 60 * 60 * 1000, // 1 hour (items data relatively stable)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours in memory

    // onSuccess deprecated in React Query v5

    // Prevent unnecessary background refetches
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  return query;
};

export const useItem = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.items.detail(id),
    queryFn: async () => {
      const result = await itemsService.getItemWithDetails(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    // Uses global cache settings
  });
};

export const useSearchItems = (
  query: string,
  options?: {
    enabled?: boolean;
    filters?: Record<string, unknown>;
  }
) => {
  return useQuery({
    queryKey: QueryKeys.items.search(query, options?.filters),
    queryFn: async () => {
      const result = await itemsService.searchItems(query, {
        filters: options?.filters,
        orderBy: { column: 'name', ascending: true },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && query.length > 0,
    // Disable caching for items search data
    staleTime: 0,
    gcTime: 0,
  });
};

export const useItemsByCategory = (
  categoryId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.items.byCategory(categoryId),
    queryFn: async () => {
      const result = await itemsService.getItemsByCategory(categoryId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
};

export const useItemsByType = (
  typeId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.items.byType(typeId),
    queryFn: async () => {
      const result = await itemsService.getItemsByType(typeId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
};

export const useLowStockItems = (
  threshold: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.items.lowStock(threshold),
    queryFn: async () => {
      const result = await itemsService.getLowStockItems(threshold);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
};

// Item Mutation Hooks
export const useItemMutations = () => {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async ({
      itemData,
      packageConversions,
    }: {
      itemData: Omit<DBItem, 'id' | 'created_at' | 'updated_at'>;
      packageConversions?: DBPackageConversion[];
    }) => {
      const result = await itemsService.createItemWithConversions(
        itemData,
        packageConversions
      );
      if (result.error) {
        console.error(`Failed to create item:`, result.error);
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      // Local cache update
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      itemData,
      packageConversions,
    }: {
      id: string;
      itemData: Partial<Omit<DBItem, 'id' | 'created_at'>>;
      packageConversions?: DBPackageConversion[];
    }) => {
      const result = await itemsService.updateItemWithConversions(
        id,
        itemData,
        packageConversions
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      // Local cache update
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });
      queryClient.invalidateQueries({
        queryKey: QueryKeys.items.detail(variables.id),
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const result = await itemsService.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      // Local cache update
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const result = await itemsService.updateStock(id, stock);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.items.all(),
      });
      queryClient.invalidateQueries({
        queryKey: QueryKeys.items.detail(variables.id),
      });
    },
  });

  const bulkUpdateStock = useMutation({
    mutationFn: async (updates: { id: string; stock: number }[]) => {
      const result = await itemsService.bulkUpdateStock(updates);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.items.all(),
      });
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
    updateStock,
    bulkUpdateStock,
  };
};

// Validation Hooks
export const useCheckCodeUniqueness = (
  code: string,
  excludeId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.items.checkCode(code, excludeId),
    queryFn: () => itemsService.isCodeUnique(code, excludeId),
    enabled: (options?.enabled ?? true) && code.length > 0,
  });
};

export const useCheckBarcodeUniqueness = (
  barcode: string,
  excludeId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.items.checkBarcode(barcode, excludeId),
    queryFn: () => itemsService.isBarcodeUnique(barcode, excludeId),
    enabled: (options?.enabled ?? true) && barcode.length > 0,
  });
};
