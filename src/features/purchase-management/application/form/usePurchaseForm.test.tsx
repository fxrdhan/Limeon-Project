import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { PurchaseItem } from '../../../../types';
import { usePurchaseForm } from './usePurchaseForm';

const {
  createPurchaseWithItemsMock,
  fetchPurchaseFormCompanyProfileMock,
  invalidateQueryKeysMock,
  navigateMock,
  toastErrorMock,
  useSuppliersSyncMock,
} = vi.hoisted(() => ({
  createPurchaseWithItemsMock: vi.fn(),
  fetchPurchaseFormCompanyProfileMock: vi.fn(),
  invalidateQueryKeysMock: vi.fn(),
  navigateMock: vi.fn(),
  toastErrorMock: vi.fn(),
  useSuppliersSyncMock: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/features/item-management/public/useSupplierData', () => ({
  useSuppliers: () => ({ data: [] }),
  useSuppliersSync: useSuppliersSyncMock,
}));

vi.mock('@/lib/queryInvalidation', () => ({
  invalidateQueryKeys: invalidateQueryKeysMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

vi.mock('../../infrastructure/purchaseFormData', () => ({
  createPurchaseWithItems: createPurchaseWithItemsMock,
  fetchPurchaseFormCompanyProfile: fetchPurchaseFormCompanyProfileMock,
}));

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

const createWrapper = ({ strict = false }: { strict?: boolean } = {}) => {
  const queryClient = new QueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const content = (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return strict ? <StrictMode>{content}</StrictMode> : content;
  };

  return Wrapper;
};

const createPurchaseItem = (): PurchaseItem => ({
  id: 'purchase-item-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  item: {
    name: 'Paracetamol',
    code: 'PRC',
  },
  quantity: 1,
  price: 10_000,
  discount: 0,
  subtotal: 10_000,
  unit: 'Box',
  inventory_unit_id: null,
  unit_id: null,
  vat_percentage: 0,
  batch_no: null,
  expiry_date: null,
  unit_conversion_rate: 1,
});

const createSubmitEvent = () =>
  ({
    preventDefault: vi.fn(),
  }) as unknown as React.FormEvent;

describe('usePurchaseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPurchaseFormCompanyProfileMock.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('ignores duplicate submits while the purchase save is in flight', async () => {
    const save = createDeferred<{ error: null }>();
    createPurchaseWithItemsMock.mockReturnValue(save.promise);

    const { result } = renderHook(
      () => usePurchaseForm({ initialInvoiceNumber: 'INV-001' }),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.addItem(createPurchaseItem());
    });

    let firstSubmitPromise: Promise<boolean> = Promise.resolve(false);
    let secondSubmitPromise: Promise<boolean> = Promise.resolve(false);
    act(() => {
      firstSubmitPromise = result.current.handleSubmit(createSubmitEvent());
      secondSubmitPromise = result.current.handleSubmit(createSubmitEvent());
    });

    expect(createPurchaseWithItemsMock).toHaveBeenCalledOnce();

    await act(async () => {
      save.resolve({ error: null });
      await firstSubmitPromise;
      await secondSubmitPromise;
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/purchases');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('completes submit side effects after StrictMode effect replay', async () => {
    createPurchaseWithItemsMock.mockResolvedValue({ error: null });

    const { result } = renderHook(
      () => usePurchaseForm({ initialInvoiceNumber: 'INV-001' }),
      {
        wrapper: createWrapper({ strict: true }),
      }
    );

    act(() => {
      result.current.addItem(createPurchaseItem());
    });

    let didSubmit = false;
    await act(async () => {
      didSubmit = await result.current.handleSubmit(createSubmitEvent());
    });

    expect(didSubmit).toBe(true);
    expect(createPurchaseWithItemsMock).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith('/purchases');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('does not finish stale submit side effects after the form is disabled', async () => {
    const save = createDeferred<{ error: null }>();
    createPurchaseWithItemsMock.mockReturnValue(save.promise);

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePurchaseForm({ enabled, initialInvoiceNumber: 'INV-001' }),
      {
        initialProps: { enabled: true },
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.addItem(createPurchaseItem());
    });

    let submitPromise: Promise<boolean> = Promise.resolve(false);
    act(() => {
      submitPromise = result.current.handleSubmit(createSubmitEvent());
    });

    expect(createPurchaseWithItemsMock).toHaveBeenCalledOnce();

    act(() => {
      rerender({ enabled: false });
    });

    expect(result.current.loading).toBe(false);

    let didSubmit = true;
    await act(async () => {
      save.resolve({ error: null });
      didSubmit = await submitPromise;
      await Promise.resolve();
    });

    expect(didSubmit).toBe(false);
    expect(invalidateQueryKeysMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
