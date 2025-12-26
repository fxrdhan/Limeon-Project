import {
  ColDef,
  ColGroupDef,
  FirstDataRenderedEvent,
  GetMainMenuItems,
  GridApi,
  GridReadyEvent,
  GridState,
  IRowNode,
  RowClickedEvent,
  RowGroupOpenedEvent,
} from 'ag-grid-community';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Components
import {
  DataGrid,
  DataGridRef,
  getPinAndFilterMenuItems,
} from '@/components/ag-grid';
import { StandardPagination } from '../atoms';

// Hooks
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui';
import { useItemsDisplayTransform } from '@/features/item-management/application/hooks/ui/useItemsDisplayTransform';
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
// Simple grid state utilities
import {
  hasSavedState,
  type TableType,
} from '@/features/shared/utils/gridStateManager';

// Types
import type { Item } from '@/types/database';
import {
  EntityData,
  EntityType,
} from '../../application/hooks/collections/useEntityManager';

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

type MasterDataType = 'items' | EntityType;

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
  entityData?: EntityData[];

  // States
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown;
  search: string;

  // Grid config
  itemColumnDefs?: (ColDef | ColGroupDef)[];
  isRowGroupingEnabled?: boolean;
  defaultExpanded?: number;
  showGroupPanel?: boolean;

  // Entity config
  entityConfig?: EntityConfig | null;
  entityColumnDefs?: (ColDef | ColGroupDef)[];

  // Handlers
  onRowClick: (data: ItemWithExtendedEntities | EntityData) => void;
  onGridReady: (
    params: GridReadyEvent<ItemWithExtendedEntities | EntityData>
  ) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (
    node: IRowNode<ItemWithExtendedEntities | EntityData>
  ) => boolean;
  onGridApiReady?: (api: GridApi | null) => void; // Add grid API callback
  onFilterChanged?: (
    filterModel: import('ag-grid-community').FilterModel
  ) => void; // Filter sync callback

  // Pagination (for items)
  itemsPerPage?: number;
}

const EntityGrid = memo<EntityGridProps>(function EntityGrid({
  activeTab,
  itemsData = [],
  entityData = [],
  isLoading,
  isError,
  error,
  search,
  itemColumnDefs = [],
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
  itemsPerPage = 20,
}) {
  // Single grid API for all tabs
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(itemsPerPage);

  // 🎯 Load initial grid state for AG Grid's initialState prop
  // AG Grid Best Practice: Use initialState for initial restore
  const initialGridState = useMemo(() => {
    const tableType = activeTab as TableType;
    const savedState = localStorage.getItem(`grid_state_${tableType}`);

    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (error) {
        console.warn('Failed to parse initial grid state:', error);
        return undefined;
      }
    }
    return undefined;
  }, [activeTab]);

  // 💾 AG Grid Best Practice: Auto-save on state changes
  // Simple onStateUpdated handler - saves to localStorage automatically
  const handleStateUpdated = useCallback(
    (event: { state: GridState }) => {
      const tableType = activeTab as TableType;
      try {
        localStorage.setItem(
          `grid_state_${tableType}`,
          JSON.stringify(event.state)
        );
      } catch (error) {
        console.error('Failed to save grid state:', error);
      }
    },
    [activeTab]
  );

  // 🔄 Handle tab switching - restore state when activeTab changes
  // Note: initialState only works on initial mount, need setState for runtime changes
  const previousActiveTabRef = useRef<TableType | null>(null);
  useEffect(() => {
    const tableType = activeTab as TableType;

    // Skip initial mount (initialState handles it)
    if (previousActiveTabRef.current === null) {
      previousActiveTabRef.current = tableType;
      return;
    }

    // Only apply state when tab actually changes
    if (previousActiveTabRef.current !== tableType && gridApi) {
      previousActiveTabRef.current = tableType;

      const savedState = localStorage.getItem(`grid_state_${tableType}`);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          // Apply state after a brief delay to ensure columnDefs are applied
          requestAnimationFrame(() => {
            if (gridApi && !gridApi.isDestroyed()) {
              gridApi.setState(parsedState);
            }
          });
        } catch (error) {
          console.error('Failed to restore grid state:', error);
        }
      } else {
        // No saved state, autosize columns for first-time users
        requestAnimationFrame(() => {
          if (gridApi && !gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        });
      }
    }
  }, [activeTab, gridApi]);

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
    let data: (ItemWithExtendedEntities | EntityData)[] = [];
    let columns: (ColDef | ColGroupDef)[] = [];

    if (activeTab === 'items') {
      data = itemsForDisplay || [];
      columns = itemColumnDefs;
    } else {
      data = entityData;
      columns = entityColumnDefs;
    }

    return { rowData: data, columnDefs: columns };
  }, [
    activeTab,
    itemsForDisplay,
    entityData,
    itemColumnDefs,
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
    (event: RowClickedEvent<ItemWithExtendedEntities | EntityData>) => {
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
    (params: GridReadyEvent<ItemWithExtendedEntities | EntityData>) => {
      setGridApi(params.api);

      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      // Notify parent about grid API
      if (onGridApiReady) {
        onGridApiReady(params.api);
      }

      onGridReady(params);
    },
    [onGridReady, onGridApiReady]
  );

  // Handle first data rendered - simple autosize for new grids
  const handleFirstDataRendered = useCallback(
    (event: FirstDataRenderedEvent) => {
      const api = event.api;
      const tableType = activeTab as TableType;

      // Only autosize if no saved state (first time user)
      if (api && !api.isDestroyed() && !hasSavedState(tableType)) {
        api.autoSizeAllColumns();
      }
    },
    [activeTab]
  );

  // Track row data updates (for future use if needed)
  const handleRowDataUpdated = useCallback(() => {
    // Simple tracking - can be extended if needed
  }, []);

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setCurrentPageSize(newPageSize);
  }, []);

  // Handle filter changes - notify parent for SearchBar sync
  const handleFilterChanged = useCallback(() => {
    if (onFilterChanged && gridApi && !gridApi.isDestroyed()) {
      const filterModel = gridApi.getFilterModel();
      onFilterChanged(filterModel);
    }
  }, [onFilterChanged, gridApi]);

  // Handle row group opened/closed - scroll child rows into view
  const handleRowGroupOpened = useCallback(
    (event: RowGroupOpenedEvent<ItemWithExtendedEntities | EntityData>) => {
      // Only for items tab when row grouping is enabled
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
    const savedState = hasSavedState(tableType)
      ? localStorage.getItem(`grid_state_${tableType}`)
      : null;

    // Parse saved state to determine if sidebar should be open by default
    let defaultToolPanel = undefined;
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Check if sidebar was visible and had an open tool panel
        if (
          parsedState.sideBar?.visible &&
          parsedState.sideBar?.openToolPanelId
        ) {
          defaultToolPanel = parsedState.sideBar.openToolPanelId;
        }
      } catch (e) {
        console.warn('Failed to parse saved state for sidebar config', e);
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
  }, [activeTab]);

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
    } else {
      // Entity overlay
      const isBadgeMode =
        search.startsWith('#') &&
        (search.includes(':') || search.includes(' #'));

      if (search && !isBadgeMode) {
        return `<span style="padding: 10px; color: #888;">${entityConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"</span>`;
      }
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
          loading={isLoading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getMainMenuItems}
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
        onPageSizeChange={handlePageSizeChange}
      />
    </>
  );
});

export default EntityGrid;

// Backward compatibility alias
export { EntityGrid as MasterDataGrid };
