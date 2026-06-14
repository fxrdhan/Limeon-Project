import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  deleteSaleWithStockRestore,
  fetchSalesListPage,
} from './salesListData';

const { mockSalesService } = vi.hoisted(() => ({
  mockSalesService: {
    deleteSaleWithStockRestore: vi.fn(),
    getPaginatedSales: vi.fn(),
  },
}));

vi.mock('@/services/api/sales.service', () => ({
  salesService: mockSalesService,
}));

describe('sales list data boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated sales through the sales service', async () => {
    const response = { sales: [], totalItems: 0 };
    mockSalesService.getPaginatedSales.mockResolvedValue({
      data: response,
      error: null,
    });

    await expect(fetchSalesListPage(3, 'SO', 50)).resolves.toBe(response);
    expect(mockSalesService.getPaginatedSales).toHaveBeenCalledWith({
      limit: 50,
      page: 3,
      searchTerm: 'SO',
    });
  });

  it('keeps the sales-list fallback load error', async () => {
    mockSalesService.getPaginatedSales.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(fetchSalesListPage(1, '', 10)).rejects.toThrow(
      'Gagal memuat data penjualan'
    );
  });

  it('throws sale delete service failures unchanged', async () => {
    const error = new Error('hapus gagal');
    mockSalesService.deleteSaleWithStockRestore.mockResolvedValue({
      data: null,
      error,
    });

    await expect(deleteSaleWithStockRestore('sale-1')).rejects.toBe(error);
  });
});
