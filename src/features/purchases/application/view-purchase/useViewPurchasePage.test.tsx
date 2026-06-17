import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { PurchaseData, PurchaseItem } from '../../../../types';
import { PURCHASE_PRINT_SESSION_KEY } from '../../domain/purchaseDocument';
import { useViewPurchasePage } from './useViewPurchasePage';

const { fetchViewPurchaseDataMock, navigateMock, routeParamsMock } = vi.hoisted(
  () => ({
    fetchViewPurchaseDataMock: vi.fn(),
    navigateMock: vi.fn(),
    routeParamsMock: { id: 'purchase-1' },
  })
);

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => routeParamsMock,
  };
});

vi.mock('../../infrastructure/viewPurchaseData', () => ({
  fetchViewPurchaseData: fetchViewPurchaseDataMock,
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

const purchaseTwo: PurchaseData = {
  ...purchase,
  id: 'purchase-2',
  invoice_number: 'INV-002',
};

const createDeferred = <T,>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const storagePrototype = Object.getPrototypeOf(
  window.sessionStorage
) as Storage;
const setItemDescriptor = Object.getOwnPropertyDescriptor(
  storagePrototype,
  'setItem'
);

const renderLoadedHook = async () => {
  fetchViewPurchaseDataMock.mockResolvedValue({
    purchase,
    items: [item],
  });

  const renderedHook = renderHook(() => useViewPurchasePage());

  await waitFor(() => {
    expect(renderedHook.result.current.loading).toBe(false);
  });

  return renderedHook;
};

describe('useViewPurchasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParamsMock.id = 'purchase-1';
    window.sessionStorage.clear();
    vi.spyOn(window, 'open').mockReturnValue({
      focus: vi.fn(),
    } as unknown as Window);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    if (setItemDescriptor) {
      Object.defineProperty(storagePrototype, 'setItem', setItemDescriptor);
    }
  });

  it('stores printable purchase data before opening the print route in a new tab', async () => {
    const { result } = await renderLoadedHook();

    result.current.openPrintableVersion();

    expect(window.open).toHaveBeenCalledWith('/purchases/print-view', '_blank');
    expect(window.sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY)).toContain(
      '"invoice_number":"INV-001"'
    );
  });

  it('uses the current tab when the browser blocks the print popup', async () => {
    vi.mocked(window.open).mockReturnValue(null);
    const { result } = await renderLoadedHook();

    result.current.openPrintableVersion();

    expect(navigateMock).toHaveBeenCalledWith('/purchases/print-view');
  });

  it('does not open an empty print route when session storage is unavailable', async () => {
    Object.defineProperty(storagePrototype, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('storage unavailable');
      },
    });
    const { result } = await renderLoadedHook();

    result.current.openPrintableVersion();

    expect(window.open).not.toHaveBeenCalled();
  });

  it('does not open an empty print route before purchase data is ready', async () => {
    const purchaseFetch = createDeferred<{
      purchase: PurchaseData;
      items: PurchaseItem[];
    }>();
    fetchViewPurchaseDataMock.mockReturnValue(purchaseFetch.promise);

    const { result } = renderHook(() => useViewPurchasePage());

    act(() => {
      result.current.openPrintableVersion();
    });

    expect(
      window.sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY)
    ).toBeNull();
    expect(window.open).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      purchaseFetch.resolve({
        purchase,
        items: [item],
      });
      await purchaseFetch.promise;
      await Promise.resolve();
    });
  });

  it('does not print the previous purchase while the next route is loading', async () => {
    const nextFetch = createDeferred<{
      purchase: PurchaseData;
      items: PurchaseItem[];
    }>();
    fetchViewPurchaseDataMock
      .mockResolvedValueOnce({
        purchase,
        items: [item],
      })
      .mockReturnValueOnce(nextFetch.promise);

    const renderedHook = renderHook(() => useViewPurchasePage());

    await waitFor(() => {
      expect(renderedHook.result.current.loading).toBe(false);
    });

    routeParamsMock.id = 'purchase-2';
    renderedHook.rerender();

    await waitFor(() => {
      expect(renderedHook.result.current.loading).toBe(true);
    });

    act(() => {
      renderedHook.result.current.openPrintableVersion();
    });

    expect(
      window.sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY)
    ).toBeNull();
    expect(window.open).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      nextFetch.resolve({
        purchase: purchaseTwo,
        items: [{ ...item, id: 'purchase-item-2' }],
      });
      await nextFetch.promise;
      await Promise.resolve();
    });
  });

  it('ignores stale purchase data after the route id changes', async () => {
    const firstFetch = createDeferred<{
      purchase: PurchaseData;
      items: PurchaseItem[];
    }>();
    const secondFetch = createDeferred<{
      purchase: PurchaseData;
      items: PurchaseItem[];
    }>();
    fetchViewPurchaseDataMock
      .mockReturnValueOnce(firstFetch.promise)
      .mockReturnValueOnce(secondFetch.promise);

    const renderedHook = renderHook(() => useViewPurchasePage());

    routeParamsMock.id = 'purchase-2';
    renderedHook.rerender();

    await act(async () => {
      firstFetch.resolve({
        purchase,
        items: [item],
      });
      await firstFetch.promise;
      await Promise.resolve();
    });

    expect(renderedHook.result.current.purchase).toBeNull();
    expect(renderedHook.result.current.loading).toBe(true);

    await act(async () => {
      secondFetch.resolve({
        purchase: purchaseTwo,
        items: [{ ...item, id: 'purchase-item-2' }],
      });
      await secondFetch.promise;
      await Promise.resolve();
    });

    expect(renderedHook.result.current.purchase?.id).toBe('purchase-2');
    expect(renderedHook.result.current.loading).toBe(false);
  });
});
