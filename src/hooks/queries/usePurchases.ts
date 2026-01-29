import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { purchasesService } from '@/services/api/purchases.service';

// Purchase Query Hooks
export const usePurchases = (options?: {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}) => {
  return useQuery({
    queryKey: QueryKeys.purchases.list(options?.filters),
    queryFn: async () => {
      const result = await purchasesService.getAllWithSuppliers({
        filters: options?.filters,
        orderBy: options?.orderBy || { column: 'date', ascending: false },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePurchase = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.purchases.detail(id),
    queryFn: async () => {
      const result = await purchasesService.getPurchaseWithDetails(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePurchaseItems = (
  purchaseId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.purchases.items(purchaseId),
    queryFn: async () => {
      const result = await purchasesService.getPurchaseItems(purchaseId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePurchasesBySupplier = (
  supplierId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.purchases.bySupplier(supplierId),
    queryFn: async () => {
      const result = await purchasesService.getPurchasesBySupplier(supplierId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePurchasesByPaymentStatus = (
  status: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.purchases.byPaymentStatus(status),
    queryFn: async () => {
      const result = await purchasesService.getPurchasesByPaymentStatus(status);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePurchasesByDateRange = (
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.purchases.byDateRange(startDate, endDate),
    queryFn: async () => {
      const result = await purchasesService.getPurchasesByDateRange(
        startDate,
        endDate
      );
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Purchase Mutation Hooks
export const usePurchaseMutations = () => {
  const queryClient = useQueryClient();

  const createPurchase = useMutation({
    mutationFn: async ({
      purchaseData,
      items,
    }: {
      purchaseData: Parameters<
        typeof purchasesService.createPurchaseWithItems
      >[0];
      items: Parameters<typeof purchasesService.createPurchaseWithItems>[1];
    }) => {
      const result = await purchasesService.createPurchaseWithItems(
        purchaseData,
        items
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.purchases.related(),
      });
    },
  });

  const updatePurchase = useMutation({
    mutationFn: async ({
      id,
      purchaseData,
      items,
    }: {
      id: string;
      purchaseData: Parameters<
        typeof purchasesService.updatePurchaseWithItems
      >[1];
      items?: Parameters<typeof purchasesService.updatePurchaseWithItems>[2];
    }) => {
      const result = await purchasesService.updatePurchaseWithItems(
        id,
        purchaseData,
        items
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.purchases.related(),
      });
      queryClient.invalidateQueries({
        queryKey: QueryKeys.purchases.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: QueryKeys.purchases.items(variables.id),
      });
    },
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const result = await purchasesService.deletePurchaseWithStockRestore(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.purchases.related(),
      });
    },
  });

  return {
    createPurchase,
    updatePurchase,
    deletePurchase,
  };
};

// Validation Hook
export const useCheckInvoiceUniqueness = (
  invoiceNumber: string,
  excludeId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.purchases.checkInvoice(invoiceNumber, excludeId),
    queryFn: () =>
      purchasesService.isInvoiceNumberUnique(invoiceNumber, excludeId),
    enabled: (options?.enabled ?? true) && invoiceNumber.length > 0,
  });
};
