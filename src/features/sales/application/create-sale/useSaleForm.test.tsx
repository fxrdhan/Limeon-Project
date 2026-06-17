import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { Item, SaleItem } from '../../../../types';
import { useSaleForm } from './useSaleForm';

const {
  createSaleWithItemsMock,
  invalidateQueryKeysMock,
  navigateMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  createSaleWithItemsMock: vi.fn(),
  invalidateQueryKeysMock: vi.fn(),
  navigateMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/features/item-management/public/useIdentityData', () => ({
  useCustomers: () => ({ data: [] }),
  useDoctors: () => ({ data: [] }),
  usePatients: () => ({ data: [] }),
}));

vi.mock('@/lib/queryInvalidation', () => ({
  invalidateQueryKeys: invalidateQueryKeysMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

vi.mock('../../infrastructure/saleFormData', () => ({
  createSaleWithItems: createSaleWithItemsMock,
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

const createWrapper = () => {
  const queryClient = new QueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createSaleItem = (): SaleItem => ({
  id: 'sale-item-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  item: {
    name: 'Paracetamol',
    code: 'PRC',
  },
  quantity: 1,
  price: 12_000,
  subtotal: 12_000,
  unit_name: 'Box',
  inventory_unit_id: null,
  unit_id: null,
  unit_conversion_rate: 1,
});

const createSubmitEvent = () =>
  ({
    preventDefault: vi.fn(),
  }) as unknown as React.FormEvent;

describe('useSaleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores duplicate submits while the sale save is in flight', async () => {
    const save = createDeferred<{ error: null }>();
    createSaleWithItemsMock.mockReturnValue(save.promise);
    const itemLookup = () =>
      ({
        id: 'item-1',
        stock: 20,
      }) as Item;

    const { result } = renderHook(() => useSaleForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addItem(createSaleItem());
    });

    let firstSubmitPromise: Promise<void> = Promise.resolve();
    let secondSubmitPromise: Promise<void> = Promise.resolve();
    act(() => {
      firstSubmitPromise = result.current.handleSubmit(
        createSubmitEvent(),
        itemLookup
      );
      secondSubmitPromise = result.current.handleSubmit(
        createSubmitEvent(),
        itemLookup
      );
    });

    expect(createSaleWithItemsMock).toHaveBeenCalledOnce();

    await act(async () => {
      save.resolve({ error: null });
      await firstSubmitPromise;
      await secondSubmitPromise;
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/sales');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('does not finish stale submit side effects after the form is disabled', async () => {
    const save = createDeferred<{ error: null }>();
    createSaleWithItemsMock.mockReturnValue(save.promise);
    const itemLookup = () =>
      ({
        id: 'item-1',
        stock: 20,
      }) as Item;

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useSaleForm({ enabled }),
      {
        initialProps: { enabled: true },
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.addItem(createSaleItem());
    });

    let submitPromise: Promise<void> = Promise.resolve();
    act(() => {
      submitPromise = result.current.handleSubmit(
        createSubmitEvent(),
        itemLookup
      );
    });

    expect(createSaleWithItemsMock).toHaveBeenCalledOnce();

    act(() => {
      rerender({ enabled: false });
    });

    expect(result.current.loading).toBe(false);

    await act(async () => {
      save.resolve({ error: null });
      await submitPromise;
      await Promise.resolve();
    });

    expect(invalidateQueryKeysMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
