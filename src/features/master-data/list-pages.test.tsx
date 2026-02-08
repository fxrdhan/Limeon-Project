import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerList from './customer-list';
import DoctorListNew from './doctor-list';
import PatientListNew from './patient-list';
import SupplierListNew from './supplier-list';

type ColumnDefStub = {
  valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
};

type MasterDataPagePropsStub = {
  onAddClick: () => void;
  gridProps: {
    onRowClicked?: (event: { data: { id: string; name: string } }) => void;
    columnDefs: ColumnDefStub[];
    autoSizeColumns?: string[];
  };
  pagination: {
    onPageSizeChange?: (pageSize: number) => void;
  };
  children?: unknown;
};

type IdentityModalPropsStub = {
  title: string;
  data?: Record<string, unknown>;
  initialNameFromSearch?: string;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDeleteRequest?: () => void;
};

const useMasterDataManagementMock = vi.hoisted(() => vi.fn());
const useMasterDataListMock = vi.hoisted(() => vi.fn());
const useCustomerLevelsMock = vi.hoisted(() => vi.fn());

const pagePropsStore = vi.hoisted(() => ({
  current: null as MasterDataPagePropsStub | null,
}));

const modalPropsStore = vi.hoisted(() => [] as IdentityModalPropsStub[]);

vi.mock('@/hooks/data/useMasterDataManagement', () => ({
  useMasterDataManagement: (...args: unknown[]) =>
    useMasterDataManagementMock(...args),
}));

vi.mock('@/features/master-data/hooks/useMasterDataList', () => ({
  useMasterDataList: (...args: unknown[]) => useMasterDataListMock(...args),
}));

vi.mock(
  '@/features/item-management/application/hooks/data/useCustomerLevels',
  () => ({
    useCustomerLevels: () => useCustomerLevelsMock(),
  })
);

vi.mock('@/features/master-data/components/MasterDataListPage', () => ({
  default: (props: MasterDataPagePropsStub) => {
    pagePropsStore.current = props;
    return (
      <div>
        <button type="button" onClick={props.onAddClick}>
          open-add-modal
        </button>
        <button
          type="button"
          onClick={() =>
            props.gridProps.onRowClicked?.({
              data: { id: 'row-1', name: 'Clicked Row' },
            })
          }
        >
          row-click
        </button>
        <button
          type="button"
          onClick={() => props.pagination.onPageSizeChange?.(100)}
        >
          set-page-size
        </button>
        {props.children}
      </div>
    );
  },
}));

vi.mock('@/components/IdentityDataModal', () => ({
  default: (props: IdentityModalPropsStub) => {
    modalPropsStore.push(props);
    return <div data-testid={`modal-${props.title}`}>{props.title}</div>;
  },
}));

const createManagementState = (overrides: Record<string, unknown> = {}) => ({
  isAddModalOpen: true,
  setIsAddModalOpen: vi.fn(),
  isEditModalOpen: true,
  setIsEditModalOpen: vi.fn(),
  editingItem: { id: 'edit-1', name: 'Edit Name' },
  data: [{ id: 'data-1', name: 'Data Name' }],
  totalItems: 1,
  isLoading: false,
  isError: false,
  queryError: null,
  isFetching: false,
  handleEdit: vi.fn(),
  handleModalSubmit: vi.fn().mockResolvedValue(undefined),
  handlePageChange: vi.fn(),
  handleItemsPerPageChange: vi.fn(),
  totalPages: 1,
  currentPage: 1,
  itemsPerPage: 25,
  handleDelete: vi.fn().mockResolvedValue(undefined),
  openConfirmDialog: vi.fn(),
  debouncedSearch: 'debounced keyword',
  handleKeyDown: vi.fn(),
  setSearch: vi.fn(),
  ...overrides,
});

const createListState = (overrides: Record<string, unknown> = {}) => ({
  gridApi: null,
  setCurrentPageSize: vi.fn(),
  gridHeight: 480,
  handleGridReady: vi.fn(),
  search: 'find me',
  isExternalFilterPresent: vi.fn(() => false),
  doesExternalFilterPass: vi.fn(() => true),
  searchBarProps: {} as never,
  ...overrides,
});

const getModalProps = (title: string) => {
  const modal = modalPropsStore.find(entry => entry.title === title);
  expect(modal).toBeDefined();
  return modal as IdentityModalPropsStub;
};

describe('Master data list pages', () => {
  beforeEach(() => {
    useMasterDataManagementMock.mockReset();
    useMasterDataListMock.mockReset();
    useCustomerLevelsMock.mockReset();
    modalPropsStore.length = 0;
    pagePropsStore.current = null;
  });

  it('covers customer list add/edit/delete mappings and column fallbacks', async () => {
    const management = createManagementState({
      editingItem: { id: 'cust-9', name: 'Pelanggan Lama' },
    });
    const list = createListState();

    useMasterDataManagementMock.mockReturnValue(management);
    useMasterDataListMock.mockReturnValue(list);
    useCustomerLevelsMock.mockReturnValue({
      levels: [
        { id: 'lvl-1', level_name: 'Retail' },
        { id: 'lvl-2', level_name: 'Grosir' },
      ],
    });

    render(<CustomerList />);

    expect(useMasterDataManagementMock).toHaveBeenCalledWith(
      'customers',
      'Pelanggan',
      expect.objectContaining({
        searchInputRef: expect.any(Object),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-add-modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'row-click' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-page-size' }));

    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(true);
    expect(management.handleEdit).toHaveBeenCalledWith({
      id: 'row-1',
      name: 'Clicked Row',
    });
    expect(list.setCurrentPageSize).toHaveBeenCalledWith(100);

    const addModal = getModalProps('Tambah Pelanggan Baru');
    const editModal = getModalProps('Edit Pelanggan');

    expect(addModal.data).toEqual({ customer_level_id: 'lvl-1' });
    expect(addModal.initialNameFromSearch).toBe('debounced keyword');

    addModal.onClose();
    editModal.onClose();

    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(management.setIsEditModalOpen).toHaveBeenCalledWith(false);

    await addModal.onSave({
      name: 'Customer Baru',
      phone: 81234,
      email: 'baru@example.com',
      address: 'Jl. Kenanga',
    });

    await editModal.onSave({
      name: 'Customer Edit',
      customer_level_id: 'lvl-2',
      phone: null,
      email: null,
      address: null,
    });

    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(1, {
      data: {
        name: 'Customer Baru',
        customer_level_id: 'lvl-1',
        phone: '81234',
        email: 'baru@example.com',
        address: 'Jl. Kenanga',
      },
    });
    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(2, {
      id: 'cust-9',
      data: {
        name: 'Customer Edit',
        customer_level_id: 'lvl-2',
        phone: null,
        email: null,
        address: null,
      },
    });

    editModal.onDeleteRequest();
    const deleteDialogArgs = management.openConfirmDialog.mock.calls[0][0];
    expect(deleteDialogArgs.message).toContain('pelanggan "Pelanggan Lama"');
    await deleteDialogArgs.onConfirm();
    expect(management.handleDelete).toHaveBeenCalledWith('cust-9');

    const columnDefs = pagePropsStore.current?.gridProps.columnDefs as Array<{
      valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
    }>;
    expect(
      columnDefs[1].valueGetter?.({ data: { customer_level_id: 'lvl-2' } })
    ).toBe('Grosir');
    expect(
      columnDefs[1].valueGetter?.({ data: { customer_level_id: 'missing' } })
    ).toBe('-');
    expect(columnDefs[2].valueGetter?.({ data: { phone: null } })).toBe('-');
    expect(columnDefs[3].valueGetter?.({ data: { email: '' } })).toBe('-');
    expect(columnDefs[4].valueGetter?.({ data: { address: undefined } })).toBe(
      '-'
    );
  });

  it('covers doctor list gender/experience mapping and edit delete flow', async () => {
    const management = createManagementState({
      editingItem: { id: 'doc-7', name: 'Dr. Tono' },
    });
    const list = createListState();

    useMasterDataManagementMock.mockReturnValue(management);
    useMasterDataListMock.mockReturnValue(list);
    useCustomerLevelsMock.mockReturnValue({ levels: [] });

    render(<DoctorListNew />);

    expect(useMasterDataManagementMock).toHaveBeenCalledWith(
      'doctors',
      'Dokter',
      expect.objectContaining({
        searchInputRef: expect.any(Object),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-add-modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'row-click' }));

    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(true);
    expect(management.handleEdit).toHaveBeenCalledWith({
      id: 'row-1',
      name: 'Clicked Row',
    });

    const addModal = getModalProps('Tambah Dokter Baru');
    const editModal = getModalProps('Edit Dokter');

    addModal.onClose();
    editModal.onClose();
    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(management.setIsEditModalOpen).toHaveBeenCalledWith(false);

    await addModal.onSave({
      name: 'Dr. Baru',
      specialization: 'Umum',
    });
    await editModal.onSave({
      name: 'Dr. Edit',
      specialization: 'Jantung',
    });

    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(1, {
      name: 'Dr. Baru',
      description: 'Umum',
      id: undefined,
    });
    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(2, {
      name: 'Dr. Edit',
      description: 'Jantung',
      id: 'doc-7',
    });

    editModal.onDeleteRequest();
    const deleteDialogArgs = management.openConfirmDialog.mock.calls[0][0];
    expect(deleteDialogArgs.message).toContain('dokter "Dr. Tono"');
    await deleteDialogArgs.onConfirm();
    expect(management.handleDelete).toHaveBeenCalledWith('doc-7');

    const columnDefs = pagePropsStore.current?.gridProps.columnDefs as Array<{
      valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
    }>;
    expect(columnDefs[1].valueGetter?.({ data: { gender: 'L' } })).toBe(
      'Laki-laki'
    );
    expect(columnDefs[1].valueGetter?.({ data: { gender: 'P' } })).toBe(
      'Perempuan'
    );
    expect(columnDefs[1].valueGetter?.({ data: { gender: 'X' } })).toBe('X');
    expect(
      columnDefs[2].valueGetter?.({ data: { specialization: 'Bedah' } })
    ).toBe('Bedah');
    expect(
      columnDefs[2].valueGetter?.({ data: { specialization: null } })
    ).toBe('-');
    expect(
      columnDefs[3].valueGetter?.({ data: { license_number: 'LIC-9' } })
    ).toBe('LIC-9');
    expect(columnDefs[3].valueGetter?.({ data: { license_number: '' } })).toBe(
      '-'
    );
    expect(columnDefs[4].valueGetter?.({ data: { experience_years: 3 } })).toBe(
      '3 tahun'
    );
    expect(columnDefs[4].valueGetter?.({ data: { experience_years: 0 } })).toBe(
      '-'
    );
    expect(columnDefs[5].valueGetter?.({ data: { phone: '0812' } })).toBe(
      '0812'
    );
    expect(columnDefs[5].valueGetter?.({ data: { phone: null } })).toBe('-');
    expect(
      columnDefs[6].valueGetter?.({ data: { email: 'doc@example.com' } })
    ).toBe('doc@example.com');
    expect(columnDefs[6].valueGetter?.({ data: { email: undefined } })).toBe(
      '-'
    );
  });

  it('covers patient list birth date formatter and delete dialog flow', async () => {
    const management = createManagementState({
      editingItem: { id: 'pat-3', name: 'Sari' },
    });
    const list = createListState();

    useMasterDataManagementMock.mockReturnValue(management);
    useMasterDataListMock.mockReturnValue(list);
    useCustomerLevelsMock.mockReturnValue({ levels: [] });

    render(<PatientListNew />);

    expect(useMasterDataManagementMock).toHaveBeenCalledWith(
      'patients',
      'Pasien',
      expect.objectContaining({
        searchInputRef: expect.any(Object),
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'open-add-modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'row-click' }));
    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(true);
    expect(management.handleEdit).toHaveBeenCalledWith({
      id: 'row-1',
      name: 'Clicked Row',
    });

    const addModal = getModalProps('Tambah Pasien Baru');
    const editModal = getModalProps('Edit Pasien');

    addModal.onClose();
    editModal.onClose();
    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(management.setIsEditModalOpen).toHaveBeenCalledWith(false);

    await addModal.onSave({
      name: 'Pasien Baru',
      address: 'Jl. Sehat',
    });
    await editModal.onSave({
      name: 'Pasien Edit',
      address: 'Jl. Baru',
    });

    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(1, {
      name: 'Pasien Baru',
      description: 'Jl. Sehat',
      id: undefined,
    });
    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(2, {
      name: 'Pasien Edit',
      description: 'Jl. Baru',
      id: 'pat-3',
    });

    editModal.onDeleteRequest();
    const deleteDialogArgs = management.openConfirmDialog.mock.calls[0][0];
    expect(deleteDialogArgs.message).toContain('pasien "Sari"');
    await deleteDialogArgs.onConfirm();
    expect(management.handleDelete).toHaveBeenCalledWith('pat-3');

    const columnDefs = pagePropsStore.current?.gridProps.columnDefs as Array<{
      valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
    }>;
    expect(
      columnDefs[2].valueGetter?.({
        data: { birth_date: '2026-01-05T00:00:00.000Z' },
      })
    ).toBe(new Date('2026-01-05T00:00:00.000Z').toLocaleDateString('id-ID'));
    expect(columnDefs[2].valueGetter?.({ data: { birth_date: null } })).toBe(
      '-'
    );
    expect(columnDefs[1].valueGetter?.({ data: { gender: 'L' } })).toBe('L');
    expect(columnDefs[1].valueGetter?.({ data: { gender: null } })).toBe('-');
    expect(
      columnDefs[3].valueGetter?.({ data: { address: 'Jl. Utama' } })
    ).toBe('Jl. Utama');
    expect(columnDefs[3].valueGetter?.({ data: { address: '' } })).toBe('-');
    expect(columnDefs[4].valueGetter?.({ data: { phone: '0813' } })).toBe(
      '0813'
    );
    expect(columnDefs[4].valueGetter?.({ data: { phone: undefined } })).toBe(
      '-'
    );
    expect(
      columnDefs[5].valueGetter?.({ data: { email: 'patient@mail.com' } })
    ).toBe('patient@mail.com');
    expect(columnDefs[5].valueGetter?.({ data: { email: null } })).toBe('-');
  });

  it('covers supplier list modal mappings and contact column fallback', async () => {
    const management = createManagementState({
      editingItem: { id: 'sup-4', name: 'PT Sumber Makmur' },
    });
    const list = createListState();

    useMasterDataManagementMock.mockReturnValue(management);
    useMasterDataListMock.mockReturnValue(list);
    useCustomerLevelsMock.mockReturnValue({ levels: [] });

    render(<SupplierListNew />);

    expect(useMasterDataManagementMock).toHaveBeenCalledWith(
      'suppliers',
      'Supplier',
      expect.objectContaining({
        searchInputRef: expect.any(Object),
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'open-add-modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'row-click' }));
    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(true);
    expect(management.handleEdit).toHaveBeenCalledWith({
      id: 'row-1',
      name: 'Clicked Row',
    });

    const addModal = getModalProps('Tambah Supplier Baru');
    const editModal = getModalProps('Edit Supplier');

    addModal.onClose();
    editModal.onClose();
    expect(management.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(management.setIsEditModalOpen).toHaveBeenCalledWith(false);

    await addModal.onSave({
      name: 'Supplier Baru',
      address: 'Jl. Pusat',
    });
    await editModal.onSave({
      name: 'Supplier Edit',
      address: 'Jl. Cabang',
    });

    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(1, {
      name: 'Supplier Baru',
      description: 'Jl. Pusat',
      id: undefined,
    });
    expect(management.handleModalSubmit).toHaveBeenNthCalledWith(2, {
      name: 'Supplier Edit',
      description: 'Jl. Cabang',
      id: 'sup-4',
    });

    editModal.onDeleteRequest();
    const deleteDialogArgs = management.openConfirmDialog.mock.calls[0][0];
    expect(deleteDialogArgs.message).toContain('supplier "PT Sumber Makmur"');
    await deleteDialogArgs.onConfirm();
    expect(management.handleDelete).toHaveBeenCalledWith('sup-4');

    expect(pagePropsStore.current?.gridProps.autoSizeColumns).toEqual([
      'name',
      'phone',
      'email',
      'contact_person',
    ]);

    const columnDefs = pagePropsStore.current?.gridProps.columnDefs as Array<{
      valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
    }>;
    expect(
      columnDefs[1].valueGetter?.({ data: { address: 'Jl. Grosir' } })
    ).toBe('Jl. Grosir');
    expect(columnDefs[1].valueGetter?.({ data: { address: null } })).toBe('-');
    expect(columnDefs[2].valueGetter?.({ data: { phone: '022123' } })).toBe(
      '022123'
    );
    expect(columnDefs[2].valueGetter?.({ data: { phone: undefined } })).toBe(
      '-'
    );
    expect(
      columnDefs[3].valueGetter?.({ data: { email: 'sup@mail.com' } })
    ).toBe('sup@mail.com');
    expect(columnDefs[3].valueGetter?.({ data: { email: '' } })).toBe('-');
    expect(
      columnDefs[4].valueGetter?.({ data: { contact_person: null } })
    ).toBe('-');
  });
});
