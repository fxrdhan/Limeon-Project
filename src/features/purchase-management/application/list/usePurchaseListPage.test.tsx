import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { usePurchaseListPage } from './usePurchaseListPage';

vi.mock('@/components/dialog-box/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: vi.fn(),
  }),
}));

vi.mock('../../infrastructure/purchaseListData', () => ({
  deletePurchaseWithStockRestore: vi.fn(),
  fetchPurchaseListPage: vi.fn().mockResolvedValue({
    purchases: [],
    totalItems: 0,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('usePurchaseListPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale close timer hide a reopened add purchase portal', () => {
    const { result } = renderHook(() => usePurchaseListPage(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openAddPurchasePortal();
    });
    act(() => {
      result.current.closeAddPurchasePortal();
    });

    expect(result.current.isAddPurchaseClosing).toBe(true);

    act(() => {
      result.current.openAddPurchasePortal();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showAddPurchasePortal).toBe(true);
    expect(result.current.isAddPurchaseClosing).toBe(false);
  });

  it('clears a pending add purchase close timer on unmount', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => usePurchaseListPage(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openAddPurchasePortal();
    });
    act(() => {
      result.current.closeAddPurchasePortal();
    });

    const closeTimerResult = setTimeoutSpy.mock.results.find(
      (result, index) => {
        const delay = setTimeoutSpy.mock.calls[index]?.[1];
        return delay === 200 && result.type === 'return';
      }
    );

    unmount();

    expect(closeTimerResult).toBeDefined();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(closeTimerResult?.value);
  });
});
