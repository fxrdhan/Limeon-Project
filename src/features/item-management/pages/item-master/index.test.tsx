import { act, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemMasterPage from './index';

const locationMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const createTextColumnMock = vi.hoisted(() => vi.fn());
const useItemsSyncMock = vi.hoisted(() => vi.fn());
const useItemGridColumnsMock = vi.hoisted(() => vi.fn());
const useItemsManagementMock = vi.hoisted(() => vi.fn());
const useMasterDataManagementMock = vi.hoisted(() => vi.fn());
const useUnifiedSearchMock = vi.hoisted(() => vi.fn());
const restoreConfirmedPatternMock = vi.hoisted(() => vi.fn());
const buildAdvancedFilterModelMock = vi.hoisted(() => vi.fn());
const useConfirmDialogMock = vi.hoisted(() => vi.fn());
const getOrderedSearchColumnsByEntityMock = vi.hoisted(() => vi.fn());
const getSearchColumnsByEntityMock = vi.hoisted(() => vi.fn());
const deriveSearchPatternFromGridStateMock = vi.hoisted(() => vi.fn());
const useSupplierTabMock = vi.hoisted(() => vi.fn());
const useCustomerLevelsMock = vi.hoisted(() => vi.fn());
const useEntityMock = vi.hoisted(() => vi.fn());
const useEntityManagerMock = vi.hoisted(() => vi.fn());
const fuzzyMatchMock = vi.hoisted(() => vi.fn());

const captured = vi.hoisted(() => ({
  slidingSelectorProps: null as Record<string, unknown> | null,
  searchToolbarProps: null as Record<string, unknown> | null,
  entityGridProps: null as Record<string, unknown> | null,
  identityModalProps: [] as Array<Record<string, unknown>>,
  supplierModalsProps: null as Record<string, unknown> | null,
  itemModalProps: null as Record<string, unknown> | null,
  entityModalProps: null as Record<string, unknown> | null,
}));

const unifiedSearchCalls = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);
const unifiedSearchReturns = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return {
    ...actual,
    useLocation: locationMock,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/components/ag-grid', () => ({
  createTextColumn: createTextColumnMock,
}));

vi.mock('@/components/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

vi.mock('@/components/page-title', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="page-title">{title}</div>
  ),
}));

vi.mock('@/components/IdentityDataModal', () => ({
  default: (props: Record<string, unknown>) => {
    captured.identityModalProps.push(props);
    return <div data-testid={`identity-modal-${String(props.title)}`} />;
  },
}));

vi.mock('@/components/shared/sliding-selector', () => ({
  SlidingSelector: (props: Record<string, unknown>) => {
    captured.slidingSelectorProps = props;
    return <div data-testid="sliding-selector" />;
  },
}));

vi.mock('@/features/item-management/presentation/organisms', () => ({
  EntityGrid: (props: Record<string, unknown>) => {
    captured.entityGridProps = props;
    return <div data-testid="entity-grid" />;
  },
}));

vi.mock('@/features/item-management/presentation/templates/entity', () => ({
  EntityModal: (props: Record<string, unknown>) => {
    captured.entityModalProps = props;
    return <div data-testid="entity-modal" />;
  },
}));

vi.mock(
  '@/features/item-management/presentation/templates/item/ItemModal',
  () => ({
    default: (props: Record<string, unknown>) => {
      captured.itemModalProps = props;
      return <div data-testid="item-modal" />;
    },
  })
);

vi.mock('@/components/SearchToolbar', () => ({
  default: (props: Record<string, unknown>) => {
    captured.searchToolbarProps = props;
    return <div data-testid="search-toolbar" />;
  },
}));

vi.mock('./components/SupplierModals', () => ({
  default: (props: Record<string, unknown>) => {
    captured.supplierModalsProps = props;
    return <div data-testid="supplier-modals" />;
  },
}));

vi.mock('@/hooks/realtime/useItemsSync', () => ({
  useItemsSync: useItemsSyncMock,
}));

vi.mock('@/features/item-management/application/hooks/ui', () => ({
  useItemGridColumns: useItemGridColumnsMock,
}));

vi.mock('@/hooks/data/useItemsManagement', () => ({
  useItemsManagement: useItemsManagementMock,
}));

vi.mock('@/hooks/data/useMasterDataManagement', () => ({
  useMasterDataManagement: useMasterDataManagementMock,
}));

vi.mock('@/hooks/data/useUnifiedSearch', () => ({
  useUnifiedSearch: useUnifiedSearchMock,
}));

vi.mock('@/components/search-bar/utils/patternRestoration', () => ({
  restoreConfirmedPattern: restoreConfirmedPatternMock,
}));

vi.mock('@/utils/advancedFilterBuilder', () => ({
  buildAdvancedFilterModel: buildAdvancedFilterModelMock,
}));

vi.mock('@/components/dialog-box', () => ({
  useConfirmDialog: useConfirmDialogMock,
}));

vi.mock('@/utils/searchColumns', () => ({
  getOrderedSearchColumnsByEntity: getOrderedSearchColumnsByEntityMock,
  getSearchColumnsByEntity: getSearchColumnsByEntityMock,
}));

vi.mock('./utils/advancedFilterToSearchPattern', () => ({
  deriveSearchPatternFromGridState: deriveSearchPatternFromGridStateMock,
}));

vi.mock('./hooks/useSupplierTab', () => ({
  useSupplierTab: useSupplierTabMock,
}));

vi.mock(
  '@/features/item-management/application/hooks/data/useCustomerLevels',
  () => ({
    useCustomerLevels: useCustomerLevelsMock,
  })
);

vi.mock('@/features/item-management/application/hooks/collections', () => ({
  useEntity: useEntityMock,
  useEntityManager: useEntityManagerMock,
}));

vi.mock('@/utils/search', () => ({
  fuzzyMatch: fuzzyMatchMock,
}));

const createMasterDataHookState = (label: string) => ({
  isAddModalOpen: false,
  setIsAddModalOpen: vi.fn(),
  isEditModalOpen: false,
  setIsEditModalOpen: vi.fn(),
  editingItem: { id: `${label}-1`, name: `${label} name` },
  data: [],
  isLoading: false,
  isError: false,
  queryError: null,
  itemsPerPage: 20,
  handleEdit: vi.fn(),
  handleModalSubmit: vi.fn(),
  handleDelete: vi.fn(),
  debouncedSearch: `${label}-search`,
  handleKeyDown: vi.fn(),
  setSearch: vi.fn(),
});

describe('ItemMaster page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();

    captured.slidingSelectorProps = null;
    captured.searchToolbarProps = null;
    captured.entityGridProps = null;
    captured.identityModalProps = [];
    captured.supplierModalsProps = null;
    captured.itemModalProps = null;
    captured.entityModalProps = null;
    unifiedSearchCalls.length = 0;
    unifiedSearchReturns.length = 0;

    locationMock.mockReset();
    navigateMock.mockReset();
    createTextColumnMock.mockReset();
    useItemsSyncMock.mockReset();
    useItemGridColumnsMock.mockReset();
    useItemsManagementMock.mockReset();
    useMasterDataManagementMock.mockReset();
    useUnifiedSearchMock.mockReset();
    restoreConfirmedPatternMock.mockReset();
    buildAdvancedFilterModelMock.mockReset();
    useConfirmDialogMock.mockReset();
    getOrderedSearchColumnsByEntityMock.mockReset();
    getSearchColumnsByEntityMock.mockReset();
    deriveSearchPatternFromGridStateMock.mockReset();
    useSupplierTabMock.mockReset();
    useCustomerLevelsMock.mockReset();
    useEntityMock.mockReset();
    useEntityManagerMock.mockReset();
    fuzzyMatchMock.mockReset();

    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });
    createTextColumnMock.mockImplementation(config => config);
    useItemsSyncMock.mockReturnValue(undefined);
    useItemGridColumnsMock.mockReturnValue({ columnDefs: [{ field: 'name' }] });
    useItemsManagementMock.mockReturnValue({
      data: [{ id: 'item-1', name: 'Amoxicillin' }],
      allData: [{ id: 'item-1', name: 'Amoxicillin' }],
      setSearch: vi.fn(),
      itemsPerPage: 25,
      isLoading: false,
      isError: false,
      queryError: null,
    });

    const customerState = createMasterDataHookState('customer');
    const patientState = createMasterDataHookState('patient');
    const doctorState = createMasterDataHookState('doctor');
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') return customerState;
      if (type === 'patients') return patientState;
      if (type === 'doctors') return doctorState;
      return createMasterDataHookState(type);
    });

    useUnifiedSearchMock.mockImplementation(
      (options: Record<string, unknown>) => {
        unifiedSearchCalls.push(options);
        const ret = {
          search: '',
          setSearch: vi.fn(),
          onGridReady: vi.fn(),
          isExternalFilterPresent: vi.fn(() => false),
          doesExternalFilterPass: vi.fn(() => true),
          searchBarProps: { test: 'ok' },
          clearSearchUIOnly: vi.fn(),
        };
        unifiedSearchReturns.push(ret);
        return ret;
      }
    );

    restoreConfirmedPatternMock.mockReturnValue('#name #contains aspirin##');
    buildAdvancedFilterModelMock.mockImplementation(filter => ({
      filterType: 'mock',
      filter,
    }));
    useConfirmDialogMock.mockReturnValue({ openConfirmDialog: vi.fn() });
    getOrderedSearchColumnsByEntityMock.mockReturnValue([
      {
        field: 'items.name',
        headerName: 'Nama',
        searchable: true,
        type: 'text',
      },
    ]);
    getSearchColumnsByEntityMock.mockReturnValue([
      { field: 'name', headerName: 'Nama', searchable: true, type: 'text' },
    ]);
    deriveSearchPatternFromGridStateMock.mockReturnValue(
      '#name #contains memo##'
    );
    useSupplierTabMock.mockReturnValue({
      suppliersQuery: { isLoading: false, isError: false, error: null },
      supplierMutations: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      supplierFields: [{ key: 'name', label: 'Nama Supplier' }],
      supplierColumnDefs: [{ field: 'suppliers.name' }],
      suppliersData: [{ id: 'sup-1', name: 'Supplier A' }],
      isAddSupplierModalOpen: false,
      isEditSupplierModalOpen: false,
      editingSupplier: null,
      openAddSupplierModal: vi.fn(),
      closeAddSupplierModal: vi.fn(),
      openEditSupplierModal: vi.fn(),
      closeEditSupplierModal: vi.fn(),
    });
    useCustomerLevelsMock.mockReturnValue({
      levels: [{ id: 'lvl-1', level_name: 'Gold' }],
    });
    useEntityMock.mockReturnValue({
      data: [{ id: 'cat-1', name: 'Kategori A', code: 'CAT-1' }],
      isLoading: false,
      isError: false,
      error: null,
    });
    useEntityManagerMock.mockReturnValue({
      search: '',
      itemsPerPage: 10,
      entityConfigs: {
        categories: {
          entityName: 'Kategori',
          nameColumnHeader: 'Nama',
          searchPlaceholder: 'Cari kategori',
          hasNciCode: false,
          hasAddress: false,
          noDataMessage: 'Tidak ada',
          searchNoDataMessage: 'Tidak ketemu',
        },
      },
      handleSearch: vi.fn(),
      openEditModal: vi.fn(),
      openAddModal: vi.fn(),
      closeEditModal: vi.fn(),
      closeAddModal: vi.fn(),
      handleSubmit: vi.fn(),
      handleDelete: vi.fn(),
      isAddModalOpen: false,
      isEditModalOpen: false,
      editingEntity: null,
    });
    fuzzyMatchMock.mockImplementation((source: string | null, query: string) =>
      String(source || '')
        .toLowerCase()
        .includes(query)
    );
  });

  it('redirects root item-master path to last visited tab from session', () => {
    locationMock.mockReturnValue({ pathname: '/master-data/item-master' });
    sessionStorage.setItem('item_master_last_tab', 'types');

    render(<ItemMasterPage />);

    expect(navigateMock).toHaveBeenCalledWith(
      '/master-data/item-master/types',
      {
        replace: true,
      }
    );
  });

  it('handles immediate and debounced tab switching while clearing active search UI', () => {
    render(<ItemMasterPage />);

    expect(captured.slidingSelectorProps).toBeTruthy();

    const onSelectionChange = captured.slidingSelectorProps
      ?.onSelectionChange as ((key: string, value: string) => void) | undefined;
    expect(onSelectionChange).toBeTypeOf('function');

    act(() => {
      onSelectionChange?.('categories', 'categories');
    });
    expect(navigateMock).toHaveBeenCalledWith(
      '/master-data/item-master/categories'
    );
    expect(unifiedSearchReturns[0].clearSearchUIOnly).toHaveBeenCalled();

    act(() => {
      onSelectionChange?.('types', 'types');
      onSelectionChange?.('packages', 'packages');
    });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(navigateMock).toHaveBeenCalledWith(
      '/master-data/item-master/packages'
    );
  });

  it('handles supplier grid filtering and row click edit flow', () => {
    const openEditSupplierModal = vi.fn();
    useSupplierTabMock.mockReturnValue({
      suppliersQuery: { isLoading: false, isError: false, error: null },
      supplierMutations: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      supplierFields: [{ key: 'name', label: 'Nama Supplier' }],
      supplierColumnDefs: [{ field: 'suppliers.name' }],
      suppliersData: [{ id: 'sup-1', name: 'Supplier A' }],
      isAddSupplierModalOpen: false,
      isEditSupplierModalOpen: false,
      editingSupplier: null,
      openAddSupplierModal: vi.fn(),
      closeAddSupplierModal: vi.fn(),
      openEditSupplierModal,
      closeEditSupplierModal: vi.fn(),
    });
    locationMock.mockReturnValue({ pathname: '/master-data/suppliers' });

    render(<ItemMasterPage />);

    const gridApi = {
      isDestroyed: vi.fn(() => false),
      setAdvancedFilterModel: vi.fn(),
      getAllDisplayedColumns: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.(gridApi);
    });

    const latestSupplierSearchCall = () =>
      [...unifiedSearchCalls]
        .reverse()
        .find(call => call.searchMode === 'client');

    act(() => {
      vi.runAllTimers();
    });

    const supplierSearchCall = latestSupplierSearchCall();
    expect(supplierSearchCall).toBeTruthy();

    act(() => {
      (
        supplierSearchCall?.onFilterSearch as
          | ((value: Record<string, unknown> | null) => void)
          | undefined
      )?.({
        field: 'suppliers.name',
        operator: 'contains',
        value: 'supplier',
        isConfirmed: true,
        isExplicitOperator: true,
      });
    });

    expect(buildAdvancedFilterModelMock).toHaveBeenCalled();
    expect(gridApi.setAdvancedFilterModel).toHaveBeenCalled();
    expect(sessionStorage.getItem('item_master_search_suppliers')).toBe(
      '#name #contains aspirin##'
    );

    act(() => {
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({
        id: 'sup-1',
        name: 'Supplier A',
      });
    });
    expect(openEditSupplierModal).toHaveBeenCalled();
  });

  it('maps customer add/edit modal submit and delete confirmation handlers', async () => {
    const customerSubmitSpy = vi.fn();
    const customerDeleteSpy = vi.fn();
    const openConfirmDialog = vi.fn();
    useConfirmDialogMock.mockReturnValue({ openConfirmDialog });
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') {
        return {
          ...createMasterDataHookState('customer'),
          isAddModalOpen: true,
          isEditModalOpen: true,
          editingItem: { id: 'cust-1', name: 'Pelanggan A' },
          handleModalSubmit: customerSubmitSpy,
          handleDelete: customerDeleteSpy,
        };
      }
      return createMasterDataHookState(type);
    });
    locationMock.mockReturnValue({ pathname: '/master-data/customers' });

    render(<ItemMasterPage />);

    const addModal = captured.identityModalProps.find(
      props => props.title === 'Tambah Pelanggan Baru'
    );
    const editModal = captured.identityModalProps.find(
      props => props.title === 'Edit Pelanggan'
    );

    expect(addModal).toBeTruthy();
    expect(editModal).toBeTruthy();

    await act(async () => {
      await (
        addModal?.onSave as
          | ((data: Record<string, unknown>) => Promise<void>)
          | undefined
      )?.({
        name: 'Budi',
        customer_level_id: 'lvl-1',
        phone: '0812',
        email: 'budi@test.dev',
        address: 'Jl. Melati',
      });
    });

    expect(customerSubmitSpy).toHaveBeenCalledWith({
      data: {
        name: 'Budi',
        customer_level_id: 'lvl-1',
        phone: '0812',
        email: 'budi@test.dev',
        address: 'Jl. Melati',
      },
    });

    act(() => {
      (editModal?.onDeleteRequest as (() => void) | undefined)?.();
    });
    expect(openConfirmDialog).toHaveBeenCalled();

    const onConfirm = (openConfirmDialog as ReturnType<typeof vi.fn>).mock
      .calls[0][0].onConfirm as () => Promise<void>;
    await act(async () => {
      await onConfirm();
    });
    expect(customerDeleteSpy).toHaveBeenCalledWith('cust-1');
  });

  it('handles items-tab filtering, grid events, and item modal open flows', () => {
    render(<ItemMasterPage />);

    const listeners: Record<string, Array<() => void>> = {};
    const gridApi = {
      isDestroyed: vi.fn(() => false),
      setAdvancedFilterModel: vi.fn(),
      getAllDisplayedColumns: vi.fn(() => [
        { getColId: () => 'items.name' },
        { getColId: () => 'items.code' },
      ]),
      addEventListener: vi.fn((event: string, cb: () => void) => {
        listeners[event] = [...(listeners[event] || []), cb];
      }),
      removeEventListener: vi.fn(),
    };

    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.(gridApi);
    });

    const itemSearchCall = [...unifiedSearchCalls]
      .reverse()
      .find(
        call =>
          (call.columns as Array<{ field?: string }> | undefined)?.[0]
            ?.field === 'items.name'
      );
    expect(itemSearchCall).toBeTruthy();

    const onFilterSearch = itemSearchCall?.onFilterSearch as
      | ((value: Record<string, unknown> | null) => void)
      | undefined;
    const confirmedFilter = {
      field: 'items.name',
      operator: 'contains',
      value: 'amo',
      isConfirmed: true,
      isExplicitOperator: true,
    };

    act(() => {
      onFilterSearch?.(confirmedFilter);
    });
    expect(buildAdvancedFilterModelMock).toHaveBeenCalledWith(confirmedFilter);
    expect(gridApi.setAdvancedFilterModel).toHaveBeenCalled();
    expect(sessionStorage.getItem('item_master_search_items')).toBe(
      '#name #contains aspirin##'
    );

    const setAdvancedCalls = gridApi.setAdvancedFilterModel.mock.calls.length;
    act(() => {
      (
        captured.slidingSelectorProps?.onSelectionChange as
          | ((key: string, value: string) => void)
          | undefined
      )?.('categories', 'categories');
      onFilterSearch?.(null);
    });
    expect(gridApi.setAdvancedFilterModel.mock.calls.length).toBe(
      setAdvancedCalls
    );

    act(() => {
      listeners.columnVisible?.forEach(cb => cb());
      listeners.columnMoved?.forEach(cb => cb());
      listeners.firstDataRendered?.forEach(cb => cb());
      listeners.gridColumnsChanged?.forEach(cb => cb());
    });
    expect(gridApi.getAllDisplayedColumns).toHaveBeenCalled();

    act(() => {
      (captured.searchToolbarProps?.onAdd as (() => void) | undefined)?.();
    });
    expect(captured.itemModalProps?.isOpen).toBe(true);

    act(() => {
      (
        captured.searchToolbarProps?.onItemSelect as
          | ((item: { id: string }) => void)
          | undefined
      )?.({ id: 'item-1' });
    });
    expect(captured.itemModalProps?.itemId).toBe('item-1');
  });

  it('maps patient add/edit modal submit and delete confirmation handlers', async () => {
    const patientSubmitSpy = vi.fn();
    const patientDeleteSpy = vi.fn();
    const openConfirmDialog = vi.fn();
    useConfirmDialogMock.mockReturnValue({ openConfirmDialog });
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'patients') {
        return {
          ...createMasterDataHookState('patient'),
          isAddModalOpen: true,
          isEditModalOpen: true,
          editingItem: { id: 'pat-1', name: 'Pasien A' },
          handleModalSubmit: patientSubmitSpy,
          handleDelete: patientDeleteSpy,
        };
      }
      return createMasterDataHookState(type);
    });
    locationMock.mockReturnValue({ pathname: '/master-data/patients' });

    render(<ItemMasterPage />);

    const addModal = captured.identityModalProps.find(
      props => props.title === 'Tambah Pasien Baru'
    );
    const editModal = captured.identityModalProps.find(
      props => props.title === 'Edit Pasien'
    );
    expect(addModal).toBeTruthy();
    expect(editModal).toBeTruthy();

    await act(async () => {
      await (
        addModal?.onSave as
          | ((data: Record<string, unknown>) => Promise<void>)
          | undefined
      )?.({
        name: 'Sinta',
        address: 'Bandung',
      });
    });
    expect(patientSubmitSpy).toHaveBeenCalledWith({
      name: 'Sinta',
      description: 'Bandung',
      id: undefined,
    });

    await act(async () => {
      await (
        editModal?.onSave as
          | ((data: Record<string, unknown>) => Promise<void>)
          | undefined
      )?.({
        name: 'Sinta Edit',
        address: 'Jakarta',
      });
    });
    expect(patientSubmitSpy).toHaveBeenCalledWith({
      name: 'Sinta Edit',
      description: 'Jakarta',
      id: 'pat-1',
    });

    act(() => {
      (editModal?.onDeleteRequest as (() => void) | undefined)?.();
    });
    const onConfirm = (openConfirmDialog as ReturnType<typeof vi.fn>).mock
      .calls[0][0].onConfirm as () => Promise<void>;
    await act(async () => {
      await onConfirm();
    });
    expect(patientDeleteSpy).toHaveBeenCalledWith('pat-1');
  });

  it('maps doctor add/edit modal submit and delete confirmation handlers', async () => {
    const doctorSubmitSpy = vi.fn();
    const doctorDeleteSpy = vi.fn();
    const openConfirmDialog = vi.fn();
    useConfirmDialogMock.mockReturnValue({ openConfirmDialog });
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'doctors') {
        return {
          ...createMasterDataHookState('doctor'),
          isAddModalOpen: true,
          isEditModalOpen: true,
          editingItem: { id: 'doc-1', name: 'Dokter A' },
          handleModalSubmit: doctorSubmitSpy,
          handleDelete: doctorDeleteSpy,
        };
      }
      return createMasterDataHookState(type);
    });
    locationMock.mockReturnValue({ pathname: '/master-data/doctors' });

    render(<ItemMasterPage />);

    const addModal = captured.identityModalProps.find(
      props => props.title === 'Tambah Dokter Baru'
    );
    const editModal = captured.identityModalProps.find(
      props => props.title === 'Edit Dokter'
    );
    expect(addModal).toBeTruthy();
    expect(editModal).toBeTruthy();

    await act(async () => {
      await (
        addModal?.onSave as
          | ((data: Record<string, unknown>) => Promise<void>)
          | undefined
      )?.({
        name: 'Dr A',
        specialization: 'Anak',
      });
    });
    expect(doctorSubmitSpy).toHaveBeenCalledWith({
      name: 'Dr A',
      description: 'Anak',
      id: undefined,
    });

    await act(async () => {
      await (
        editModal?.onSave as
          | ((data: Record<string, unknown>) => Promise<void>)
          | undefined
      )?.({
        name: 'Dr A Edit',
        specialization: 'Bedah',
      });
    });
    expect(doctorSubmitSpy).toHaveBeenCalledWith({
      name: 'Dr A Edit',
      description: 'Bedah',
      id: 'doc-1',
    });

    act(() => {
      (editModal?.onDeleteRequest as (() => void) | undefined)?.();
    });
    const onConfirm = (openConfirmDialog as ReturnType<typeof vi.fn>).mock
      .calls[0][0].onConfirm as () => Promise<void>;
    await act(async () => {
      await onConfirm();
    });
    expect(doctorDeleteSpy).toHaveBeenCalledWith('doc-1');
  });
});
