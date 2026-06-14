import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  deletePurchaseWithStockRestore,
  fetchPurchaseListPage,
} from './purchaseListData';

const { mockPurchasesService } = vi.hoisted(() => ({
  mockPurchasesService: {
    deletePurchaseWithStockRestore: vi.fn(),
    getPaginatedPurchases: vi.fn(),
  },
}));

vi.mock('@/services/api/purchases.service', () => ({
  purchasesService: mockPurchasesService,
}));

describe('purchase list data boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated purchases through the purchase service', async () => {
    const response = { purchases: [], totalItems: 0 };
    mockPurchasesService.getPaginatedPurchases.mockResolvedValue({
      data: response,
      error: null,
    });

    await expect(fetchPurchaseListPage(2, 'INV', 25)).resolves.toBe(response);
    expect(mockPurchasesService.getPaginatedPurchases).toHaveBeenCalledWith({
      limit: 25,
      page: 2,
      searchTerm: 'INV',
    });
  });

  it('keeps the purchase-list fallback load error', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockPurchasesService.getPaginatedPurchases.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(fetchPurchaseListPage(1, '', 10)).rejects.toThrow(
      'Gagal memuat data pembelian'
    );
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('throws purchase delete service failures unchanged', async () => {
    const error = new Error('hapus gagal');
    mockPurchasesService.deletePurchaseWithStockRestore.mockResolvedValue({
      data: null,
      error,
    });

    await expect(deletePurchaseWithStockRestore('purchase-1')).rejects.toBe(
      error
    );
  });
});
