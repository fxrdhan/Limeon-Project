import { purchasesService } from '@/services/api/purchases.service';

export const fetchPurchaseListPage = async (
  page: number,
  searchTerm: string,
  limit: number
) => {
  try {
    const { data, error } = await purchasesService.getPaginatedPurchases({
      page,
      limit,
      searchTerm,
    });

    if (error || !data) {
      throw error ?? new Error('Gagal memuat data pembelian');
    }

    return data;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
};

export const deletePurchaseWithStockRestore = async (id: string) => {
  const { error } = await purchasesService.deletePurchaseWithStockRestore(id);

  if (error) throw error;
};
