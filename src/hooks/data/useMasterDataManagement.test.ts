import { act, fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMasterDataManagement } from './useMasterDataManagement';

const openConfirmDialogMock = vi.hoisted(() => vi.fn());
const alertErrorMock = vi.hoisted(() => vi.fn());

const fuzzyMatchMock = vi.hoisted(() => vi.fn());

const useSuppliersMock = vi.hoisted(() => vi.fn());
const useSupplierMutationsMock = vi.hoisted(() => vi.fn());
const usePatientsMock = vi.hoisted(() => vi.fn());
const usePatientMutationsMock = vi.hoisted(() => vi.fn());
const useDoctorsMock = vi.hoisted(() => vi.fn());
const useDoctorMutationsMock = vi.hoisted(() => vi.fn());
const useCustomersMock = vi.hoisted(() => vi.fn());
const useCustomerMutationsMock = vi.hoisted(() => vi.fn());

const refetchMock = vi.hoisted(() => vi.fn());
const createSupplierMutateAsyncMock = vi.hoisted(() => vi.fn());
const updateSupplierMutateAsyncMock = vi.hoisted(() => vi.fn());
const deleteSupplierMutateAsyncMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/dialog-box', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: openConfirmDialogMock,
  }),
}));

vi.mock('@/components/alert/hooks', () => ({
  useAlert: () => ({
    error: alertErrorMock,
  }),
}));

vi.mock('@/utils/search', () => ({
  fuzzyMatch: fuzzyMatchMock,
}));

vi.mock('@/hooks/queries', () => ({
  useSuppliers: useSuppliersMock,
  useSupplierMutations: useSupplierMutationsMock,
  usePatients: usePatientsMock,
  usePatientMutations: usePatientMutationsMock,
  useDoctors: useDoctorsMock,
  useDoctorMutations: useDoctorMutationsMock,
  useCustomers: useCustomersMock,
  useCustomerMutations: useCustomerMutationsMock,
}));

const supplierRows = [
  {
    id: 'sup-1',
    code: 'SUP-001',
    name: 'Supplier Alpha',
    address: 'Jakarta',
    phone: '081',
    email: 'alpha@sup.test',
    contact_person: 'Andi',
  },
  {
    id: 'sup-2',
    code: 'SUP-002',
    name: 'Supplier Beta',
    address: 'Bandung',
    phone: '082',
    email: 'beta@sup.test',
    contact_person: 'Budi',
  },
];

describe('useMasterDataManagement', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    openConfirmDialogMock.mockReset();
    alertErrorMock.mockReset();
    fuzzyMatchMock.mockReset();

    useSuppliersMock.mockReset();
    useSupplierMutationsMock.mockReset();
    usePatientsMock.mockReset();
    usePatientMutationsMock.mockReset();
    useDoctorsMock.mockReset();
    useDoctorMutationsMock.mockReset();
    useCustomersMock.mockReset();
    useCustomerMutationsMock.mockReset();

    refetchMock.mockReset();
    createSupplierMutateAsyncMock.mockReset();
    updateSupplierMutateAsyncMock.mockReset();
    deleteSupplierMutateAsyncMock.mockReset();

    fuzzyMatchMock.mockImplementation((text: string, term: string) =>
      String(text).toLowerCase().includes(String(term).toLowerCase())
    );

    useSuppliersMock.mockReturnValue({
      data: supplierRows,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
      isFetching: false,
      isPlaceholderData: false,
    });

    useSupplierMutationsMock.mockReturnValue({
      createSupplier: { mutateAsync: createSupplierMutateAsyncMock },
      updateSupplier: { mutateAsync: updateSupplierMutateAsyncMock },
      deleteSupplier: { mutateAsync: deleteSupplierMutateAsyncMock },
    });

    usePatientsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });
    usePatientMutationsMock.mockReturnValue({});
    useDoctorsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });
    useDoctorMutationsMock.mockReturnValue({});
    useCustomersMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });
    useCustomerMutationsMock.mockReturnValue({});

    createSupplierMutateAsyncMock.mockResolvedValue({ id: 'sup-3' });
    updateSupplierMutateAsyncMock.mockResolvedValue({ id: 'sup-1' });
    deleteSupplierMutateAsyncMock.mockResolvedValue({ id: 'sup-1' });
  });

  it('filters, paginates, and supports enter-key edit flow', () => {
    const { result } = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );

    expect(result.current.data).toHaveLength(2);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPages).toBe(1);

    act(() => {
      result.current.setItemsPerPage(1);
      result.current.handlePageChange(2);
    });
    expect(result.current.data).toEqual([supplierRows[1]]);

    act(() => {
      result.current.handlePageChange(1);
      result.current.setSearch('Alpha');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearch).toBe('Alpha');
    expect(result.current.data[0].id).toBe('sup-1');

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(result.current.isEditModalOpen).toBe(true);
    expect(result.current.editingItem?.id).toBe('sup-1');
  });

  it('handles modal submit create/update success and duplicate-code error', async () => {
    const { result } = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );

    await act(async () => {
      await result.current.handleModalSubmit({
        code: 'SUP-003',
        name: 'Supplier Gamma',
        address: 'Surabaya',
      });
    });

    expect(createSupplierMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SUP-003',
        name: 'Supplier Gamma',
        address: 'Surabaya',
      })
    );
    expect(refetchMock).toHaveBeenCalled();

    await act(async () => {
      await result.current.handleModalSubmit({
        id: 'sup-1',
        code: 'SUP-001',
        name: 'Supplier Updated',
      });
    });

    expect(updateSupplierMutateAsyncMock).toHaveBeenCalledWith({
      id: 'sup-1',
      data: expect.objectContaining({
        code: 'SUP-001',
        name: 'Supplier Updated',
      }),
    });

    createSupplierMutateAsyncMock.mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: 'already exists',
    });

    await act(async () => {
      await result.current.handleModalSubmit({
        code: 'SUP-001',
        name: 'Supplier Duplicate',
      });
    });

    expect(alertErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('Kode "SUP-001" sudah digunakan')
    );
  });

  it('handles delete errors, add-modal enter flow, and unsupported table', async () => {
    const { result } = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );

    deleteSupplierMutateAsyncMock.mockRejectedValueOnce(
      new Error('violates foreign key constraint')
    );

    await act(async () => {
      await result.current.handleDelete('sup-1');
    });

    expect(alertErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('Tidak dapat menghapus supplier')
    );

    deleteSupplierMutateAsyncMock.mockRejectedValueOnce(
      new Error('delete fail')
    );
    await act(async () => {
      await result.current.handleDelete('sup-2');
    });

    expect(alertErrorMock).toHaveBeenCalledWith(
      'Gagal menghapus Supplier: delete fail'
    );

    act(() => {
      result.current.setSearch('tidak ada data');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(result.current.isAddModalOpen).toBe(true);

    expect(() =>
      renderHook(() => useMasterDataManagement('unknown-table', 'Unknown'))
    ).toThrow('Unsupported table: unknown-table');
  });

  it('supports global keydown auto-focus for search input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const focusSpy = vi.spyOn(input, 'focus');
    const handleSearchChange = vi.fn();

    renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier', {
        searchInputRef: { current: input },
        handleSearchChange,
      })
    );

    fireEvent.keyDown(document, { key: 's' });

    expect(focusSpy).toHaveBeenCalled();
    expect(handleSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 's' },
      })
    );

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handleSearchChange).toHaveBeenCalledTimes(1);
  });
});
