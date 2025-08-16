import { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  ColumnPinnedEvent,
  ColumnMovedEvent,
  ColDef,
  IRowNode,
  GetMainMenuItems,
  RowGroupOpenedEvent,
} from 'ag-grid-community';

// Components
import {
  DataGrid,
  DataGridRef,
  getPinAndFilterMenuItems,
} from '@/components/ag-grid';
import { StandardPagination } from '../atoms';

// Hooks
import { useDynamicGridHeight } from '@/hooks/useDynamicGridHeight';
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui';
import {
  useEntityColumnVisibilityState,
  useColumnVisibilityState,
} from '@/features/item-management/application/hooks/ui/useEntityColumnVisibilityState';

// Types
import type { Item } from '@/types/database';
import {
  EntityType,
  EntityData,
} from '../../application/hooks/collections/useEntityManager';

// Extended entity types with code property for display mode
type EntityWithCode = {
  name: string;
  code?: string | null;
};

// Extended Item interface for column display mode transformations
interface ItemWithExtendedEntities
  extends Omit<
    Item,
    'category' | 'type' | 'package' | 'dosage' | 'manufacturer'
  > {
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

interface MasterDataGridProps {
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
  itemColumnDefs?: ColDef[];
  itemColumnsToAutoSize?: string[];
  isRowGroupingEnabled?: boolean;
  defaultExpanded?: number;
  showGroupPanel?: boolean;

  // Entity config
  entityConfig?: EntityConfig | null;
  entityColumnDefs?: ColDef[];

  // Handlers
  onRowClick: (data: ItemWithExtendedEntities | EntityData) => void;
  onGridReady: (params: GridReadyEvent) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (node: IRowNode) => boolean;
  onColumnPinned?: (event: ColumnPinnedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
  onColumnVisible?: () => void;
  onGridApiReady?: (api: GridApi | null) => void; // Add grid API callback

  // Pagination (for items)
  currentPage?: number;
  itemsPerPage?: number;
}

const MasterDataGrid = memo<MasterDataGridProps>(function MasterDataGrid({
  activeTab,
  itemsData = [],
  entityData = [],
  isLoading,
  isError,
  error,
  search,
  itemColumnDefs = [],
  itemColumnsToAutoSize = [],
  isRowGroupingEnabled = false,
  defaultExpanded = 1,
  showGroupPanel = true,
  entityConfig,
  entityColumnDefs = [],
  onRowClick,
  onGridReady,
  isExternalFilterPresent,
  doesExternalFilterPass,
  onColumnPinned,
  onColumnMoved,
  onColumnVisible,
  onGridApiReady,
  currentPage = 1,
  itemsPerPage = 10,
}) {
  // Single grid API for all tabs
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(itemsPerPage);

  // State loading coordination for both items and entities
  const [isStateLoading, setIsStateLoading] = useState(false);

  // Column visibility state management for all tabs
  const itemsColumnVisibilityManager = useColumnVisibilityState({
    tableType: 'items',
    enabled: activeTab === 'items',
    gridApi,
  });

  // Entity column visibility state management (only for entity tabs)
  const entityColumnVisibilityManager = useEntityColumnVisibilityState({
    entityType:
      activeTab !== 'items' ? (activeTab as EntityType) : 'categories',
    enabled: activeTab !== 'items',
    gridApi,
  });

  // Column display mode for items (reference columns)
  const {
    displayModeState: columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode: toggleDisplayMode,
  } = useColumnDisplayMode();

  // Determine current data and column definitions based on active tab
  const { rowData, columnDefs } = useMemo(() => {
    let data: (ItemWithExtendedEntities | EntityData)[] = [];
    let columns: ColDef[] = [];

    if (activeTab === 'items') {
      data = itemsData || [];
      columns = itemColumnDefs;

      // Apply column display mode transformations for items
      data = (itemsData || []).map(item => {
        const modifiedItem: ItemWithExtendedEntities = { ...item };

        // Apply display mode transformations
        Object.entries(columnDisplayModes).forEach(([colId, mode]) => {
          if (mode === 'code') {
            switch (colId) {
              case 'manufacturer.name':
                if (item.manufacturer?.code) {
                  modifiedItem.manufacturer = {
                    name: item.manufacturer.code,
                    code: item.manufacturer.code,
                  };
                }
                break;
              case 'category.name':
                // Type guard: Check if category has code property
                if (
                  item.category &&
                  'code' in item.category &&
                  typeof item.category.code === 'string'
                ) {
                  modifiedItem.category = {
                    name: item.category.code,
                    code: item.category.code,
                  };
                }
                break;
              case 'type.name':
                // Type guard: Check if type has code property
                if (
                  item.type &&
                  'code' in item.type &&
                  typeof item.type.code === 'string'
                ) {
                  modifiedItem.type = {
                    name: item.type.code,
                    code: item.type.code,
                  };
                }
                break;
              case 'package.name':
                // Type guard: Check if package has code property
                if (
                  item.package &&
                  'code' in item.package &&
                  typeof item.package.code === 'string'
                ) {
                  modifiedItem.package = {
                    name: item.package.code,
                    code: item.package.code,
                  };
                }
                break;
              case 'dosage.name':
                // Type guard: Check if dosage has code property and exists
                if (
                  item.dosage &&
                  'code' in item.dosage &&
                  typeof item.dosage.code === 'string'
                ) {
                  modifiedItem.dosage = {
                    name: item.dosage.code,
                    code: item.dosage.code,
                  };
                }
                break;
            }
          }
        });

        return modifiedItem;
      });
    } else {
      data = entityData;
      columns = entityColumnDefs;
    }

    return { rowData: data, columnDefs: columns };
  }, [
    activeTab,
    itemsData,
    entityData,
    itemColumnDefs,
    entityColumnDefs,
    columnDisplayModes,
  ]);

  // Call useDynamicGridHeight at top level (Rules of Hooks compliant)
  const { gridHeight } = useDynamicGridHeight({
    data: rowData,
    currentPageSize,
    viewportOffset: 320,
    debug: false,
  });

  // Remove premature autosize - let onFirstDataRendered handle it after data ready

  // Apply column visibility state for ALL tabs (items + 6 entities) and autosize
  useEffect(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      setIsStateLoading(true);

      // Entity tables need longer delay for proper state application and column calculation
      const delay = activeTab !== 'items' ? 250 : 150;

      const timer = setTimeout(() => {
        if (!gridApi.isDestroyed()) {
          // Apply appropriate column visibility state based on active tab
          if (
            activeTab === 'items' &&
            itemsColumnVisibilityManager.initialState
          ) {
            gridApi.setState(itemsColumnVisibilityManager.initialState);
          } else if (
            activeTab !== 'items' &&
            entityColumnVisibilityManager.initialState
          ) {
            gridApi.setState(entityColumnVisibilityManager.initialState);
          }
        }
        // Autosize after column visibility state is applied (not premature)
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        }, 100);
        setIsStateLoading(false);
      }, delay);

      return () => {
        clearTimeout(timer);
        setIsStateLoading(false);
      };
    } else {
      setIsStateLoading(false);
    }
  }, [
    gridApi,
    activeTab,
    itemsColumnVisibilityManager.initialState,
    entityColumnVisibilityManager.initialState,
  ]);

  // Show loading state during ALL tab transitions - no premature autosize
  useEffect(() => {
    setIsStateLoading(true);

    // Entity tables need longer loading time for proper rendering
    const loadingDuration = activeTab !== 'items' ? 350 : 200;

    // Only show loading - autosize will happen after grid ready and data loaded
    const loadingTimer = setTimeout(() => {
      setIsStateLoading(false);
    }, loadingDuration);

    return () => clearTimeout(loadingTimer);
  }, [activeTab]);

  // Toggle display mode for items reference columns (items tab only)
  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      toggleDisplayMode(colId);

      // Auto trigger autosize after toggle (items tab only - reference columns feature)
      setTimeout(() => {
        if (gridApi) {
          gridApi.autoSizeAllColumns();
        }
      }, 50);
    },
    [toggleDisplayMode, gridApi]
  );

  // Handle row clicks
  const handleRowClicked = useCallback(
    (event: RowClickedEvent) => {
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

  // Handle grid ready - setup only, real autosize happens in onFirstDataRendered
  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);

      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      // Set initial page if needed (for items)
      if (activeTab === 'items' && currentPage > 1) {
        params.api.paginationGoToPage(currentPage - 1);
      }

      // No autosize here - will be done optimally in onFirstDataRendered after data loads

      // Notify parent about grid API
      if (onGridApiReady) {
        onGridApiReady(params.api);
      }

      onGridReady(params);
    },
    [onGridReady, activeTab, currentPage, onGridApiReady]
  );

  // Handle first data rendered - MANDATORY autosize when data ready
  const handleFirstDataRendered = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      // WAJIB autosize setiap kali data ready untuk ditampilkan
      if (activeTab !== 'items') {
        // Entity tables: Immediate autosize when data rendered
        gridApi.autoSizeAllColumns();

        // Second autosize with delay for perfect measurement
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        }, 200);

        // Final insurance autosize for stubborn columns
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        }, 500);
      } else {
        // Items: Immediate autosize when data rendered
        gridApi.autoSizeAllColumns();

        // Backup autosize for reliability
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        }, 100);
      }
    }
  }, [gridApi, activeTab]);

  // Fallback autosize - ensures autosize even if onFirstDataRendered doesn't trigger
  useEffect(() => {
    if (gridApi && !gridApi.isDestroyed() && rowData.length > 0) {
      // Fallback autosize after data changes (with delay to avoid premature)
      const fallbackTimer = setTimeout(
        () => {
          if (!gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        },
        activeTab !== 'items' ? 1000 : 300
      );

      return () => clearTimeout(fallbackTimer);
    }
  }, [gridApi, rowData, activeTab]);

  // Handle column row group changes - autosize when grouping is applied/removed
  const handleColumnRowGroupChanged = useCallback(() => {
    // Only for items tab when row grouping is enabled
    if (activeTab !== 'items' || !isRowGroupingEnabled) {
      return;
    }

    if (gridApi && !gridApi.isDestroyed()) {
      // Autosize after grouping structure changes
      setTimeout(() => {
        if (!gridApi.isDestroyed()) {
          gridApi.autoSizeAllColumns();
        }
      }, 200); // Longer delay for group structure changes
    }
  }, [activeTab, isRowGroupingEnabled, gridApi]);

  // Handle pagination changes - autosize when new rows appear
  const handlePaginationChanged = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      // Autosize when pagination changes (new rows with potentially different content widths)
      setTimeout(() => {
        if (!gridApi.isDestroyed()) {
          gridApi.autoSizeAllColumns();
        }
      }, 150); // Delay to let new rows render first
    }
  }, [gridApi]);

  // Handle row group opened/closed - scroll child rows into view + autosize
  const handleRowGroupOpened = useCallback(
    (event: RowGroupOpenedEvent) => {
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

        // Autosize after group expansion to accommodate new visible rows
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            gridApi.autoSizeAllColumns();
          }
        }, 100);
      }
    },
    [activeTab, isRowGroupingEnabled, gridApi]
  );

  // Custom menu items for ALL tabs (items + 6 entities)
  const getMainMenuItems: GetMainMenuItems = useCallback(
    params => {
      if (!params.column) {
        return getPinAndFilterMenuItems(params);
      }

      const colId = params.column.getColId();
      const baseMenuItems = [
        'columnFilter',
        'separator',
        'pinSubMenu',
        'separator',
        'autoSizeAll', // Available for ALL tabs now
      ] as const;

      // Items tab: Add toggle menu for reference columns
      if (activeTab === 'items' && isReferenceColumn(colId)) {
        const currentMode = columnDisplayModes[colId];
        const nextMode = currentMode === 'name' ? 'kode' : 'nama';

        return [
          ...baseMenuItems,
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

      // Entity tabs: Standard menu with autosize
      return [...baseMenuItems];
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

  // No data overlay template
  const overlayNoRowsTemplate = useMemo(() => {
    if (activeTab === 'items') {
      if (search) {
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
      <div className="text-center p-6 text-red-500">
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
          onRowClicked={handleRowClicked}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          loading={isLoading || isStateLoading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          autoSizeColumns={activeTab === 'items' ? itemColumnsToAutoSize : []}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getMainMenuItems}
          onColumnPinned={onColumnPinned}
          onColumnMoved={onColumnMoved}
          onColumnVisible={onColumnVisible}
          onColumnRowGroupChanged={handleColumnRowGroupChanged}
          // Column visibility state management for all tabs
          initialState={
            activeTab === 'items'
              ? itemsColumnVisibilityManager.initialState
              : entityColumnVisibilityManager.initialState
          }
          onStateUpdated={
            activeTab === 'items'
              ? itemsColumnVisibilityManager.onStateUpdated
              : entityColumnVisibilityManager.onStateUpdated
          }
          onGridPreDestroyed={
            activeTab === 'items'
              ? itemsColumnVisibilityManager.onGridPreDestroyed
              : entityColumnVisibilityManager.onGridPreDestroyed
          }
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
          onPaginationChanged={handlePaginationChanged}
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
              ? defaultExpanded
              : undefined
          }
          autoGroupColumnDef={autoGroupColumnDef}
          groupDisplayType="singleColumn"
          onRowGroupOpened={handleRowGroupOpened}
          // AG Grid Sidebar - closed by default for cleaner UI
          sideBar={{
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
            ],
            // No defaultToolPanel = sidebar closed by default
          }}
          // Ensure smooth state transitions
          suppressColumnMoveAnimation={true}
        />
      </div>

      {/* Custom Pagination Component using AG Grid API */}
      <StandardPagination
        gridApi={gridApi}
        onPageSizeChange={setCurrentPageSize}
      />
    </>
  );
});

export default MasterDataGrid;
