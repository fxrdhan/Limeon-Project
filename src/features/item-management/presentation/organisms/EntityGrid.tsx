import type {
  ColDef,
  ColGroupDef,
  FirstDataRenderedEvent,
  GetMainMenuItems,
  GridApi,
  GridState,
  GridReadyEvent,
  IRowNode,
  RowClickedEvent,
  RowGroupOpenedEvent,
} from 'ag-grid-community';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Components
import DataGrid from '@/components/ag-grid/DataGrid';
import { getPinAndFilterMenuItems } from '@/components/ag-grid/columns';
import type { AgGridReact } from 'ag-grid-react';
import StandardPagination from '../atoms/StandardPagination';

// Hooks
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui';
import { useItemsDisplayTransform } from '@/features/item-management/application/hooks/ui/useItemsDisplayTransform';
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
// Simple grid state utilities
import * as gridStateManager from '@/utils/gridStateManager';
import type { TableType } from '@/utils/gridStateManager';
import {
  getItemMasterSearchSessionKey,
  isMasterDataTab,
  type MasterDataType,
} from '@/features/item-management/shared/types';

// Types
import type {
  Customer,
  Doctor,
  Item,
  Patient,
  Supplier,
} from '@/types/database';
import { EntityData } from '../../application/hooks/collections/useEntityManager';

// Extended entity types with code property for display mode
type EntityWithCode = {
  name: string;
  code?: string | null;
};

// Extended Item interface for column display mode transformations
// Extend Record<string, unknown> to satisfy generic constraints where a
// Record<string, unknown> is required by transformation utilities.
interface ItemWithExtendedEntities
  extends
    Record<string, unknown>,
    Omit<Item, 'category' | 'type' | 'package' | 'dosage' | 'manufacturer'> {
  category?: EntityWithCode;
  type?: EntityWithCode;
  package?: EntityWithCode; // Kemasan (yang ditampilkan di grid)
  dosage?: EntityWithCode;
  manufacturer?: EntityWithCode;
}

interface EntityConfig {
  entityName: string;
  nameColumnHeader: string;
  hasAddress?: boolean;
  hasNciCode?: boolean;
  searchPlaceholder?: string;
  noDataMessage?: string;
  searchNoDataMessage?: string;
}

interface EntityGridProps {
  activeTab: MasterDataType;

  // Data
  itemsData?: Item[];
  suppliersData?: Supplier[];
  entityData?: (EntityData | Customer | Patient | Doctor)[];

  // States
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  search: string;

  // Grid config
  itemColumnDefs?: (ColDef | ColGroupDef)[];
  supplierColumnDefs?: (ColDef | ColGroupDef)[];
  isRowGroupingEnabled?: boolean;
  defaultExpanded?: number;
  showGroupPanel?: boolean;

  // Entity config
  entityConfig?: EntityConfig | null;
  entityColumnDefs?: (ColDef | ColGroupDef)[];

  // Handlers
  onRowClick: (
    data:
      | ItemWithExtendedEntities
      | EntityData
      | Supplier
      | Customer
      | Patient
      | Doctor
  ) => void;
  onGridReady: (
    params: GridReadyEvent<
      | ItemWithExtendedEntities
      | EntityData
      | Supplier
      | Customer
      | Patient
      | Doctor
    >
  ) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (
    node: IRowNode<
      | ItemWithExtendedEntities
      | EntityData
      | Supplier
      | Customer
      | Patient
      | Doctor
    >
  ) => boolean;
  onGridApiReady?: (api: GridApi | null) => void; // Add grid API callback
  onFilterChanged?: (
    filterModel: import('ag-grid-community').FilterModel
  ) => void; // Filter sync callback

  // Pagination (for items)
  itemsPerPage?: number;
  hideFloatingPagination?: boolean;
}

const EntityGrid = memo<EntityGridProps>(function EntityGrid({
  activeTab,
  /* c8 ignore next */
  itemsData = [],
  /* c8 ignore next */
  suppliersData = [],
  entityData = [],
  isLoading,
  isError,
  error,
  search,
  itemColumnDefs = [],
  supplierColumnDefs = [],
  isRowGroupingEnabled = false,
  defaultExpanded = 1,
  showGroupPanel = true,
  entityConfig,
  entityColumnDefs = [],
  onRowClick,
  onGridReady,
  isExternalFilterPresent,
  doesExternalFilterPass,
  onGridApiReady,
  onFilterChanged,
  itemsPerPage = 25,
  hideFloatingPagination = false,
}) {
  // Single grid API for all tabs
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const dataGridRef = useRef<AgGridReact>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(itemsPerPage);
  const hasPersistedSearchPattern = useCallback((tableType: TableType) => {
    if (!isMasterDataTab(tableType)) {
      return false;
    }

    try {
      const savedPattern = sessionStorage.getItem(
        getItemMasterSearchSessionKey(tableType)
      );
      return !!savedPattern?.trim();
    } catch {
      return false;
    }
  }, []);

  const sanitizeSavedGridState = useCallback(
    (tableType: TableType, state: unknown): GridState | undefined => {
      if (!state || typeof state !== 'object') {
        return undefined;
      }

      const allowedPageSizes = new Set([25, 50, 100]);
      if (hasPersistedSearchPattern(tableType)) {
        const gridState = state as GridState;
        const savedPageSize = gridState.pagination?.pageSize;
        if (
          savedPageSize === undefined ||
          allowedPageSizes.has(savedPageSize)
        ) {
          return gridState;
        }

        const normalizedState: GridState = {
          ...gridState,
          pagination: {
            ...gridState.pagination,
            pageSize: 25,
          },
        };

        try {
          sessionStorage.setItem(
            `grid_state_${tableType}`,
            JSON.stringify(normalizedState)
          );
        } catch {
          // ignore
        }

        return normalizedState;
      }

      const gridState = state as GridState;
      const advancedFilterModel = gridState.filter?.advancedFilterModel;
      const savedPageSize = gridState.pagination?.pageSize;
      const normalizedPageSize =
        savedPageSize === undefined || allowedPageSizes.has(savedPageSize)
          ? savedPageSize
          : 25;

      if (advancedFilterModel == null && normalizedPageSize === savedPageSize) {
        return gridState;
      }

      const sanitizedState: GridState = {
        ...gridState,
        pagination:
          normalizedPageSize === savedPageSize
            ? gridState.pagination
            : {
                ...gridState.pagination,
                pageSize: normalizedPageSize,
              },
        filter: {
          ...gridState.filter,
          advancedFilterModel: undefined,
        },
      };

      try {
        sessionStorage.setItem(
          `grid_state_${tableType}`,
          JSON.stringify(sanitizedState)
        );
      } catch {
        // ignore
      }

      return sanitizedState;
    },
    [hasPersistedSearchPattern]
  );

  const readSavedGridState = useCallback(
    (tableType: TableType) => {
      let stateFromHelper: unknown = undefined;
      if ('loadSavedStateForInit' in gridStateManager) {
        stateFromHelper = (
          gridStateManager as {
            loadSavedStateForInit: (table: TableType) => unknown;
          }
        ).loadSavedStateForInit(tableType);
      }
      if (!stateFromHelper && 'getSavedStateInfo' in gridStateManager) {
        stateFromHelper = (
          gridStateManager as {
            getSavedStateInfo: (table: TableType) => unknown;
          }
        ).getSavedStateInfo(tableType);
      }

      if (stateFromHelper) {
        return sanitizeSavedGridState(tableType, stateFromHelper);
      }

      const storageKey = `grid_state_${tableType}`;
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) {
        return undefined;
      }

      try {
        return sanitizeSavedGridState(tableType, JSON.parse(raw));
      } catch {
        return undefined;
      }
    },
    [sanitizeSavedGridState]
  );

  const readSavedPaginationEnabledState = useCallback(
    (tableType: TableType) => {
      if ('loadSavedPaginationEnabledState' in gridStateManager) {
        return (
          gridStateManager as {
            loadSavedPaginationEnabledState: (
              table: TableType
            ) => boolean | undefined;
          }
        ).loadSavedPaginationEnabledState(tableType);
      }

      return undefined;
    },
    []
  );

  const hasSavedGridState = useCallback(
    (tableType: TableType) => {
      if (typeof gridStateManager.hasSavedState === 'function') {
        return gridStateManager.hasSavedState(tableType);
      }
      return Boolean(readSavedGridState(tableType));
    },
    [readSavedGridState]
  );

  const applySavedPaginationState = useCallback(
    (
      api: GridApi,
      tableType: TableType,
      savedState?: GridState,
      fallbackPageSize = 25
    ) => {
      if (!api || api.isDestroyed()) {
        return;
      }

      const savedPaginationEnabled = readSavedPaginationEnabledState(tableType);
      const paginationEnabled = savedPaginationEnabled ?? true;

      api.setGridOption('pagination', paginationEnabled);

      if (paginationEnabled) {
        api.setGridOption(
          'paginationPageSize',
          savedState?.pagination?.pageSize ?? fallbackPageSize
        );
      }
    },
    [readSavedPaginationEnabledState]
  );

  const syncPaginationUiState = useCallback((api: GridApi) => {
    if (!api || api.isDestroyed()) {
      return;
    }

    const isPaginationEnabled = api.getGridOption('pagination');
    const nextPageSize = isPaginationEnabled ? api.paginationGetPageSize() : -1;

    setCurrentPageSize(currentPageSize =>
      currentPageSize === nextPageSize ? currentPageSize : nextPageSize
    );
  }, []);

  // 🎯 Load initial grid state for AG Grid's initialState prop
  // AG Grid Best Practice: Use initialState for initial restore
  const initialGridState = useMemo(() => {
    return readSavedGridState(activeTab as TableType);
  }, [activeTab, readSavedGridState]);

  // 💾 AG Grid Best Practice: Auto-save on state changes
  // Simple onStateUpdated handler - saves to sessionStorage automatically
  const isApplyingTabStateRef = useRef(false);
  const handleStateUpdated = useCallback(() => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    if (isApplyingTabStateRef.current) {
      return;
    }

    const tableType = activeTab as TableType;
    if ('autoSaveGridState' in gridStateManager) {
      (
        gridStateManager as {
          autoSaveGridState: (api: GridApi, table: TableType) => boolean;
        }
      ).autoSaveGridState(gridApi, tableType);
      return;
    }

    const storageKey = `grid_state_${tableType}`;
    sessionStorage.setItem(storageKey, JSON.stringify(gridApi.getState()));
  }, [activeTab, gridApi]);

  // 🔄 Handle tab switching - restore state when activeTab changes
  // Note: initialState only works on initial mount, need setState for runtime changes
  const previousActiveTabRef = useRef<TableType | null>(null);
  useEffect(() => {
    const tableType = activeTab as TableType;

    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    // Initial mount: initialState already restored the structural grid state,
    // but pagination enabled/disabled still needs explicit sync.
    if (previousActiveTabRef.current === null) {
      previousActiveTabRef.current = tableType;
      isApplyingTabStateRef.current = true;
      requestAnimationFrame(() => {
        if (gridApi && !gridApi.isDestroyed()) {
          applySavedPaginationState(
            gridApi,
            tableType,
            initialGridState,
            itemsPerPage
          );
          syncPaginationUiState(gridApi);
        }
        isApplyingTabStateRef.current = false;
      });
      return;
    }

    // Only apply state when tab actually changes
    if (previousActiveTabRef.current !== tableType) {
      previousActiveTabRef.current = tableType;
      isApplyingTabStateRef.current = true;

      gridApi.clearFocusedCell();
      gridApi.clearCellSelection();

      const savedState = readSavedGridState(tableType);

      if (savedState) {
        // Apply state after a brief delay to ensure columnDefs are applied
        requestAnimationFrame(() => {
          if (gridApi && !gridApi.isDestroyed()) {
            gridApi.setState(savedState);
            applySavedPaginationState(
              gridApi,
              tableType,
              savedState,
              itemsPerPage
            );
            syncPaginationUiState(gridApi);
            gridApi.clearFocusedCell();
            gridApi.clearCellSelection();
          }
          isApplyingTabStateRef.current = false;
        });
      } else {
        // No saved state, autosize columns for first-time users
        requestAnimationFrame(() => {
          if (gridApi && !gridApi.isDestroyed()) {
            applySavedPaginationState(
              gridApi,
              tableType,
              undefined,
              itemsPerPage
            );
            syncPaginationUiState(gridApi);
            gridApi.autoSizeAllColumns();
            gridApi.clearFocusedCell();
            gridApi.clearCellSelection();
          }
          isApplyingTabStateRef.current = false;
        });
      }
    }
  }, [
    activeTab,
    applySavedPaginationState,
    gridApi,
    initialGridState,
    itemsPerPage,
    readSavedGridState,
    syncPaginationUiState,
  ]);

  // Column display mode for items (reference columns)
  const {
    displayModeState: columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode: toggleDisplayMode,
  } = useColumnDisplayMode();

  // Transform items based on reference column display modes (name/code)
  // Narrow the transform result to the expected shape so `rowData` can be
  // typed as `(ItemWithExtendedEntities | EntityData)[]` below.
  // Use a generic parameter to strongly type the transform and avoid unsafe casts.
  const itemsForDisplay = useItemsDisplayTransform<ItemWithExtendedEntities>(
    itemsData as ItemWithExtendedEntities[] | undefined,
    columnDisplayModes
  );

  // Determine current data and column definitions based on active tab
  const { rowData, columnDefs } = useMemo(() => {
    let data: (
      | ItemWithExtendedEntities
      | EntityData
      | Supplier
      | Customer
      | Patient
      | Doctor
    )[] = [];
    let columns: (ColDef | ColGroupDef)[] = [];

    if (activeTab === 'items') {
      data = itemsForDisplay || [];
      columns = itemColumnDefs;
    } else if (activeTab === 'suppliers') {
      data = suppliersData;
      columns = supplierColumnDefs;
    } else {
      data = entityData;
      columns = entityColumnDefs;
    }

    return { rowData: data, columnDefs: columns };
  }, [
    activeTab,
    itemsForDisplay,
    suppliersData,
    entityData,
    itemColumnDefs,
    supplierColumnDefs,
    entityColumnDefs,
  ]);

  // Call useDynamicGridHeight at top level (Rules of Hooks compliant)
  const { gridHeight } = useDynamicGridHeight({
    data: rowData,
    currentPageSize,
    viewportOffset: 320,
  });

  // ✅ AG Grid Best Practice: No manual restoration needed!
  // initialState handles it automatically on mount/tab-switch

  // Toggle display mode for items reference columns (items tab only)
  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      toggleDisplayMode(colId);

      // Always autosize the toggled column when display mode changes
      if (gridApi && !gridApi.isDestroyed()) {
        // Use setTimeout to ensure column data transformation is complete
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            // Always autosize the specific column that was toggled
            const column = gridApi.getColumn(colId);
            if (column) {
              gridApi.autoSizeColumns([colId]);
            }
          }
        }, 100);
      }
    },
    [toggleDisplayMode, gridApi]
  );

  // Handle row clicks
  const handleRowClicked = useCallback(
    (
      event: RowClickedEvent<
        | ItemWithExtendedEntities
        | EntityData
        | Supplier
        | Customer
        | Patient
        | Doctor
      >
    ) => {
      // Check if this is a group row - group rows don't have meaningful data for editing
      if (event.node.group) {
        return; // Don't try to edit group rows
      }

      // Only process data rows with valid data
      if (event.data) {
        onRowClick(event.data);
      }
    },
    [onRowClick]
  );

  // Handle grid ready - simple!
  const handleGridReady = useCallback(
    (
      params: GridReadyEvent<
        | ItemWithExtendedEntities
        | EntityData
        | Supplier
        | Customer
        | Patient
        | Doctor
      >
    ) => {
      const tableType = activeTab as TableType;
      const savedState = readSavedGridState(tableType);

      applySavedPaginationState(
        params.api,
        tableType,
        savedState,
        itemsPerPage
      );
      syncPaginationUiState(params.api);
      setGridApi(params.api);

      // Notify parent about grid API
      if (onGridApiReady) {
        onGridApiReady(params.api);
      }

      onGridReady(params);
    },
    [
      activeTab,
      applySavedPaginationState,
      itemsPerPage,
      onGridApiReady,
      onGridReady,
      readSavedGridState,
      syncPaginationUiState,
    ]
  );

  // Handle first data rendered - simple autosize for new grids
  const handleFirstDataRendered = useCallback(
    (event: FirstDataRenderedEvent) => {
      /* c8 ignore start */
      const api = event.api;
      const tableType = activeTab as TableType;

      // Only autosize if no saved state (first time user)
      if (api && !api.isDestroyed() && !hasSavedGridState(tableType)) {
        api.autoSizeAllColumns();
      }
      /* c8 ignore end */
    },
    [activeTab, hasSavedGridState]
  );

  // Track row data updates (for future use if needed)
  const handleRowDataUpdated = useCallback(() => {
    // Simple tracking - can be extended if needed
  }, []);

  // Handle page size changes
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      /* c8 ignore next */
      setCurrentPageSize(newPageSize);

      if (
        gridApi &&
        !gridApi.isDestroyed() &&
        'savePaginationEnabledState' in gridStateManager
      ) {
        (
          gridStateManager as {
            savePaginationEnabledState: (
              api: GridApi,
              table: TableType
            ) => boolean;
          }
        ).savePaginationEnabledState(gridApi, activeTab as TableType);
      }
    },
    [activeTab, gridApi]
  );

  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    const syncCurrentPageSize = () => {
      syncPaginationUiState(gridApi);
    };

    syncCurrentPageSize();
    gridApi.addEventListener('paginationChanged', syncCurrentPageSize);

    return () => {
      if (!gridApi.isDestroyed()) {
        gridApi.removeEventListener('paginationChanged', syncCurrentPageSize);
      }
    };
  }, [gridApi, syncPaginationUiState]);

  // Handle filter changes - notify parent for SearchBar sync
  const handleFilterChanged = useCallback(() => {
    if (onFilterChanged && gridApi && !gridApi.isDestroyed()) {
      const filterModel = gridApi.getFilterModel();
      onFilterChanged(filterModel);
    }
  }, [onFilterChanged, gridApi]);

  // Handle row group opened/closed - scroll child rows into view
  const handleRowGroupOpened = useCallback(
    (
      event: RowGroupOpenedEvent<
        | ItemWithExtendedEntities
        | EntityData
        | Supplier
        | Customer
        | Patient
        | Doctor
      >
    ) => {
      // Only for items tab when row grouping is enabled
      /* c8 ignore next 3 */
      if (activeTab !== 'items' || !isRowGroupingEnabled) {
        return;
      }

      if (event.expanded && gridApi && !gridApi.isDestroyed()) {
        const rowNodeIndex = event.node.rowIndex;

        // Check if rowIndex is valid
        if (rowNodeIndex !== null && rowNodeIndex !== undefined) {
          // Factor in child nodes so we can scroll to correct position
          const childCount = event.node.childrenAfterSort
            ? event.node.childrenAfterSort.length
            : 0;
          const newIndex = rowNodeIndex + childCount;

          // Ensure the expanded group and its children are visible
          gridApi.ensureIndexVisible(newIndex);
        }
      }
    },
    [activeTab, isRowGroupingEnabled, gridApi]
  );

  // Custom menu items for ALL tabs (items + 6 entities)
  // @ts-expect-error - Complex union types causing issues with AG-Grid's GetMainMenuItems interface
  const getMainMenuItems: GetMainMenuItems = useCallback(
    params => {
      if (!params.column) {
        return getPinAndFilterMenuItems(params);
      }

      const colId = params.column.getColId();
      const colDef = params.column.getColDef();

      // Base menu items for all columns
      const baseMenuItems = [
        'sortAscending',
        'sortDescending',
        'separator',
        'pinSubMenu',
      ];

      // Conditionally add Group By only for columns that support it
      const menuWithGroupBy = colDef.enableRowGroup
        ? [...baseMenuItems, 'separator', 'rowGroup']
        : baseMenuItems;

      // Always add autoSizeAll at the end
      const finalMenuItems = [...menuWithGroupBy, 'separator', 'autoSizeAll'];

      // Items tab: Add toggle menu for reference columns
      if (activeTab === 'items' && isReferenceColumn(colId)) {
        const currentMode = columnDisplayModes[colId];
        const nextMode = currentMode === 'name' ? 'code' : 'nama';

        return [
          ...finalMenuItems,
          'separator',
          {
            name: `Tampilkan ${nextMode}`,
            action: () => {
              toggleColumnDisplayMode(colId);
            },
            icon: currentMode === 'name' ? '#' : 'T',
          },
        ];
      }

      // Entity tabs: Standard menu with conditional group by
      /* c8 ignore next */
      return finalMenuItems;
    },
    [activeTab, isReferenceColumn, columnDisplayModes, toggleColumnDisplayMode]
  );

  // Auto group column definition for row grouping with enhanced multi-grouping support
  const autoGroupColumnDef = useMemo(() => {
    if (!isRowGroupingEnabled || activeTab !== 'items') {
      return undefined;
    }

    return {
      // No headerName - let AG Grid use the column name being grouped
      headerName: 'Grup',
      // Remove hardcoded minWidth to allow optimal autosize for group columns
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: {
        suppressCount: false, // Show count in parentheses - AG Grid handles this automatically
        suppressDoubleClickExpand: false,
      },
      sortable: true,
      resizable: true,
      pinned: 'left' as const,
      lockPinned: true,
    };
  }, [isRowGroupingEnabled, activeTab]);

  // Sidebar configuration that considers saved state
  const sideBarConfig = useMemo(() => {
    const tableType = activeTab as TableType;
    const savedState = hasSavedGridState(tableType)
      ? readSavedGridState(tableType)
      : null;

    // Parse saved state to determine if sidebar should be open by default
    let defaultToolPanel = undefined;
    if (savedState) {
      const sideBarState = savedState.sideBar as
        | {
            visible?: boolean;
            openToolPanel?: string;
            openToolPanelId?: string;
          }
        | undefined;
      const openToolPanel =
        sideBarState?.openToolPanel || sideBarState?.openToolPanelId;

      // Check if sidebar was visible and had an open tool panel
      if (sideBarState?.visible && openToolPanel) {
        defaultToolPanel = openToolPanel;
      }
    }

    return {
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          toolPanelParams: {
            suppressRowGroups: true, // Remove Row Groups section
            suppressValues: true, // Remove Values (aggregate) section
          },
        },
        // Note: 'filters-new' removed because Advanced Filter is enabled
        // Column Filters are disabled in favor of programmatic filter via search bar
      ],
      defaultToolPanel, // Set default tool panel based on saved state
    };
  }, [activeTab, hasSavedGridState, readSavedGridState]);

  // No data overlay template
  const overlayNoRowsTemplate = useMemo(() => {
    if (activeTab === 'items') {
      // Items tab: Handle badge mode (targeted search)
      const isBadgeMode =
        search.startsWith('#') &&
        (search.includes(':') || search.includes(' #'));

      if (search && !isBadgeMode) {
        return `<span style="padding: 10px; color: #888;">Tidak ada item dengan nama "${search}"</span>`;
      }
      return '<span style="padding: 10px; color: #888;">Tidak ada data item yang ditemukan</span>';
    } else if (activeTab === 'suppliers') {
      const isBadgeMode =
        search.startsWith('#') &&
        (search.includes(':') || search.includes(' #'));

      /* c8 ignore next */
      if (search && !isBadgeMode) {
        return `<span style="padding: 10px; color: #888;">Tidak ada supplier dengan nama "${search}"</span>`;
      }
      return '<span style="padding: 10px; color: #888;">Tidak ada data supplier yang ditemukan</span>';
    } else {
      // Entity overlay
      const isBadgeMode =
        search.startsWith('#') &&
        (search.includes(':') || search.includes(' #'));

      if (search && !isBadgeMode) {
        return `<span style="padding: 10px; color: #888;">${entityConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"</span>`;
      }
      /* c8 ignore next */
      return `<span style="padding: 10px; color: #888;">${entityConfig?.noDataMessage || 'Tidak ada data'}</span>`;
    }
  }, [activeTab, search, entityConfig]);

  if (isError) {
    return (
      <div className="p-6 text-center text-red-500">
        Error: {error instanceof Error ? error.message : 'Gagal memuat data'}
      </div>
    );
  }

  const shouldShowGridLoading = isLoading && rowData.length === 0;

  return (
    <>
      <div className="relative">
        <DataGrid
          ref={dataGridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          initialState={initialGridState}
          onRowClicked={handleRowClicked}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          onRowDataUpdated={handleRowDataUpdated}
          loading={shouldShowGridLoading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          getMainMenuItems={getMainMenuItems}
          enableFilterHandlers={true}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            headerCheckbox: false,
          }}
          // 💾 AG Grid Best Practice: Auto-save via onStateUpdated
          onStateUpdated={handleStateUpdated}
          // Filter change notification for SearchBar sync
          onFilterChanged={handleFilterChanged}
          rowNumbers={true}
          domLayout="normal"
          style={{
            width: '100%',
            marginTop: '1rem',
            marginBottom: '1rem',
            height: `${gridHeight}px`,
            transition: 'height 0.3s ease-in-out',
          }}
          // AG Grid Built-in Pagination
          pagination={true}
          paginationPageSize={itemsPerPage}
          suppressPaginationPanel={true}
          // Row Grouping configuration (only for items tab)
          rowGroupPanelShow={
            activeTab === 'items' && isRowGroupingEnabled && showGroupPanel
              ? 'always'
              : 'never'
          }
          // Enable multi-grouping and enhanced grouping features
          suppressAggFuncInHeader={false}
          suppressDragLeaveHidesColumns={true}
          groupDefaultExpanded={
            activeTab === 'items' && isRowGroupingEnabled
              ? defaultExpanded // Use default - auto-restore will handle saved state
              : undefined
          }
          autoGroupColumnDef={autoGroupColumnDef}
          groupDisplayType="singleColumn"
          onRowGroupOpened={handleRowGroupOpened}
          // AG Grid Sidebar - use dynamic config based on saved state to prevent flickering
          sideBar={sideBarConfig}
          // Ensure smooth state transitions
          suppressColumnMoveAnimation={true}
          // Enable Advanced Filter API for multi-column OR support
          // Note: This disables Column Filters in favor of programmatic filter control
          enableAdvancedFilter={true}
        />
      </div>

      {/* Custom Pagination Component using AG Grid API */}
      <StandardPagination
        gridApi={gridApi}
        hideFloatingWhenModalOpen={hideFloatingPagination}
        onPageSizeChange={handlePageSizeChange}
      />
    </>
  );
});

export default EntityGrid;
