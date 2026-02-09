import { act, fireEvent, render, screen } from '@testing-library/react';
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
    const searchInputRef = props.searchInputRef as
      | React.RefObject<HTMLInputElement>
      | undefined;
    return (
      <div data-testid="search-toolbar">
        <input
          data-testid="toolbar-search-input"
          ref={node => {
            if (!searchInputRef) return;
            (
              searchInputRef as React.MutableRefObject<HTMLInputElement | null>
            ).current = node;
          }}
        />
      </div>
    );
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

    act(() => {
      onSelectionChange?.('types', 'types'); // queue debounced tab
      vi.setSystemTime(new Date(Date.now() + 300)); // exit cooldown without running queued timeout
      onSelectionChange?.('units', 'units'); // immediate navigation should clear queued debounce timer
    });
    expect(navigateMock).toHaveBeenLastCalledWith(
      '/master-data/item-master/units'
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(navigateMock).toHaveBeenCalledTimes(3);
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

    await act(async () => {
      await (
        editModal?.onSave as
          | ((data: Record<string, unknown>) => Promise<void>)
          | undefined
      )?.({
        name: 'Budi Edit',
        customer_level_id: 'lvl-1',
        phone: '0822',
        email: 'budi-edit@test.dev',
        address: 'Jl. Mawar',
      });
    });

    expect(customerSubmitSpy).toHaveBeenCalledWith({
      id: 'cust-1',
      data: {
        name: 'Budi Edit',
        customer_level_id: 'lvl-1',
        phone: '0822',
        email: 'budi-edit@test.dev',
        address: 'Jl. Mawar',
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

  it('evaluates customer/patient/doctor column valueGetters fallback branches', () => {
    locationMock.mockReturnValue({ pathname: '/master-data/customers' });
    render(<ItemMasterPage />);
    const customerColumns = (captured.entityGridProps?.entityColumnDefs ||
      []) as Array<Record<string, unknown>>;
    const customerLevelGetter = customerColumns.find(
      col => col.field === 'customer_level_id'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const customerPhoneGetter = customerColumns.find(
      col => col.field === 'phone'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const customerEmailGetter = customerColumns.find(
      col => col.field === 'email'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const customerAddressGetter = customerColumns.find(
      col => col.field === 'address'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;

    expect(
      customerLevelGetter?.({ data: { customer_level_id: 'lvl-1' } })
    ).toBe('Gold');
    expect(
      customerLevelGetter?.({ data: { customer_level_id: 'missing' } })
    ).toBe('-');
    expect(customerPhoneGetter?.({ data: { phone: '' } })).toBe('-');
    expect(customerEmailGetter?.({ data: { email: '' } })).toBe('-');
    expect(customerAddressGetter?.({ data: { address: '' } })).toBe('-');

    locationMock.mockReturnValue({ pathname: '/master-data/patients' });
    render(<ItemMasterPage />);
    const patientColumns = (captured.entityGridProps?.entityColumnDefs ||
      []) as Array<Record<string, unknown>>;
    const birthDateGetter = patientColumns.find(
      col => col.field === 'birth_date'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const patientPhoneGetter = patientColumns.find(col => col.field === 'phone')
      ?.valueGetter as
      | ((params: Record<string, unknown>) => string)
      | undefined;
    const patientEmailGetter = patientColumns.find(col => col.field === 'email')
      ?.valueGetter as
      | ((params: Record<string, unknown>) => string)
      | undefined;
    const patientGenderGetter = patientColumns.find(
      col => col.field === 'gender'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const patientAddressGetter = patientColumns.find(
      col => col.field === 'address'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;

    const expectedDate = new Date('2020-01-01').toLocaleDateString('id-ID');
    expect(birthDateGetter?.({ data: { birth_date: '2020-01-01' } })).toBe(
      expectedDate
    );
    expect(birthDateGetter?.({ data: { birth_date: null } })).toBe('-');
    expect(patientGenderGetter?.({ data: { gender: '' } })).toBe('-');
    expect(patientAddressGetter?.({ data: { address: '' } })).toBe('-');
    expect(patientPhoneGetter?.({ data: { phone: '' } })).toBe('-');
    expect(patientEmailGetter?.({ data: { email: '' } })).toBe('-');

    locationMock.mockReturnValue({ pathname: '/master-data/doctors' });
    render(<ItemMasterPage />);
    const doctorColumns = (captured.entityGridProps?.entityColumnDefs ||
      []) as Array<Record<string, unknown>>;
    const genderGetter = doctorColumns.find(col => col.field === 'gender')
      ?.valueGetter as
      | ((params: Record<string, unknown>) => string)
      | undefined;
    const specializationGetter = doctorColumns.find(
      col => col.field === 'specialization'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const licenseGetter = doctorColumns.find(
      col => col.field === 'license_number'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const expGetter = doctorColumns.find(
      col => col.field === 'experience_years'
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const doctorPhoneGetter = doctorColumns.find(col => col.field === 'phone')
      ?.valueGetter as
      | ((params: Record<string, unknown>) => string)
      | undefined;
    const doctorEmailGetter = doctorColumns.find(col => col.field === 'email')
      ?.valueGetter as
      | ((params: Record<string, unknown>) => string)
      | undefined;

    expect(genderGetter?.({ data: { gender: 'L' } })).toBe('Laki-laki');
    expect(genderGetter?.({ data: { gender: 'P' } })).toBe('Perempuan');
    expect(genderGetter?.({ data: { gender: 'X' } })).toBe('X');
    expect(specializationGetter?.({ data: { specialization: '' } })).toBe('-');
    expect(licenseGetter?.({ data: { license_number: '' } })).toBe('-');
    expect(expGetter?.({ data: { experience_years: 7 } })).toBe('7 tahun');
    expect(expGetter?.({ data: { experience_years: 0 } })).toBe('-');
    expect(doctorPhoneGetter?.({ data: { phone: '' } })).toBe('-');
    expect(doctorEmailGetter?.({ data: { email: '' } })).toBe('-');
  });

  it('builds entity columnDefs with nci/address branches and handles item modal close timeout', () => {
    useEntityManagerMock.mockReturnValue({
      search: '',
      itemsPerPage: 10,
      entityConfigs: {
        categories: {
          entityName: 'Kategori',
          nameColumnHeader: 'Nama',
          searchPlaceholder: 'Cari kategori',
          hasNciCode: true,
          hasAddress: true,
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

    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/categories',
    });
    render(<ItemMasterPage />);

    const entityColumns = (captured.entityGridProps?.entityColumnDefs ||
      []) as Array<Record<string, unknown>>;
    const codeGetter = entityColumns.find(col =>
      String(col.field).includes('.code')
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const nameGetter = entityColumns.find(col =>
      String(col.field).includes('.name')
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const nciGetter = entityColumns.find(col =>
      String(col.field).includes('.nci_code')
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;
    const addressGetter = entityColumns.find(col =>
      String(col.field).includes('.address')
    )?.valueGetter as ((params: Record<string, unknown>) => string) | undefined;

    expect(codeGetter?.({ data: { code: '' } })).toBe('-');
    expect(nameGetter?.({ data: { name: '' } })).toBe('-');
    expect(nciGetter?.({ data: { nci_code: '' } })).toBe('-');
    expect(addressGetter?.({ data: { address: '' } })).toBe('-');

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
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/categories',
    });
    render(<ItemMasterPage />);
    const descGetter = (
      (captured.entityGridProps?.entityColumnDefs || []) as Array<
        Record<string, unknown>
      >
    ).find(col => String(col.field).includes('.description'))?.valueGetter as
      | ((params: Record<string, unknown>) => string)
      | undefined;
    expect(descGetter?.({ data: { description: '' } })).toBe('-');

    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });
    render(<ItemMasterPage />);
    act(() => {
      (captured.searchToolbarProps?.onAdd as (() => void) | undefined)?.();
    });
    expect(captured.itemModalProps?.isOpen).toBe(true);

    act(() => {
      (captured.itemModalProps?.onClose as (() => void) | undefined)?.();
      vi.advanceTimersByTime(100);
    });

    expect(captured.itemModalProps?.isOpen).toBe(false);
    expect(captured.itemModalProps?.itemId).toBeUndefined();
    expect(captured.itemModalProps?.initialItemData).toBeUndefined();
  });

  it('restores derived search pattern and keeps search input focused from keyboard/pointer flows', () => {
    locationMock.mockReturnValue({ pathname: '/master-data/customers' });
    sessionStorage.setItem(
      'grid_state_customers',
      JSON.stringify({ advancedFilterModel: { kind: 'mock' } })
    );

    render(<ItemMasterPage />);

    const customerCall = [...unifiedSearchCalls]
      .reverse()
      .find(
        call =>
          call.onSearch === useMasterDataManagementMock('customers').setSearch
      );
    expect(customerCall).toBeTruthy();
    expect(deriveSearchPatternFromGridStateMock).toHaveBeenCalled();

    const input = screen.getByTestId('toolbar-search-input');
    (document.body as HTMLElement).focus();

    fireEvent.keyDown(document.body, { key: 'a' });
    expect(input).toHaveFocus();

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    input.blur();
    fireEvent.keyDown(document.body, { key: 'b' });
    expect(input).not.toHaveFocus();
    dialog.remove();

    (document.body as HTMLElement).focus();
    fireEvent.pointerDown(document.body, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(input).toHaveFocus();
  });

  it('closes open auxiliary modals during tab switch and supports toolbar tab shortcuts', () => {
    const customerState = {
      ...createMasterDataHookState('customer'),
      isAddModalOpen: true,
      isEditModalOpen: true,
      setIsAddModalOpen: vi.fn(),
      setIsEditModalOpen: vi.fn(),
    };
    const patientState = {
      ...createMasterDataHookState('patient'),
      isAddModalOpen: true,
      isEditModalOpen: true,
      setIsAddModalOpen: vi.fn(),
      setIsEditModalOpen: vi.fn(),
    };
    const doctorState = {
      ...createMasterDataHookState('doctor'),
      isAddModalOpen: true,
      isEditModalOpen: true,
      setIsAddModalOpen: vi.fn(),
      setIsEditModalOpen: vi.fn(),
    };
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') return customerState;
      if (type === 'patients') return patientState;
      if (type === 'doctors') return doctorState;
      return createMasterDataHookState(type);
    });

    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });
    render(<ItemMasterPage />);

    act(() => {
      (captured.searchToolbarProps?.onTabNext as (() => void) | undefined)?.();
    });
    expect(navigateMock).toHaveBeenCalledWith(
      '/master-data/item-master/categories'
    );
    expect(customerState.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(customerState.setIsEditModalOpen).toHaveBeenCalledWith(false);
    expect(patientState.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(patientState.setIsEditModalOpen).toHaveBeenCalledWith(false);
    expect(doctorState.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(doctorState.setIsEditModalOpen).toHaveBeenCalledWith(false);

    act(() => {
      (
        captured.searchToolbarProps?.onTabPrevious as (() => void) | undefined
      )?.();
      vi.advanceTimersByTime(250);
    });
    expect(navigateMock).toHaveBeenCalled();
  });

  it('routes add actions and keydown handlers for customer/patient/doctor tabs', () => {
    const customerKeydown = vi.fn();
    const patientKeydown = vi.fn();
    const doctorKeydown = vi.fn();
    const customerState = {
      ...createMasterDataHookState('customer'),
      handleKeyDown: customerKeydown,
      setIsAddModalOpen: vi.fn(),
    };
    const patientState = {
      ...createMasterDataHookState('patient'),
      handleKeyDown: patientKeydown,
      setIsAddModalOpen: vi.fn(),
    };
    const doctorState = {
      ...createMasterDataHookState('doctor'),
      handleKeyDown: doctorKeydown,
      setIsAddModalOpen: vi.fn(),
    };
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') {
        return customerState;
      }
      if (type === 'patients') {
        return patientState;
      }
      if (type === 'doctors') {
        return doctorState;
      }
      return createMasterDataHookState(type);
    });

    locationMock.mockReturnValue({ pathname: '/master-data/customers' });
    const customerView = render(<ItemMasterPage />);
    act(() => {
      (captured.searchToolbarProps?.onAdd as (() => void) | undefined)?.();
      (
        captured.searchToolbarProps?.onKeyDown as
          | ((e: KeyboardEvent) => void)
          | undefined
      )?.({} as unknown as KeyboardEvent);
    });
    expect(customerKeydown).toHaveBeenCalled();
    expect(customerState.setIsAddModalOpen).toHaveBeenCalledWith(true);

    customerView.unmount();
    locationMock.mockReturnValue({ pathname: '/master-data/patients' });
    const patientView = render(<ItemMasterPage />);
    act(() => {
      (captured.searchToolbarProps?.onAdd as (() => void) | undefined)?.();
      (
        captured.searchToolbarProps?.onKeyDown as
          | ((e: KeyboardEvent) => void)
          | undefined
      )?.({} as unknown as KeyboardEvent);
    });
    expect(patientKeydown).toHaveBeenCalled();
    expect(patientState.setIsAddModalOpen).toHaveBeenCalledWith(true);

    patientView.unmount();
    locationMock.mockReturnValue({ pathname: '/master-data/doctors' });
    render(<ItemMasterPage />);
    act(() => {
      (captured.searchToolbarProps?.onAdd as (() => void) | undefined)?.();
      (
        captured.searchToolbarProps?.onKeyDown as
          | ((e: KeyboardEvent) => void)
          | undefined
      )?.({} as unknown as KeyboardEvent);
    });
    expect(doctorKeydown).toHaveBeenCalled();
    expect(doctorState.setIsAddModalOpen).toHaveBeenCalledWith(true);
  });

  it('falls back to items tab and logs warning when tab persistence fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation((key: string, value: string) => {
        if (key === 'item_master_last_tab') {
          throw new Error('quota');
        }
        return originalSetItem(key, value);
      });

    locationMock.mockReturnValue({ pathname: '/master-data/item-master' });
    render(<ItemMasterPage />);

    expect(navigateMock).toHaveBeenCalledWith(
      '/master-data/item-master/items',
      {
        replace: true,
      }
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to save last tab to session storage:',
      expect.any(Error)
    );

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('handles item callbacks for search clear/filter/grid-ready and row edit flows', () => {
    const setSearch = vi.fn();
    useItemsManagementMock.mockReturnValue({
      data: [
        { id: 'item-1', name: 'Amoxicillin' },
        { id: 'item-2', name: 'Paracetamol' },
      ],
      allData: [
        { id: 'item-1', name: 'Amoxicillin' },
        { id: 'item-2', name: 'Paracetamol' },
      ],
      setSearch,
      itemsPerPage: 25,
      isLoading: false,
      isError: false,
      queryError: null,
    });
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });

    render(<ItemMasterPage />);

    const reversedItemCallIndex = [...unifiedSearchCalls]
      .reverse()
      .findIndex(
        call =>
          (call.columns as Array<{ field?: string }> | undefined)?.[0]
            ?.field === 'items.name'
      );
    const itemCallIndex =
      reversedItemCallIndex === -1
        ? -1
        : unifiedSearchCalls.length - 1 - reversedItemCallIndex;
    const itemCall = unifiedSearchCalls[itemCallIndex] as
      | {
          onSearch?: (q: string) => void;
          onClear?: () => void;
          onFilterSearch?: (filter: Record<string, unknown> | null) => void;
        }
      | undefined;
    act(() => {
      itemCall?.onFilterSearch?.({
        field: 'items.name',
        operator: 'contains',
        value: 'pre-grid',
        isConfirmed: true,
        isExplicitOperator: true,
      });
    });
    expect(buildAdvancedFilterModelMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ value: 'pre-grid' })
    );

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

    const refreshedReversedIndex = [...unifiedSearchCalls]
      .reverse()
      .findIndex(
        call =>
          (call.columns as Array<{ field?: string }> | undefined)?.[0]
            ?.field === 'items.name'
      );
    const refreshedItemIndex =
      refreshedReversedIndex === -1
        ? -1
        : unifiedSearchCalls.length - 1 - refreshedReversedIndex;
    const activeItemCall = unifiedSearchCalls[refreshedItemIndex] as
      | {
          onSearch?: (q: string) => void;
          onClear?: () => void;
          onFilterSearch?: (filter: Record<string, unknown> | null) => void;
        }
      | undefined;
    const activeItemReturn = unifiedSearchReturns[refreshedItemIndex] as
      | { onGridReady?: (params: unknown) => void }
      | undefined;

    act(() => {
      activeItemCall?.onSearch?.('para');
      activeItemCall?.onClear?.();
    });
    expect(setSearch).toHaveBeenCalledWith('para');
    expect(setSearch).toHaveBeenCalledWith('');

    const gridParams = { api: 'mock-grid' };
    act(() => {
      (
        captured.entityGridProps?.onGridReady as
          | ((params: unknown) => void)
          | undefined
      )?.(gridParams);
    });
    expect(activeItemReturn?.onGridReady).toHaveBeenCalledWith(gridParams);

    const confirmed = {
      field: 'items.name',
      operator: 'contains',
      value: 'amo',
      isConfirmed: true,
      isExplicitOperator: true,
    };
    act(() => {
      activeItemCall?.onFilterSearch?.(confirmed);
    });
    expect(gridApi.setAdvancedFilterModel).toHaveBeenCalled();
    expect(sessionStorage.getItem('item_master_search_items')).toBe(
      '#name #contains aspirin##'
    );

    act(() => {
      activeItemCall?.onFilterSearch?.(null);
    });
    expect(sessionStorage.getItem('item_master_search_items')).toBeNull();

    act(() => {
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({ id: 'item-2', name: 'Paracetamol' });
    });
    expect(captured.itemModalProps?.itemId).toBe('item-2');

    act(() => {
      (
        captured.searchToolbarProps?.onItemSelect as
          | ((item: { id: string }) => void)
          | undefined
      )?.({ id: 'missing' });
    });
    expect(captured.itemModalProps?.itemId).toBeUndefined();
  });

  it('sorts supplier columns/data using visible columns and handles visibility update errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useSupplierTabMock.mockReturnValue({
      suppliersQuery: { isLoading: false, isError: false, error: null },
      supplierMutations: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      supplierFields: [{ key: 'name', label: 'Nama Supplier' }],
      supplierColumnDefs: [{ field: 'suppliers.name' }],
      suppliersData: [
        { id: 'sup-1', name: 'Alpha Med', email: 'a@example.dev' },
        { id: 'sup-2', name: 'Beta Pharma', phone: '08111' },
        { id: 'sup-3', name: 'Medline', address: 'Alpha Street' },
      ],
      isAddSupplierModalOpen: false,
      isEditSupplierModalOpen: false,
      editingSupplier: null,
      openAddSupplierModal: vi.fn(),
      closeAddSupplierModal: vi.fn(),
      openEditSupplierModal: vi.fn(),
      closeEditSupplierModal: vi.fn(),
    });
    useUnifiedSearchMock.mockImplementation(
      (options: Record<string, unknown>) => {
        unifiedSearchCalls.push(options);
        const ret = {
          search: options.searchMode === 'client' ? 'alpha' : '',
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
    locationMock.mockReturnValue({ pathname: '/master-data/suppliers' });

    render(<ItemMasterPage />);

    const throwingApi = {
      isDestroyed: vi.fn(() => false),
      setAdvancedFilterModel: vi.fn(),
      getAllDisplayedColumns: vi.fn(() => {
        throw new Error('boom');
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.(throwingApi);
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to update visible columns:',
      expect.any(Error)
    );

    const orderedApi = {
      isDestroyed: vi.fn(() => false),
      setAdvancedFilterModel: vi.fn(),
      getAllDisplayedColumns: vi.fn(() => [
        { getColId: () => 'suppliers.email' },
        { getColId: () => 'suppliers.name' },
      ]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.(orderedApi);
      vi.runAllTimers();
    });

    const latestSupplierCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.searchMode === 'client');
    const supplierFields = (
      latestSupplierCall?.columns as Array<{ field: string }> | undefined
    )?.map(col => col.field);
    expect(supplierFields?.[0]).toBe('suppliers.email');
    expect(supplierFields?.[1]).toBe('suppliers.name');

    const suppliers = (captured.entityGridProps?.suppliersData || []) as Array<{
      name: string;
    }>;
    expect(suppliers[0]?.name).toBe('Alpha Med');

    errorSpy.mockRestore();
  });

  it('routes grid-ready and row-click handlers for supplier/customer/patient/doctor/entity tabs', () => {
    const customerState = {
      ...createMasterDataHookState('customer'),
      handleEdit: vi.fn(),
      setSearch: vi.fn(),
    };
    const patientState = {
      ...createMasterDataHookState('patient'),
      handleEdit: vi.fn(),
      setSearch: vi.fn(),
    };
    const doctorState = {
      ...createMasterDataHookState('doctor'),
      handleEdit: vi.fn(),
      setSearch: vi.fn(),
    };
    const openEditSupplierModal = vi.fn();
    const entityManagerState = {
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
    };

    useEntityManagerMock.mockReturnValue(entityManagerState);
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') return customerState;
      if (type === 'patients') return patientState;
      if (type === 'doctors') return doctorState;
      return createMasterDataHookState(type);
    });
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

    const gridParams = { api: 'grid-ready' };

    locationMock.mockReturnValue({ pathname: '/master-data/suppliers' });
    const supplierView = render(<ItemMasterPage />);
    const supplierCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.searchMode === 'client');
    const supplierIndex = unifiedSearchCalls.findIndex(
      call => call === supplierCall
    );
    const supplierReturn = unifiedSearchReturns[supplierIndex] as
      | { onGridReady?: (params: unknown) => void }
      | undefined;
    act(() => {
      (
        captured.entityGridProps?.onGridReady as
          | ((params: unknown) => void)
          | undefined
      )?.(gridParams);
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({ id: 'sup-1', name: 'Supplier A' });
    });
    expect(supplierReturn?.onGridReady).toHaveBeenCalledWith(gridParams);
    expect(openEditSupplierModal).toHaveBeenCalledWith({
      id: 'sup-1',
      name: 'Supplier A',
    });
    supplierView.unmount();

    locationMock.mockReturnValue({ pathname: '/master-data/customers' });
    const customerView = render(<ItemMasterPage />);
    const customerCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === customerState.setSearch);
    const customerIndex = unifiedSearchCalls.findIndex(
      call => call === customerCall
    );
    const customerReturn = unifiedSearchReturns[customerIndex] as
      | { onGridReady?: (params: unknown) => void }
      | undefined;
    act(() => {
      (
        captured.entityGridProps?.onGridReady as
          | ((params: unknown) => void)
          | undefined
      )?.(gridParams);
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({ id: 'cus-1', name: 'Customer A' });
    });
    expect(customerReturn?.onGridReady).toHaveBeenCalledWith(gridParams);
    expect(customerState.handleEdit).toHaveBeenCalledWith({
      id: 'cus-1',
      name: 'Customer A',
    });
    customerView.unmount();

    locationMock.mockReturnValue({ pathname: '/master-data/patients' });
    const patientView = render(<ItemMasterPage />);
    const patientCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === patientState.setSearch);
    const patientIndex = unifiedSearchCalls.findIndex(
      call => call === patientCall
    );
    const patientReturn = unifiedSearchReturns[patientIndex] as
      | { onGridReady?: (params: unknown) => void }
      | undefined;
    act(() => {
      (
        captured.entityGridProps?.onGridReady as
          | ((params: unknown) => void)
          | undefined
      )?.(gridParams);
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({ id: 'pat-1', name: 'Patient A' });
    });
    expect(patientReturn?.onGridReady).toHaveBeenCalledWith(gridParams);
    expect(patientState.handleEdit).toHaveBeenCalledWith({
      id: 'pat-1',
      name: 'Patient A',
    });
    patientView.unmount();

    locationMock.mockReturnValue({ pathname: '/master-data/doctors' });
    const doctorView = render(<ItemMasterPage />);
    const doctorCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === doctorState.setSearch);
    const doctorIndex = unifiedSearchCalls.findIndex(
      call => call === doctorCall
    );
    const doctorReturn = unifiedSearchReturns[doctorIndex] as
      | { onGridReady?: (params: unknown) => void }
      | undefined;
    act(() => {
      (
        captured.entityGridProps?.onGridReady as
          | ((params: unknown) => void)
          | undefined
      )?.(gridParams);
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({ id: 'doc-1', name: 'Doctor A' });
    });
    expect(doctorReturn?.onGridReady).toHaveBeenCalledWith(gridParams);
    expect(doctorState.handleEdit).toHaveBeenCalledWith({
      id: 'doc-1',
      name: 'Doctor A',
    });
    doctorView.unmount();

    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/categories',
    });
    render(<ItemMasterPage />);
    const entityCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === entityManagerState.handleSearch);
    const entityIndex = unifiedSearchCalls.findIndex(
      call => call === entityCall
    );
    const entityReturn = unifiedSearchReturns[entityIndex] as
      | { onGridReady?: (params: unknown) => void }
      | undefined;
    act(() => {
      (
        captured.entityGridProps?.onGridReady as
          | ((params: unknown) => void)
          | undefined
      )?.(gridParams);
      (
        captured.entityGridProps?.onRowClick as
          | ((row: Record<string, unknown>) => void)
          | undefined
      )?.({ id: 'cat-1', name: 'Kategori A' });
    });
    expect(entityReturn?.onGridReady).toHaveBeenCalledWith(gridParams);
    expect(entityManagerState.openEditModal).toHaveBeenCalledWith({
      id: 'cat-1',
      name: 'Kategori A',
    });
  });

  it('orders customer/patient/doctor search columns from visible grid columns and runs clear handlers', () => {
    const customerState = {
      ...createMasterDataHookState('customer'),
      setSearch: vi.fn(),
    };
    const patientState = {
      ...createMasterDataHookState('patient'),
      setSearch: vi.fn(),
    };
    const doctorState = {
      ...createMasterDataHookState('doctor'),
      setSearch: vi.fn(),
    };
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') return customerState;
      if (type === 'patients') return patientState;
      if (type === 'doctors') return doctorState;
      return createMasterDataHookState(type);
    });
    getSearchColumnsByEntityMock.mockImplementation((entity: string) => {
      if (entity === 'customers') {
        return [
          {
            field: 'customers.name',
            headerName: 'Nama',
            searchable: true,
            type: 'text',
          },
          {
            field: 'customers.email',
            headerName: 'Email',
            searchable: true,
            type: 'text',
          },
        ];
      }
      if (entity === 'patients') {
        return [
          {
            field: 'patients.name',
            headerName: 'Nama',
            searchable: true,
            type: 'text',
          },
          {
            field: 'patients.email',
            headerName: 'Email',
            searchable: true,
            type: 'text',
          },
        ];
      }
      if (entity === 'doctors') {
        return [
          {
            field: 'doctors.name',
            headerName: 'Nama',
            searchable: true,
            type: 'text',
          },
          {
            field: 'doctors.email',
            headerName: 'Email',
            searchable: true,
            type: 'text',
          },
        ];
      }
      return [
        { field: 'name', headerName: 'Nama', searchable: true, type: 'text' },
      ];
    });

    const listeners: Record<string, Array<() => void>> = {};
    const orderedApi = {
      isDestroyed: vi.fn(() => false),
      setAdvancedFilterModel: vi.fn(),
      getAllDisplayedColumns: vi.fn(() => [
        { getColId: () => 'customers.email' },
        { getColId: () => 'customers.name' },
      ]),
      addEventListener: vi.fn((event: string, cb: () => void) => {
        listeners[event] = [...(listeners[event] || []), cb];
      }),
      removeEventListener: vi.fn(),
    };

    locationMock.mockReturnValue({ pathname: '/master-data/customers' });
    const customerView = render(<ItemMasterPage />);
    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.(orderedApi);
      listeners.columnVisible?.forEach(cb => cb());
    });
    const customerCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === customerState.setSearch);
    expect(
      (customerCall?.columns as Array<{ field: string }> | undefined)?.map(
        col => col.field
      )
    ).toEqual(['customers.email', 'customers.name']);
    act(() => {
      (customerCall?.onClear as (() => void) | undefined)?.();
    });
    expect(customerState.setSearch).toHaveBeenCalledWith('');
    customerView.unmount();

    locationMock.mockReturnValue({ pathname: '/master-data/patients' });
    const patientView = render(<ItemMasterPage />);
    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.({
        ...orderedApi,
        getAllDisplayedColumns: () => [
          { getColId: () => 'patients.email' },
          { getColId: () => 'patients.name' },
        ],
      });
      listeners.columnVisible?.forEach(cb => cb());
    });
    const patientCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === patientState.setSearch);
    expect(
      (patientCall?.columns as Array<{ field: string }> | undefined)?.map(
        col => col.field
      )
    ).toEqual(['patients.email', 'patients.name']);
    act(() => {
      (patientCall?.onClear as (() => void) | undefined)?.();
    });
    expect(patientState.setSearch).toHaveBeenCalledWith('');
    patientView.unmount();

    locationMock.mockReturnValue({ pathname: '/master-data/doctors' });
    render(<ItemMasterPage />);
    act(() => {
      (
        captured.entityGridProps?.onGridApiReady as
          | ((api: unknown) => void)
          | undefined
      )?.({
        ...orderedApi,
        getAllDisplayedColumns: () => [
          { getColId: () => 'doctors.email' },
          { getColId: () => 'doctors.name' },
        ],
      });
      listeners.columnVisible?.forEach(cb => cb());
    });
    const doctorCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === doctorState.setSearch);
    expect(
      (doctorCall?.columns as Array<{ field: string }> | undefined)?.map(
        col => col.field
      )
    ).toEqual(['doctors.email', 'doctors.name']);
    act(() => {
      (doctorCall?.onClear as (() => void) | undefined)?.();
    });
    expect(doctorState.setSearch).toHaveBeenCalledWith('');
  });

  it('handles entity delete callback and closes customer/patient/doctor modals from modal props', async () => {
    const customerState = {
      ...createMasterDataHookState('customer'),
      setIsAddModalOpen: vi.fn(),
      setIsEditModalOpen: vi.fn(),
      isAddModalOpen: true,
      isEditModalOpen: true,
      editingItem: { id: 'cus-1', name: 'Customer A' },
    };
    const patientState = {
      ...createMasterDataHookState('patient'),
      setIsAddModalOpen: vi.fn(),
      setIsEditModalOpen: vi.fn(),
      isAddModalOpen: true,
      isEditModalOpen: true,
      editingItem: { id: 'pat-1', name: 'Patient A' },
    };
    const doctorState = {
      ...createMasterDataHookState('doctor'),
      setIsAddModalOpen: vi.fn(),
      setIsEditModalOpen: vi.fn(),
      isAddModalOpen: true,
      isEditModalOpen: true,
      editingItem: { id: 'doc-1', name: 'Doctor A' },
    };
    const entityManagerState = {
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
      isEditModalOpen: true,
      editingEntity: { id: 'cat-1', name: 'Kategori A' },
    };

    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') return customerState;
      if (type === 'patients') return patientState;
      if (type === 'doctors') return doctorState;
      return createMasterDataHookState(type);
    });
    useEntityManagerMock.mockReturnValue(entityManagerState);
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/categories',
    });

    render(<ItemMasterPage />);

    await act(async () => {
      await (
        captured.entityModalProps?.onDelete as (() => Promise<void>) | undefined
      )?.();
    });
    expect(entityManagerState.handleDelete).toHaveBeenCalledWith({
      id: 'cat-1',
      name: 'Kategori A',
    });

    const customerAddModal = captured.identityModalProps.find(
      props => props.title === 'Tambah Pelanggan Baru'
    );
    const customerEditModal = captured.identityModalProps.find(
      props => props.title === 'Edit Pelanggan'
    );
    const patientAddModal = captured.identityModalProps.find(
      props => props.title === 'Tambah Pasien Baru'
    );
    const patientEditModal = captured.identityModalProps.find(
      props => props.title === 'Edit Pasien'
    );
    const doctorAddModal = captured.identityModalProps.find(
      props => props.title === 'Tambah Dokter Baru'
    );
    const doctorEditModal = captured.identityModalProps.find(
      props => props.title === 'Edit Dokter'
    );

    act(() => {
      (customerAddModal?.onClose as (() => void) | undefined)?.();
      (customerEditModal?.onClose as (() => void) | undefined)?.();
      (patientAddModal?.onClose as (() => void) | undefined)?.();
      (patientEditModal?.onClose as (() => void) | undefined)?.();
      (doctorAddModal?.onClose as (() => void) | undefined)?.();
      (doctorEditModal?.onClose as (() => void) | undefined)?.();
    });

    expect(customerState.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(customerState.setIsEditModalOpen).toHaveBeenCalledWith(false);
    expect(patientState.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(patientState.setIsEditModalOpen).toHaveBeenCalledWith(false);
    expect(doctorState.setIsAddModalOpen).toHaveBeenCalledWith(false);
    expect(doctorState.setIsEditModalOpen).toHaveBeenCalledWith(false);
  });

  it('skips same-tab navigation and clears pending debounce when unmounting', () => {
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });
    const view = render(<ItemMasterPage />);

    const onSelectionChange = captured.slidingSelectorProps
      ?.onSelectionChange as ((key: string, value: string) => void) | undefined;

    act(() => {
      onSelectionChange?.('items', 'items');
    });
    expect(navigateMock).toHaveBeenCalledTimes(0);

    act(() => {
      onSelectionChange?.('categories', 'categories');
      onSelectionChange?.('types', 'types');
    });
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenLastCalledWith(
      '/master-data/item-master/categories'
    );

    view.unmount();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to items tab for unknown item-master path segment', () => {
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/not-a-real-tab',
    });

    render(<ItemMasterPage />);

    expect(captured.entityGridProps?.activeTab).toBe('items');
    expect(captured.searchToolbarProps?.exportFilename).toBe('daftar-item');
  });

  it('orders entity search columns by base field and blocks null filter during tab switch', () => {
    const entityManagerState = {
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
    };
    useEntityManagerMock.mockReturnValue(entityManagerState);
    getSearchColumnsByEntityMock.mockImplementation((entity: string) => {
      if (entity === 'categories') {
        return [
          {
            field: 'categories.name',
            headerName: 'Nama',
            searchable: true,
            type: 'text',
          },
          {
            field: 'categories.code',
            headerName: 'Kode',
            searchable: true,
            type: 'text',
          },
          {
            field: 'categories.description',
            headerName: 'Deskripsi',
            searchable: true,
            type: 'text',
          },
        ];
      }
      return [
        { field: 'name', headerName: 'Nama', searchable: true, type: 'text' },
      ];
    });
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/categories',
    });

    render(<ItemMasterPage />);

    const listeners: Record<string, Array<() => void>> = {};
    const gridApi = {
      isDestroyed: vi.fn(() => false),
      setAdvancedFilterModel: vi.fn(),
      getAllDisplayedColumns: vi.fn(() => [
        { getColId: () => 'visible.code' },
        { getColId: () => 'visible.name' },
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
      listeners.columnVisible?.forEach(cb => cb());
    });

    const entityCall = [...unifiedSearchCalls]
      .reverse()
      .find(call => call.onSearch === entityManagerState.handleSearch) as
      | {
          columns?: Array<{ field: string }>;
          onFilterSearch?: (filter: Record<string, unknown> | null) => void;
        }
      | undefined;

    expect(entityCall?.columns?.map(col => col.field)).toEqual([
      'categories.code',
      'categories.name',
      'categories.description',
    ]);

    const appliedCount = gridApi.setAdvancedFilterModel.mock.calls.length;
    act(() => {
      (
        captured.slidingSelectorProps?.onSelectionChange as
          | ((key: string, value: string) => void)
          | undefined
      )?.('types', 'types');
      entityCall?.onFilterSearch?.(null);
    });
    expect(gridApi.setAdvancedFilterModel.mock.calls.length).toBe(appliedCount);
  });

  it('covers master-data filter guards before grid ready and on destroyed grid api', () => {
    const customerState = {
      ...createMasterDataHookState('customer'),
      setSearch: vi.fn(),
    };
    useMasterDataManagementMock.mockImplementation((type: string) => {
      if (type === 'customers') return customerState;
      return createMasterDataHookState(type);
    });
    locationMock.mockReturnValue({ pathname: '/master-data/customers' });

    render(<ItemMasterPage />);

    const findCustomerCall = () =>
      [...unifiedSearchCalls]
        .reverse()
        .find(call => call.onSearch === customerState.setSearch) as
        | {
            onFilterSearch?: (filter: Record<string, unknown> | null) => void;
          }
        | undefined;

    const initialCall = findCustomerCall();
    const beforeNoGrid = buildAdvancedFilterModelMock.mock.calls.length;
    act(() => {
      initialCall?.onFilterSearch?.(null);
    });
    expect(buildAdvancedFilterModelMock.mock.calls.length).toBe(beforeNoGrid);

    const destroyedApi = {
      isDestroyed: vi.fn(() => true),
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
      )?.(destroyedApi);
    });
    const destroyedCall = findCustomerCall();
    const beforeDestroyed = buildAdvancedFilterModelMock.mock.calls.length;
    act(() => {
      destroyedCall?.onFilterSearch?.({
        field: 'customers.name',
        operator: 'contains',
        value: 'alpha',
        isConfirmed: true,
        isExplicitOperator: true,
      });
    });
    expect(buildAdvancedFilterModelMock.mock.calls.length).toBe(
      beforeDestroyed
    );

    const liveApi = {
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
      )?.(liveApi);
    });

    const liveCall = findCustomerCall();
    act(() => {
      liveCall?.onFilterSearch?.({
        field: 'customers.name',
        operator: 'contains',
        value: 'beta',
        isConfirmed: true,
        isExplicitOperator: true,
      });
    });
    expect(liveApi.setAdvancedFilterModel).toHaveBeenCalled();
    expect(sessionStorage.getItem('item_master_search_customers')).toBe(
      '#name #contains aspirin##'
    );

    act(() => {
      liveCall?.onFilterSearch?.(null);
    });
    expect(sessionStorage.getItem('item_master_search_customers')).toBeNull();
  });

  it('uses add-mode entity modal close handler with fallback entity name', () => {
    const closeAddModal = vi.fn();
    useEntityManagerMock.mockReturnValue({
      search: '',
      itemsPerPage: 10,
      entityConfigs: {},
      handleSearch: vi.fn(),
      openEditModal: vi.fn(),
      openAddModal: vi.fn(),
      closeEditModal: vi.fn(),
      closeAddModal,
      handleSubmit: vi.fn(),
      handleDelete: vi.fn(),
      isAddModalOpen: true,
      isEditModalOpen: false,
      editingEntity: null,
    });
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/categories',
    });

    render(<ItemMasterPage />);

    expect(captured.entityModalProps?.entityName).toBe('Entity');
    expect(captured.entityModalProps?.onDelete).toBeUndefined();
    act(() => {
      (captured.entityModalProps?.onClose as (() => void) | undefined)?.();
    });
    expect(closeAddModal).toHaveBeenCalled();
  });

  it('does not force search focus while tab selector is expanded', () => {
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });
    render(<ItemMasterPage />);

    const input = screen.getByTestId('toolbar-search-input');
    act(() => {
      (
        captured.slidingSelectorProps?.onExpandedChange as
          | ((expanded: boolean) => void)
          | undefined
      )?.(true);
    });

    input.blur();
    (document.body as HTMLElement).focus();
    fireEvent.pointerDown(document.body, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(input).not.toHaveFocus();

    act(() => {
      (
        captured.slidingSelectorProps?.onExpandedChange as
          | ((expanded: boolean) => void)
          | undefined
      )?.(false);
    });
    fireEvent.pointerDown(document.body, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(input).toHaveFocus();
  });

  it('closes open item modal when switching tabs from items view', () => {
    locationMock.mockReturnValue({
      pathname: '/master-data/item-master/items',
    });
    render(<ItemMasterPage />);

    act(() => {
      (captured.searchToolbarProps?.onAdd as (() => void) | undefined)?.();
    });
    expect(captured.itemModalProps?.isOpen).toBe(true);

    act(() => {
      (
        captured.slidingSelectorProps?.onSelectionChange as
          | ((key: string, value: string) => void)
          | undefined
      )?.('categories', 'categories');
      vi.advanceTimersByTime(120);
    });

    expect(captured.itemModalProps?.isOpen).toBe(false);
    expect(navigateMock).toHaveBeenCalledWith(
      '/master-data/item-master/categories'
    );
  });
});
