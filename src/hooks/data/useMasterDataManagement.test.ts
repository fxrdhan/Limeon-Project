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
        description: 'desc gamma',
      });
    });

    expect(createSupplierMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SUP-003',
        name: 'Supplier Gamma',
        address: 'Surabaya',
        description: 'desc gamma',
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

  it('handles hashtag debounce modes and extended/global-key guards', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const focusSpy = vi.spyOn(input, 'focus');
    const handleSearchChange = vi.fn();

    const { result } = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier', {
        searchInputRef: { current: input },
        handleSearchChange,
      })
    );

    act(() => {
      result.current.setSearch('#');
    });
    expect(result.current.debouncedSearch).toBe('');

    act(() => {
      result.current.setSearch('#name');
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedSearch).toBe('');

    act(() => {
      result.current.setSearch('#name:alpha');
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.debouncedSearch).toBe('#name:alpha');

    act(() => {
      result.current.setIsAddModalOpen(true);
    });
    fireEvent.keyDown(document, { key: 'z' });
    expect(handleSearchChange).not.toHaveBeenCalled();

    act(() => {
      result.current.setIsAddModalOpen(false);
    });
    fireEvent.keyDown(document, { key: 'z', altKey: true });
    expect(handleSearchChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'q' });
    expect(focusSpy).toHaveBeenCalled();
    expect(handleSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: 'q' } })
    );
  });

  it('filters table-specific searchable fields for patients, doctors, and customers', () => {
    usePatientsMock.mockReturnValue({
      data: [
        {
          id: 'pat-1',
          code: 'PAT-001',
          name: 'Pasien A',
          gender: 'male',
          address: 'Bogor',
          phone: '08123',
          email: 'pat@example.com',
          birth_date: '2000-01-01',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });
    const patients = renderHook(() =>
      useMasterDataManagement('patients', 'Patient')
    );
    act(() => {
      patients.result.current.setSearch('male');
      vi.advanceTimersByTime(300);
    });
    expect(patients.result.current.data).toHaveLength(1);

    useDoctorsMock.mockReturnValue({
      data: [
        {
          id: 'doc-1',
          code: 'DOC-001',
          name: 'Dokter A',
          specialization: 'cardiology',
          license_number: 'SIP-001',
          phone: '0888',
          email: 'doc@example.com',
          experience_years: 11,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });
    const doctors = renderHook(() =>
      useMasterDataManagement('doctors', 'Doctor')
    );
    act(() => {
      doctors.result.current.setSearch('cardiology');
      vi.advanceTimersByTime(300);
    });
    expect(doctors.result.current.data).toHaveLength(1);

    useCustomersMock.mockReturnValue({
      data: [
        {
          id: 'cus-1',
          code: 'CUS-001',
          name: 'Customer A',
          phone: '0899',
          email: 'cust@example.com',
          address: 'Depok',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });
    const customers = renderHook(() =>
      useMasterDataManagement('customers', 'Customer')
    );
    act(() => {
      customers.result.current.setSearch('depok');
      vi.advanceTimersByTime(300);
    });
    expect(customers.result.current.data).toHaveLength(1);
  });

  it('handles non-duplicate submit errors and catches global key handler exceptions', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const input = document.createElement('input');
    document.body.appendChild(input);
    const handleSearchChange = vi.fn(() => {
      throw new Error('keydown-failed');
    });

    createSupplierMutateAsyncMock.mockRejectedValueOnce(
      new Error('server-boom')
    );

    const { result } = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier', {
        searchInputRef: { current: input },
        handleSearchChange,
      })
    );

    await act(async () => {
      await result.current.handleModalSubmit({
        code: 'SUP-500',
        name: 'Broken Supplier',
      });
    });

    expect(alertErrorMock).toHaveBeenCalledWith(
      'Gagal menambahkan Supplier: Error: server-boom'
    );

    fireEvent.keyDown(document, { key: 'w' });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error in global keydown handler:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('clears debounced search states, resets page size, clears editing after close, and handles delete success', async () => {
    const { result } = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );

    act(() => {
      result.current.setSearch('Alpha');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.debouncedSearch).toBe('Alpha');

    act(() => {
      result.current.setSearch('   ');
    });
    expect(result.current.debouncedSearch).toBe('');

    act(() => {
      result.current.setSearch('Beta');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.debouncedSearch).toBe('Beta');

    act(() => {
      result.current.setSearch('#supplier');
    });
    expect(result.current.debouncedSearch).toBe('');

    act(() => {
      result.current.handleEdit(supplierRows[0]);
    });
    expect(result.current.editingItem?.id).toBe('sup-1');
    expect(result.current.isEditModalOpen).toBe(true);

    act(() => {
      result.current.setIsEditModalOpen(false);
    });
    expect(result.current.editingItem?.id).toBe('sup-1');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.editingItem).toBeNull();

    act(() => {
      result.current.handlePageChange(2);
      result.current.handleItemsPerPageChange(10);
    });
    expect(result.current.itemsPerPage).toBe(10);
    expect(result.current.currentPage).toBe(1);

    await act(async () => {
      await result.current.handleDelete('sup-1');
    });
    expect(deleteSupplierMutateAsyncMock).toHaveBeenCalledWith('sup-1');
    expect(refetchMock).toHaveBeenCalled();
  });

  it('covers table-specific field filters and sort score ordering branches', () => {
    useSuppliersMock.mockReturnValue({
      data: [
        { id: 's-code-start', code: 'af-01', name: 'code start' },
        { id: 's-code-include', code: 'xaf-02', name: 'code include' },
        { id: 's-name-start', code: 'zz-03', name: 'afandi' },
        { id: 's-name-include', code: 'zz-04', name: 'zafer' },
        { id: 's-name-fuzzy', code: 'zz-05', name: 'alpha fuzzy' },
        {
          id: 's-desc',
          code: '',
          name: 'desc row',
          description: 'special desc',
        },
        {
          id: 's-addr-generic',
          code: '',
          name: 'addr row',
          address: 'Main Street',
        },
        {
          id: 's-addr-supplier',
          code: '',
          name: 'addr supplier',
          address: { nested: true } as unknown as string,
        },
        { id: 's-phone', code: '', name: 'phone row', phone: '08123' },
        { id: 's-email', code: '', name: 'email row', email: 'mail@row.test' },
        {
          id: 's-contact',
          code: '',
          name: 'contact row',
          contact_person: 'Rani',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
      isFetching: false,
      isPlaceholderData: false,
    });

    usePatientsMock.mockReturnValue({
      data: [
        {
          id: 'pat-x',
          code: '',
          name: 'patient row',
          gender: 'male',
          address: { meta: 'raw' } as unknown as string,
          phone: '08234',
          email: 'pat@row.test',
          birth_date: '2000-02-02',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });

    useDoctorsMock.mockReturnValue({
      data: [
        {
          id: 'doc-x',
          code: '',
          name: 'doctor row',
          specialization: 'cardiology',
          license_number: 'SIP-900',
          phone: '08345',
          email: 'doc@row.test',
          experience_years: 12,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });

    useCustomersMock.mockReturnValue({
      data: [
        {
          id: 'cus-x',
          code: '',
          name: 'customer row',
          phone: '08456',
          email: 'cus@row.test',
          address: { info: 'raw' } as unknown as string,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isPlaceholderData: false,
    });

    fuzzyMatchMock.mockImplementation((text: string, term: string) => {
      const normalizedText = String(text).toLowerCase();
      const normalizedTerm = String(term).toLowerCase();
      if (normalizedText === 'alpha fuzzy' && normalizedTerm === 'af')
        return true;
      if (normalizedText === '[object object]' && normalizedTerm === 'object') {
        return true;
      }
      return normalizedText.includes(normalizedTerm);
    });

    const suppliers = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );
    act(() => {
      suppliers.result.current.setSearch('af');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(suppliers.result.current.data.map(item => item.id)).toEqual([
      's-code-start',
      's-code-include',
      's-name-start',
      's-name-include',
      's-name-fuzzy',
    ]);

    act(() => {
      suppliers.result.current.setSearch('special desc');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(suppliers.result.current.data[0].id).toBe('s-desc');

    act(() => {
      suppliers.result.current.setSearch('main street');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(suppliers.result.current.data[0].id).toBe('s-addr-generic');

    act(() => {
      suppliers.result.current.setSearch('object');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(
      suppliers.result.current.data.some(item => item.id === 's-addr-supplier')
    ).toBe(true);

    act(() => {
      suppliers.result.current.setSearch('08123');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(suppliers.result.current.data[0].id).toBe('s-phone');

    act(() => {
      suppliers.result.current.setSearch('mail@row.test');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(suppliers.result.current.data[0].id).toBe('s-email');

    act(() => {
      suppliers.result.current.setSearch('rani');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(suppliers.result.current.data[0].id).toBe('s-contact');

    const patients = renderHook(() =>
      useMasterDataManagement('patients', 'Patient')
    );
    act(() => {
      patients.result.current.setSearch('object');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(patients.result.current.data[0].id).toBe('pat-x');
    act(() => {
      patients.result.current.setSearch('08234');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(patients.result.current.data[0].id).toBe('pat-x');
    act(() => {
      patients.result.current.setSearch('pat@row.test');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(patients.result.current.data[0].id).toBe('pat-x');
    act(() => {
      patients.result.current.setSearch('2000-02-02');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(patients.result.current.data[0].id).toBe('pat-x');

    const doctors = renderHook(() =>
      useMasterDataManagement('doctors', 'Doctor')
    );
    act(() => {
      doctors.result.current.setSearch('sip-900');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(doctors.result.current.data[0].id).toBe('doc-x');
    act(() => {
      doctors.result.current.setSearch('08345');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(doctors.result.current.data[0].id).toBe('doc-x');
    act(() => {
      doctors.result.current.setSearch('doc@row.test');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(doctors.result.current.data[0].id).toBe('doc-x');
    act(() => {
      doctors.result.current.setSearch('12');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(doctors.result.current.data[0].id).toBe('doc-x');

    const customers = renderHook(() =>
      useMasterDataManagement('customers', 'Customer')
    );
    act(() => {
      customers.result.current.setSearch('08456');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(customers.result.current.data[0].id).toBe('cus-x');
    act(() => {
      customers.result.current.setSearch('cus@row.test');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(customers.result.current.data[0].id).toBe('cus-x');
    act(() => {
      customers.result.current.setSearch('object');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(customers.result.current.data[0].id).toBe('cus-x');

    useSuppliersMock.mockReturnValue({
      data: [
        { id: 'tie-2', code: 'xaf-20', name: 'row b' },
        { id: 'tie-1', code: 'xaf-10', name: 'row a' },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
      isFetching: false,
      isPlaceholderData: false,
    });
    const tieByCode = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );
    act(() => {
      tieByCode.result.current.setSearch('af');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(tieByCode.result.current.data.map(item => item.id)).toEqual([
      'tie-1',
      'tie-2',
    ]);

    useSuppliersMock.mockReturnValue({
      data: [
        { id: 'tie-name-b', name: 'beta only' } as never,
        { id: 'tie-name-a', name: 'alpha only' } as never,
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
      isFetching: false,
      isPlaceholderData: false,
    });
    const tieByName = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );
    act(() => {
      tieByName.result.current.setSearch('only');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(tieByName.result.current.data.map(item => item.id)).toEqual([
      'tie-name-a',
      'tie-name-b',
    ]);

    useSuppliersMock.mockReturnValue({
      data: [
        { id: 'score-zero-1', code: '', name: 'phone route', phone: '08111' },
        { id: 'score-zero-2', code: '', name: 'phone route 2', phone: '08111' },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
      isFetching: false,
      isPlaceholderData: false,
    });
    const scoreZeroSort = renderHook(() =>
      useMasterDataManagement('suppliers', 'Supplier')
    );
    act(() => {
      scoreZeroSort.result.current.setSearch('08111');
      vi.advanceTimersByTime(300);
    });
    expect(scoreZeroSort.result.current.data.map(item => item.id)).toEqual([
      'score-zero-1',
      'score-zero-2',
    ]);
  });
});
