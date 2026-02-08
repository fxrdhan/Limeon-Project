import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePurchaseForm } from './purchaseForm';
import type { PurchaseItem } from '@/types';

const navigateMock = vi.hoisted(() => vi.fn());
const recalculateItemsMock = vi.hoisted(() => vi.fn());
const computeItemFinancialsMock = vi.hoisted(() => vi.fn());
const validatePurchaseFormMock = vi.hoisted(() => vi.fn());

const createPurchaseWithItemsMock = vi.hoisted(() => vi.fn());
const getActiveSuppliersMock = vi.hoisted(() => vi.fn());
const getProfileMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('./calc', () => ({
  recalculateItems: recalculateItemsMock,
  computeItemFinancials: computeItemFinancialsMock,
  validatePurchaseForm: validatePurchaseFormMock,
}));

vi.mock('@/services/api/purchases.service', () => ({
  purchasesService: {
    createPurchaseWithItems: createPurchaseWithItemsMock,
  },
}));

vi.mock('@/services/api/masterData.service', () => ({
  supplierService: {
    getActiveSuppliers: getActiveSuppliersMock,
  },
}));

vi.mock('@/services/api/companyProfile.service', () => ({
  companyProfileService: {
    getProfile: getProfileMock,
  },
}));

const makeItem = (overrides: Partial<PurchaseItem> = {}): PurchaseItem => ({
  item: { name: 'Paracetamol', code: 'ITM-001' },
  id: 'row-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  quantity: 2,
  price: 1000,
  discount: 0,
  subtotal: 2000,
  unit: 'Unit',
  vat_percentage: 11,
  batch_no: null,
  expiry_date: null,
  unit_conversion_rate: 1,
  ...overrides,
});

describe('usePurchaseForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    navigateMock.mockReset();
    recalculateItemsMock.mockReset();
    computeItemFinancialsMock.mockReset();
    validatePurchaseFormMock.mockReset();

    createPurchaseWithItemsMock.mockReset();
    getActiveSuppliersMock.mockReset();
    getProfileMock.mockReset();

    recalculateItemsMock.mockImplementation((items: PurchaseItem[]) => items);
    computeItemFinancialsMock.mockReturnValue({ vatAmount: 10 });
    validatePurchaseFormMock.mockReturnValue({
      isValid: true,
      formErrors: [],
      itemErrors: [],
    });

    getActiveSuppliersMock.mockResolvedValue({
      data: [{ id: 'sup-1', name: 'Supplier A' }],
      error: null,
    });
    getProfileMock.mockResolvedValue({
      data: { name: 'PharmaSys', address: 'Jakarta' },
      error: null,
    });

    createPurchaseWithItemsMock.mockResolvedValue({ error: null });
  });

  it('loads suppliers/profile on mount and applies initial invoice number', async () => {
    const { result } = renderHook(() =>
      usePurchaseForm({ initialInvoiceNumber: 'INV-001' })
    );

    expect(result.current.formData.invoice_number).toBe('INV-001');

    await waitFor(() => {
      expect(getActiveSuppliersMock).toHaveBeenCalledTimes(1);
      expect(getProfileMock).toHaveBeenCalledTimes(1);
      expect(result.current.suppliers).toEqual([
        { id: 'sup-1', name: 'Supplier A' },
      ]);
    });
  });

  it('updates form state and item state through handlers', async () => {
    const { result } = renderHook(() => usePurchaseForm());

    await waitFor(() => {
      expect(getActiveSuppliersMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.handleChange({
        target: { name: 'supplier_id', value: 'sup-1', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => {
      result.current.handleChange({
        target: {
          name: 'is_vat_included',
          type: 'checkbox',
          checked: false,
        },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formData.supplier_id).toBe('sup-1');
    expect(result.current.formData.is_vat_included).toBe(false);

    act(() => {
      result.current.addItem(
        makeItem({
          id: 'row-1',
          discount: 10,
          unit: '',
          unit_conversion_rate: undefined,
        })
      );
    });

    expect(recalculateItemsMock).toHaveBeenCalled();
    expect(result.current.purchaseItems).toHaveLength(1);
    expect(result.current.purchaseItems[0].unit).toBe('Unit');
    expect(result.current.purchaseItems[0].unit_conversion_rate).toBe(1);

    act(() => {
      result.current.updateItem('row-1', 'quantity', 5);
    });
    act(() => {
      result.current.updateItemVat('row-1', 12);
    });
    act(() => {
      result.current.updateItemExpiry('row-1', '2027-01-01');
    });
    act(() => {
      result.current.updateItemBatchNo('row-1', 'BATCH-01');
    });

    expect(result.current.purchaseItems[0].quantity).toBe(5);
    expect(result.current.purchaseItems[0].vat_percentage).toBe(12);
    expect(result.current.purchaseItems[0].expiry_date).toBe('2027-01-01');
    expect(result.current.purchaseItems[0].batch_no).toBe('BATCH-01');

    act(() => {
      result.current.handleUnitChange(
        'row-1',
        'Box',
        () =>
          ({
            base_price: 1000,
            base_unit: 'Unit',
            package_conversions: [
              {
                conversion_rate: 10,
                base_price: 900,
                unit: { name: 'Box' },
              },
            ],
          }) as never
      );
    });

    expect(result.current.purchaseItems[0].unit).toBe('Box');
    expect(result.current.purchaseItems[0].price).toBe(900);
    expect(result.current.purchaseItems[0].unit_conversion_rate).toBe(10);

    act(() => {
      result.current.removeItem('row-1');
    });
    expect(result.current.purchaseItems).toHaveLength(0);
  });

  it('shows validation errors and skips submit when form is invalid', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    validatePurchaseFormMock.mockReturnValue({
      isValid: false,
      formErrors: ['supplier wajib diisi'],
      itemErrors: [{ id: 'row-1', errors: ['qty harus > 0'] }],
    });

    const { result } = renderHook(() => usePurchaseForm());

    await waitFor(() => {
      expect(getActiveSuppliersMock).toHaveBeenCalled();
    });

    const preventDefault = vi.fn();
    await act(async () => {
      await result.current.handleSubmit({ preventDefault } as never);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'supplier wajib diisi\nItem row-1: qty harus > 0'
    );
    expect(createPurchaseWithItemsMock).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('submits purchase successfully and navigates to purchases page', async () => {
    const { result } = renderHook(() => usePurchaseForm());

    await waitFor(() => {
      expect(getProfileMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.handleChange({
        target: { name: 'supplier_id', value: 'sup-1', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.addItem(makeItem());
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(createPurchaseWithItemsMock).toHaveBeenCalledTimes(1);

    const [purchasePayload, itemsPayload] =
      createPurchaseWithItemsMock.mock.calls[0];
    expect(purchasePayload).toMatchObject({
      supplier_id: 'sup-1',
      customer_name: 'PharmaSys',
      customer_address: 'Jakarta',
    });
    expect(itemsPayload).toHaveLength(1);
    expect(itemsPayload[0]).toMatchObject({
      item_id: 'item-1',
      quantity: 2,
      price: 1000,
      vat_percentage: 11,
    });

    expect(navigateMock).toHaveBeenCalledWith('/purchases');
    expect(result.current.loading).toBe(false);
  });

  it('shows failure alert when create purchase returns error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    createPurchaseWithItemsMock.mockResolvedValue({
      error: new Error('db down'),
    });

    const { result } = renderHook(() => usePurchaseForm());

    await waitFor(() => {
      expect(getActiveSuppliersMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.handleChange({
        target: { name: 'supplier_id', value: 'sup-1', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.addItem(makeItem());
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Gagal menyimpan pembelian. Silakan coba lagi.'
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
