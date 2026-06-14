import { purchasesService } from '@/services/api/purchases.service';
import type { PurchaseData, PurchaseItem } from '@/types';

export const fetchViewPurchaseData = async (
  purchaseId: string
): Promise<{ purchase: PurchaseData; items: PurchaseItem[] }> => {
  const [purchaseResult, itemsResult] = await Promise.all([
    purchasesService.getPurchaseWithDetails(purchaseId),
    purchasesService.getPurchaseItems(purchaseId),
  ]);

  if (purchaseResult.error || !purchaseResult.data) {
    throw purchaseResult.error ?? new Error('Data pembelian tidak ditemukan');
  }

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  return {
    purchase: purchaseResult.data,
    items: itemsResult.data || [],
  };
};
