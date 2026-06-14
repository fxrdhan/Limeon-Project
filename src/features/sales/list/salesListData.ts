import { salesService } from '@/services/api/sales.service';

export const fetchSalesListPage = async (
  page: number,
  searchTerm: string,
  limit: number
) => {
  const { data, error } = await salesService.getPaginatedSales({
    page,
    limit,
    searchTerm,
  });

  if (error || !data) {
    throw error ?? new Error('Gagal memuat data penjualan');
  }

  return data;
};

export const deleteSaleWithStockRestore = async (id: string) => {
  const { error } = await salesService.deleteSaleWithStockRestore(id);

  if (error) throw error;
};
