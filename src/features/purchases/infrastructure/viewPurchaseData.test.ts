import { describe, expect, it, vi, beforeEach } from 'vite-plus/test';
import type { PurchaseData, PurchaseItem } from '../../../types';
import { fetchViewPurchaseData } from './viewPurchaseData';

const { getPurchaseItemsMock, getPurchaseWithDetailsMock } = vi.hoisted(() => ({
  getPurchaseItemsMock: vi.fn(),
  getPurchaseWithDetailsMock: vi.fn(),
}));

vi.mock('@/services/api/purchases.service', () => ({
  purchasesService: {
    getPurchaseItems: getPurchaseItemsMock,
    getPurchaseWithDetails: getPurchaseWithDetailsMock,
  },
}));

const purchase: PurchaseData = {
  id: 'purchase-1',
  invoice_number: 'INV-001',
  date: '2026-06-14',
  due_date: null,
  total: 100_000,
  payment_status: 'paid',
  payment_method: 'cash',
  vat_percentage: 11,
  is_vat_included: true,
  vat_amount: 9_909,
  notes: null,
  supplier: {
    name: 'PT Supplier',
    address: null,
    contact_person: null,
  },
};

const item: PurchaseItem = {
  id: 'purchase-item-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  item: {
    name: 'Paracetamol',
    code: 'PRC',
  },
  quantity: 2,
  price: 50_000,
  discount: 0,
  subtotal: 100_000,
  unit: 'Box',
  inventory_unit_id: null,
  unit_id: null,
  vat_percentage: 11,
  batch_no: null,
  expiry_date: null,
  unit_conversion_rate: 1,
};

describe('view purchase data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads purchase details and items together', async () => {
    getPurchaseWithDetailsMock.mockResolvedValue({
      data: purchase,
      error: null,
    });
    getPurchaseItemsMock.mockResolvedValue({ data: [item], error: null });

    await expect(fetchViewPurchaseData('purchase-1')).resolves.toEqual({
      purchase,
      items: [item],
    });
    expect(getPurchaseWithDetailsMock).toHaveBeenCalledWith('purchase-1');
    expect(getPurchaseItemsMock).toHaveBeenCalledWith('purchase-1');
  });

  it('preserves the missing purchase error message', async () => {
    getPurchaseWithDetailsMock.mockResolvedValue({ data: null, error: null });
    getPurchaseItemsMock.mockResolvedValue({ data: [], error: null });

    await expect(fetchViewPurchaseData('missing')).rejects.toThrow(
      'Data pembelian tidak ditemukan'
    );
  });
});
