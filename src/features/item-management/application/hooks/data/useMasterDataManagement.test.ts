import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useMasterDataManagement } from './useMasterDataManagement';
import type { MasterDataIdentity } from './master-data-management/types';

const {
  createCustomerMock,
  deleteCustomerMock,
  getHooksForTableMock,
  openConfirmDialogMock,
  refetchMock,
  updateCustomerMock,
  useAlertErrorMock,
} = vi.hoisted(() => ({
  createCustomerMock: vi.fn(),
  deleteCustomerMock: vi.fn(),
  getHooksForTableMock: vi.fn(),
  openConfirmDialogMock: vi.fn(),
  refetchMock: vi.fn(),
  updateCustomerMock: vi.fn(),
  useAlertErrorMock: vi.fn(),
}));

vi.mock('@/components/dialog-box/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: openConfirmDialogMock,
  }),
}));

vi.mock('@/components/alert/hooks', () => ({
  useAlert: () => ({
    error: useAlertErrorMock,
  }),
}));

vi.mock('./master-data-management/tableHooks', () => ({
  getHooksForTable: getHooksForTableMock,
}));

const createDeferred = <T>() => {
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

const createIdentity = (id: string): MasterDataIdentity =>
  ({
    id,
    name: `Identity ${id}`,
  }) as MasterDataIdentity;

const arrangeCustomerHooks = () => {
  getHooksForTableMock.mockReturnValue({
    useData: () => ({
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
      isPlaceholderData: false,
      refetch: refetchMock,
    }),
    useMutations: () => ({
      createCustomer: {
        mutateAsync: createCustomerMock,
      },
      deleteCustomer: {
        mutateAsync: deleteCustomerMock,
      },
      updateCustomer: {
        mutateAsync: updateCustomerMock,
      },
    }),
  });
};

describe('useMasterDataManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock.mockResolvedValue(undefined);
    arrangeCustomerHooks();
  });

  it('does not close a newer add modal when an older submit resolves', async () => {
    const submit = createDeferred<{ id: string }>();
    createCustomerMock.mockReturnValueOnce(submit.promise);

    const { result } = renderHook(() =>
      useMasterDataManagement('customers', 'Pelanggan')
    );

    act(() => {
      result.current.setIsAddModalOpen(true);
    });

    let submitPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      submitPromise = result.current.handleModalSubmit({
        data: { name: 'Old Customer' },
      });
    });

    act(() => {
      result.current.setIsAddModalOpen(false);
      result.current.setIsAddModalOpen(true);
    });

    await act(async () => {
      submit.resolve({ id: 'created-customer' });
      await submitPromise;
      await Promise.resolve();
    });

    expect(result.current.isAddModalOpen).toBe(true);
  });

  it('does not close a newer edit modal when an older delete resolves', async () => {
    const deleteOperation = createDeferred<void>();
    deleteCustomerMock.mockReturnValueOnce(deleteOperation.promise);

    const { result } = renderHook(() =>
      useMasterDataManagement('customers', 'Pelanggan')
    );

    act(() => {
      result.current.handleEdit(createIdentity('old-customer'));
    });

    let deletePromise: Promise<void> = Promise.resolve();
    act(() => {
      deletePromise = result.current.handleDelete('old-customer');
    });

    act(() => {
      result.current.handleEdit(createIdentity('new-customer'));
    });

    await act(async () => {
      deleteOperation.resolve();
      await deletePromise;
      await Promise.resolve();
    });

    expect(result.current.isEditModalOpen).toBe(true);
    expect(result.current.editingItem?.id).toBe('new-customer');
  });
});
