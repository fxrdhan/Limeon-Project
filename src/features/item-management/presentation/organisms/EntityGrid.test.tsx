import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityGrid from './EntityGrid';

const useColumnDisplayModeMock = vi.hoisted(() => vi.fn());
const useItemsDisplayTransformMock = vi.hoisted(() => vi.fn());
const useDynamicGridHeightMock = vi.hoisted(() => vi.fn());
const hasSavedStateMock = vi.hoisted(() => vi.fn());
const getPinAndFilterMenuItemsMock = vi.hoisted(() => vi.fn());
const capturedDataGridProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedPaginationProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const toggleDisplayModeMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ag-grid', async () => {
  const react = await vi.importActual<typeof import('react')>('react');

  return {
    DataGrid: react.forwardRef<HTMLElement, Record<string, unknown>>(
      (props, ref) => {
        capturedDataGridProps.current = props;
        return react.createElement('div', { 'data-testid': 'data-grid', ref });
      }
    ),
    getPinAndFilterMenuItems: getPinAndFilterMenuItemsMock,
  };
});

vi.mock('../atoms', () => ({
  StandardPagination: (props: Record<string, unknown>) => {
    capturedPaginationProps.current = props;
    return <div data-testid="standard-pagination" />;
  },
}));

vi.mock('@/features/item-management/application/hooks/ui', () => ({
  useColumnDisplayMode: useColumnDisplayModeMock,
}));

vi.mock(
  '@/features/item-management/application/hooks/ui/useItemsDisplayTransform',
  () => ({
    useItemsDisplayTransform: useItemsDisplayTransformMock,
  })
);

vi.mock('@/hooks/ag-grid/useDynamicGridHeight', () => ({
  useDynamicGridHeight: useDynamicGridHeightMock,
}));

vi.mock('@/utils/gridStateManager', () => ({
  hasSavedState: hasSavedStateMock,
}));

const baseProps = () => ({
  activeTab: 'items' as const,
  itemsData: [],
  suppliersData: [],
  entityData: [],
  isLoading: false,
  isError: false,
  error: null,
  search: '',
  itemColumnDefs: [{ field: 'name' }],
  supplierColumnDefs: [{ field: 'name' }],
  entityColumnDefs: [{ field: 'name' }],
  isRowGroupingEnabled: false,
  defaultExpanded: 1,
  showGroupPanel: true,
  entityConfig: null,
  onRowClick: vi.fn(),
  onGridReady: vi.fn(),
  isExternalFilterPresent: vi.fn(() => false),
  doesExternalFilterPass: vi.fn(() => true),
  onGridApiReady: vi.fn(),
  onFilterChanged: vi.fn(),
  itemsPerPage: 20,
});

describe('EntityGrid', () => {
  beforeEach(() => {
    capturedDataGridProps.current = null;
    capturedPaginationProps.current = null;

    sessionStorage.clear();
    vi.restoreAllMocks();

    getPinAndFilterMenuItemsMock.mockReset();
    getPinAndFilterMenuItemsMock.mockReturnValue(['pinSubMenu']);

    toggleDisplayModeMock.mockReset();

    useColumnDisplayModeMock.mockReset();
    useColumnDisplayModeMock.mockReturnValue({
      displayModeState: { category: 'name' },
      isReferenceColumn: vi.fn((colId: string) => colId === 'category'),
      toggleColumnDisplayMode: toggleDisplayModeMock,
    });

    useItemsDisplayTransformMock.mockReset();
    useItemsDisplayTransformMock.mockImplementation(
      (data: unknown[] | undefined) => data ?? []
    );

    useDynamicGridHeightMock.mockReset();
    useDynamicGridHeightMock.mockReturnValue({ gridHeight: 555 });

    hasSavedStateMock.mockReset();
    hasSavedStateMock.mockReturnValue(false);
  });

  it('renders error message when isError is true', () => {
    const props = baseProps();

    render(
      <EntityGrid
        {...props}
        isError={true}
        error={new Error('boom')}
        onGridApiReady={undefined}
      />
    );

    expect(screen.getByText('Error: boom')).toBeInTheDocument();
    expect(screen.queryByTestId('data-grid')).not.toBeInTheDocument();
  });

  it('passes items rowData/columnDefs and correct overlay text for search mode', () => {
    const props = baseProps();
    const transformedItems = [{ id: 'i-1', name: 'Aspirin' }];

    useItemsDisplayTransformMock.mockReturnValue(transformedItems);

    render(<EntityGrid {...props} search="asp" />);

    const gridProps = capturedDataGridProps.current as {
      rowData: unknown[];
      columnDefs: Array<Record<string, unknown>>;
      overlayNoRowsTemplate: string;
      style: Record<string, unknown>;
      rowGroupPanelShow: string;
    };

    expect(gridProps.rowData).toEqual(transformedItems);
    expect(gridProps.columnDefs).toEqual([{ field: 'name' }]);
    expect(gridProps.overlayNoRowsTemplate).toContain(
      'Tidak ada item dengan nama "asp"'
    );
    expect(gridProps.style.height).toBe('555px');
    expect(gridProps.rowGroupPanelShow).toBe('never');
    expect(screen.getByTestId('standard-pagination')).toBeInTheDocument();
  });

  it('handles grid callbacks for row click, grid ready, filter change, and grouping', async () => {
    const props = baseProps();
    const onRowClick = vi.fn();
    const onGridReady = vi.fn();
    const onGridApiReady = vi.fn();
    const onFilterChanged = vi.fn();

    render(
      <EntityGrid
        {...props}
        activeTab="items"
        isRowGroupingEnabled={true}
        onRowClick={onRowClick}
        onGridReady={onGridReady}
        onGridApiReady={onGridApiReady}
        onFilterChanged={onFilterChanged}
      />
    );

    const gridApi = {
      paginationGetPageSize: vi.fn(() => 50),
      isDestroyed: vi.fn(() => false),
      getFilterModel: vi.fn(() => ({ name: { filter: 'abc' } })),
      ensureIndexVisible: vi.fn(),
    };

    const gridProps = capturedDataGridProps.current as {
      onGridReady: (event: { api: typeof gridApi }) => void;
      onRowClicked: (event: {
        node: { group: boolean };
        data?: Record<string, unknown>;
      }) => void;
      onFilterChanged: () => void;
      onRowGroupOpened: (event: {
        expanded: boolean;
        node: { rowIndex: number; childrenAfterSort: unknown[] };
      }) => void;
    };

    act(() => {
      gridProps.onGridReady({ api: gridApi });
    });

    expect(onGridReady).toHaveBeenCalledTimes(1);
    expect(onGridApiReady).toHaveBeenCalledWith(gridApi);

    await waitFor(() => {
      const paginationProps = capturedPaginationProps.current as {
        gridApi: unknown;
      };
      expect(paginationProps.gridApi).toBe(gridApi);
    });

    const updatedGridProps = capturedDataGridProps.current as {
      onRowClicked: (event: {
        node: { group: boolean };
        data?: Record<string, unknown>;
      }) => void;
      onFilterChanged: () => void;
      onRowGroupOpened: (event: {
        expanded: boolean;
        node: { rowIndex: number; childrenAfterSort: unknown[] };
      }) => void;
    };

    updatedGridProps.onRowClicked({
      node: { group: true },
      data: { id: 'skip' },
    });
    updatedGridProps.onRowClicked({
      node: { group: false },
      data: { id: 'row-1' },
    });

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith({ id: 'row-1' });

    updatedGridProps.onFilterChanged();
    expect(onFilterChanged).toHaveBeenCalledWith({
      name: { filter: 'abc' },
    });

    updatedGridProps.onRowGroupOpened({
      expanded: true,
      node: { rowIndex: 4, childrenAfterSort: [{}, {}] },
    });
    expect(gridApi.ensureIndexVisible).toHaveBeenCalledWith(6);
  });

  it('restores tab state and builds menu actions for items reference columns', () => {
    const props = baseProps();
    vi.useFakeTimers();
    hasSavedStateMock.mockImplementation((tableType: string) => {
      return tableType === 'suppliers';
    });

    sessionStorage.setItem(
      'grid_state_suppliers',
      JSON.stringify({ sideBar: { visible: true, openToolPanelId: 'columns' } })
    );

    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback(0);
        return 1;
      });

    const { rerender } = render(<EntityGrid {...props} activeTab="items" />);

    const gridApi = {
      paginationGetPageSize: vi.fn(() => 20),
      isDestroyed: vi.fn(() => false),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
      getColumn: vi.fn(() => ({ getColId: () => 'category' })),
      autoSizeColumns: vi.fn(),
      getFilterModel: vi.fn(() => ({})),
      ensureIndexVisible: vi.fn(),
    };

    const firstProps = capturedDataGridProps.current as {
      onGridReady: (event: { api: typeof gridApi }) => void;
      getMainMenuItems: (params: {
        column?: {
          getColId: () => string;
          getColDef: () => { enableRowGroup?: boolean };
        };
      }) => unknown[];
      sideBar: { defaultToolPanel?: string };
    };

    firstProps.onGridReady({ api: gridApi });

    rerender(<EntityGrid {...props} activeTab="suppliers" />);

    expect(gridApi.setState).toHaveBeenCalledWith({
      sideBar: { visible: true, openToolPanelId: 'columns' },
    });

    const secondProps = capturedDataGridProps.current as {
      getMainMenuItems: (params: {
        column?: {
          getColId: () => string;
          getColDef: () => { enableRowGroup?: boolean };
        };
      }) => unknown[];
      sideBar: { defaultToolPanel?: string };
    };

    expect(secondProps.sideBar.defaultToolPanel).toBe('columns');

    rerender(<EntityGrid {...props} activeTab="items" />);
    const itemsProps = capturedDataGridProps.current as {
      getMainMenuItems: (params: {
        column?: {
          getColId: () => string;
          getColDef: () => { enableRowGroup?: boolean };
        };
      }) => unknown[];
    };

    const noColumnMenu = itemsProps.getMainMenuItems({});
    expect(noColumnMenu).toEqual(['pinSubMenu']);

    const menuItems = itemsProps.getMainMenuItems({
      column: {
        getColId: () => 'category',
        getColDef: () => ({ enableRowGroup: true }),
      },
    }) as Array<{
      name?: string;
      action?: () => void;
      icon?: string;
    }>;

    const toggleMenu = menuItems.find(item => item.name?.includes('Tampilkan'));
    expect(toggleMenu).toBeDefined();
    toggleMenu?.action?.();

    expect(toggleDisplayModeMock).toHaveBeenCalledWith('category');

    vi.runAllTimers();
    expect(gridApi.autoSizeColumns).toHaveBeenCalledWith(['category']);

    requestAnimationFrameSpy.mockRestore();
    vi.useRealTimers();
  });

  it('renders supplier and entity overlay fallback messages', () => {
    const props = baseProps();

    const { rerender } = render(
      <EntityGrid {...props} activeTab="suppliers" search="" />
    );

    let gridProps = capturedDataGridProps.current as {
      overlayNoRowsTemplate: string;
    };

    expect(gridProps.overlayNoRowsTemplate).toContain(
      'Tidak ada data supplier yang ditemukan'
    );

    rerender(
      <EntityGrid
        {...props}
        activeTab="types"
        search="amoxicillin"
        entityConfig={{
          entityName: 'types',
          nameColumnHeader: 'Nama',
          searchNoDataMessage: 'Tidak ketemu',
          noDataMessage: 'Kosong',
        }}
      />
    );

    gridProps = capturedDataGridProps.current as {
      overlayNoRowsTemplate: string;
    };
    expect(gridProps.overlayNoRowsTemplate).toContain(
      'Tidak ketemu "amoxicillin"'
    );
  });
});
