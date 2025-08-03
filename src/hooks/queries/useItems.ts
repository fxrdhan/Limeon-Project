import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { itemsService } from '@/services/api/items.service';
import type { DBItem, DBPackageConversion } from '@/types/database';

// Item Query Hooks
export const useItems = (options?: {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}) => {
  return useQuery({
    queryKey: QueryKeys.items.list(options?.filters),
    queryFn: async () => {
      const result = await itemsService.getAll({
        filters: options?.filters,
        orderBy: options?.orderBy || { column: 'name', ascending: true },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
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
    staleTime: 0,
    gcTime: 0,
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
  });
};

export const useItemsByCategory = (
  categoryId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['items', 'byCategory', categoryId],
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
    queryKey: ['items', 'byType', typeId],
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
    queryKey: ['items', 'lowStock', threshold],
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
      console.log(
        `🚀 CREATE ITEM CALLED with itemData:`,
        itemData,
        `packageConversions:`,
        packageConversions
      );
      const result = await itemsService.createItemWithConversions(
        itemData,
        packageConversions
      );
      console.log(`📝 CREATE ITEM API result:`, result);
      if (result.error) {
        console.error(`❌ CREATE ITEM failed:`, result.error);
        throw result.error;
      }
      console.log(`✅ CREATE ITEM API success, returning:`, result.data);
      return result.data;
    },
    onSuccess: data => {
      console.log(`🎉 CREATE ITEM SUCCESS! Data:`, data);

      // Local cache update
      console.log(`💾 Updating local cache...`);
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });
      console.log(`✅ Local cache updated`);
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
    onSuccess: (data, variables) => {
      console.log(
        `🎉 UPDATE ITEM SUCCESS! Data:`,
        data,
        `Variables:`,
        variables
      );

      // Local cache update
      console.log(`💾 Updating local cache...`);
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });
      queryClient.invalidateQueries({
        queryKey: QueryKeys.items.detail(variables.id),
      });
      console.log(`✅ Local cache updated`);
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
    queryKey: ['items', 'checkCode', code, excludeId],
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
    queryKey: ['items', 'checkBarcode', barcode, excludeId],
    queryFn: () => itemsService.isBarcodeUnique(barcode, excludeId),
    enabled: (options?.enabled ?? true) && barcode.length > 0,
  });
};
