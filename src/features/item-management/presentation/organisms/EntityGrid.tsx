import {
  ColDef,
  ColGroupDef,
  FirstDataRenderedEvent,
  GetMainMenuItems,
  GridApi,
  GridReadyEvent,
  IRowNode,
  RowClickedEvent,
  RowDataUpdatedEvent,
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
// Manual grid state management for auto-restore
import {
  autoSaveGridState,
  hasSavedState,
  restoreScrollPosition,
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
  extends Record<string, unknown>,
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
  itemColumnsToAutoSize?: string[];
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

  // 🎨 Grid restoration loading state (from parent)
  isGridRestoring?: boolean;
  onRestorationComplete?: () => void;
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
  onGridApiReady,
  onFilterChanged,
  itemsPerPage = 20,
  isGridRestoring = false,
  onRestorationComplete,
}) {
  // Single grid API for all tabs
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(itemsPerPage);
  const isInitialRestorationDone = useRef<boolean>(false);

  // 🔒 Guard flag to prevent auto-save during state restoration
  const isRestoringState = useRef<boolean>(false);

  // Debounce timeout ref for auto-save operations
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🎯 Stability tracking to prevent scroll restoration during realtime sync invalidation
  const isStableRef = useRef<boolean>(false);

  // 📊 Track previous data length to detect real data changes vs reference changes
  const previousDataLengthRef = useRef<number>(0);

  // Initialize auto-size prevention based on saved state during component mount
  const shouldPreventAutoSize = useRef<boolean>(
    hasSavedState(activeTab as TableType)
  );

  // Load initial grid state for AG Grid's initialState prop
  // Simple approach: load full state including filters
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

  // Update auto-size prevention when activeTab changes
  useEffect(() => {
    const tableType = activeTab as TableType;
    shouldPreventAutoSize.current = hasSavedState(tableType);
  }, [activeTab]);

  // Auto-restore no longer needs loading state - removed for faster UX

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
    debug: false,
  });

  // Remove premature autosize - let onFirstDataRendered handle it after data ready

  // Auto-save helper function for live state persistence
  const autoSaveState = useCallback(() => {
    // 🔒 Skip auto-save during state restoration to prevent race conditions
    if (isRestoringState.current) {
      console.log('⏸️ Auto-save blocked: restoring state');
      return;
    }

    if (gridApi && !gridApi.isDestroyed()) {
      const tableType = activeTab as TableType;
      console.log('💾 Auto-saving grid state for:', tableType);
      autoSaveGridState(gridApi, tableType);
    }
  }, [gridApi, activeTab]);

  // Debounced auto-save to batch multiple rapid changes
  const debouncedAutoSave = useCallback(() => {
    // 🔒 Skip auto-save during state restoration
    if (isRestoringState.current) {
      return;
    }

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout - increased to 500ms to batch more changes during tab switching
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveState();
      autoSaveTimeoutRef.current = null;
    }, 500);
  }, [autoSaveState]);

  // Tab switching state restore (for runtime tab changes after initial load)
  const previousActiveTabRef = useRef<TableType | null>(null);
  useEffect(() => {
    const tableType = activeTab as TableType;

    // Skip initial load (handled by initialState)
    if (previousActiveTabRef.current === null) {
      previousActiveTabRef.current = tableType;
      return;
    }

    // Only handle tab changes after initial load
    if (
      previousActiveTabRef.current !== tableType &&
      gridApi &&
      !gridApi.isDestroyed()
    ) {
      // Update tab reference immediately
      previousActiveTabRef.current = tableType;

      // 🔒 Lock auto-save during restoration
      isRestoringState.current = true;
      console.log('🔒 Auto-save locked for tab switch to:', tableType);

      // Clear any pending auto-save timeouts from previous tab
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      // Reset restoration flag for new tab
      isInitialRestorationDone.current = false;

      const hasSaved = hasSavedState(tableType);

      if (hasSaved) {
        // Apply state after AG Grid is ready
        const savedState = localStorage.getItem(`grid_state_${tableType}`);
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);

            // Use requestAnimationFrame to ensure AG Grid is ready
            requestAnimationFrame(() => {
              if (gridApi.isDestroyed()) return;

              // Support both old format (GridState) and new format (ExtendedGridState)
              const agGridState =
                'agGridState' in parsedState
                  ? parsedState.agGridState
                  : parsedState;

              // Simple approach: restore full state including filters
              gridApi.setState(agGridState);

              // Only autosize if no column widths were restored
              const hasColumnWidths =
                (agGridState.columnSizing?.columnSizingModel?.length ?? 0) > 0;
              if (!hasColumnWidths) {
                gridApi.autoSizeAllColumns();
              }

              // Sync page size
              const restoredPageSize = gridApi.paginationGetPageSize();
              setCurrentPageSize(restoredPageSize);

              // Restore scroll position after state is applied and grid is ready
              setTimeout(() => {
                if (!gridApi.isDestroyed()) {
                  restoreScrollPosition(gridApi, tableType);
                }
              }, 150);
            });
          } catch (error) {
            console.warn('Failed to restore state on tab switch:', error);
          }
        }
      } else {
        // No saved state, just autosize if not prevented
        if (!shouldPreventAutoSize.current) {
          gridApi.autoSizeAllColumns();
        }
      }

      // Mark as done but keep lock for a bit longer to batch all AG Grid events
      isInitialRestorationDone.current = true;

      // Unlock after a delay to batch all restoration events
      setTimeout(() => {
        isRestoringState.current = false;
        console.log('🔓 Auto-save unlocked after tab switch to:', tableType);

        // 🎨 Notify parent that restoration is complete (hides loading overlay)
        // Add small delay to ensure grid is fully rendered
        setTimeout(() => {
          if (onRestorationComplete) {
            onRestorationComplete();
            console.log('🎨 Restoration complete - notified parent');
          }
        }, 100);
      }, 300);
    }
  }, [activeTab, gridApi, onRestorationComplete]);

  // No artificial loading state - rely on data loading state only

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

  // Handle grid ready - simplified since initialState handles restoration
  const handleGridReady = useCallback(
    (params: GridReadyEvent<ItemWithExtendedEntities | EntityData>) => {
      setGridApi(params.api);

      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      // 🔒 Lock auto-save briefly during initial render to prevent saving partial state
      isRestoringState.current = true;
      console.log('🔒 Auto-save locked on grid ready');

      // 🔓 Unlock after initial state is applied and all events settled
      // Use setTimeout instead of requestAnimationFrame for longer delay
      setTimeout(() => {
        isInitialRestorationDone.current = true;
        isRestoringState.current = false;
        console.log('🔓 Auto-save unlocked after initial render');
      }, 500);

      // Notify parent about grid API
      if (onGridApiReady) {
        onGridApiReady(params.api);
      }

      onGridReady(params);
    },
    [onGridReady, onGridApiReady]
  );

  // Handle first data rendered - simple autosize logic
  const handleFirstDataRendered = useCallback(
    (event: FirstDataRenderedEvent) => {
      // Use API from event to avoid stale closure issue with gridApi state
      const api = event.api;
      if (api && !api.isDestroyed()) {
        const tableType = activeTab as TableType;

        // Only autosize if no saved state and auto-sizing is not prevented
        if (!hasSavedState(tableType) && !shouldPreventAutoSize.current) {
          api.autoSizeAllColumns();
        }

        // Restore scroll position after first data render
        // Use timeout to ensure grid has finished rendering
        setTimeout(() => {
          if (!api.isDestroyed()) {
            restoreScrollPosition(api, tableType);
          }
        }, 150);
      }
    },
    [activeTab]
  );

  // Track data length for realtime sync detection
  const handleRowDataUpdated = useCallback(
    (event: RowDataUpdatedEvent) => {
      // Use API from event to avoid stale closure issue with gridApi state
      const api = event?.api || gridApi;
      if (api && !api.isDestroyed()) {
        const currentDataLength = api.getDisplayedRowCount();

        // Update previous data length for stability tracking
        previousDataLengthRef.current = currentDataLength;
      }
    },
    [gridApi]
  );

  // 🎯 Mark grid as stable after initial load + realtime sync setup delay
  // This prevents scroll restoration during realtime sync query invalidation
  useEffect(() => {
    if (!isLoading && isInitialRestorationDone.current) {
      // Wait for realtime sync to complete its initial setup (3 seconds)
      // useItemsSync has 2s delay, so 3s ensures we're past that
      const stabilityTimer = setTimeout(() => {
        isStableRef.current = true;
        console.log('✅ Grid marked as stable - scroll restoration optimized');
      }, 3000);

      return () => clearTimeout(stabilityTimer);
    }
  }, [isLoading]);

  // Reset stability flag when switching tabs
  useEffect(() => {
    isStableRef.current = false;
    previousDataLengthRef.current = 0;
  }, [activeTab]);

  // Cleanup pending auto-save timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup pending auto-save timeouts when activeTab changes
  useEffect(() => {
    // Clear any pending auto-saves when switching tabs
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [activeTab]);

  // Note: Autosize handled in onFirstDataRendered for better timing

  // Handle column row group changes - autosize when grouping is applied/removed
  const handleColumnRowGroupChanged = useCallback(() => {
    // Only for items tab when row grouping is enabled
    if (activeTab !== 'items' || !isRowGroupingEnabled) {
      return;
    }

    if (gridApi && !gridApi.isDestroyed()) {
      // Only autosize if no saved column widths and auto-sizing is not prevented
      const tableType = activeTab as TableType;
      if (!hasSavedState(tableType) && !shouldPreventAutoSize.current) {
        gridApi.autoSizeAllColumns();
      }

      // Auto-save row grouping state
      autoSaveState();
    }
  }, [activeTab, isRowGroupingEnabled, gridApi, autoSaveState]);

  // ✅ PAGINATION STATE CACHING SYSTEM ✅
  // Auto-saves current page and page size to localStorage for persistence
  // Restores pagination state when switching tabs or reloading

  // Handle pagination changes - now includes state saving for pagination persistence
  const handlePaginationChanged = useCallback(() => {
    // Auto-save pagination state for persistence across sessions and tab switches
    autoSaveState();
  }, [autoSaveState]);

  // Handle page size changes - save state when user changes items per page
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setCurrentPageSize(newPageSize);
      // Use debounced auto-save to batch changes
      debouncedAutoSave();
    },
    [debouncedAutoSave]
  );

  // Live save event handlers - all use debounced auto-save to prevent race conditions
  const handleColumnResized = useCallback(() => {
    // Use debounced auto-save - batches rapid resize events
    debouncedAutoSave();
  }, [debouncedAutoSave]);

  const handleColumnMoved = useCallback(() => {
    // Column moves are typically single actions, but still use debounce for consistency
    debouncedAutoSave();
  }, [debouncedAutoSave]);

  const handleColumnPinned = useCallback(() => {
    // Auto-save when columns are pinned/unpinned
    debouncedAutoSave();
  }, [debouncedAutoSave]);

  const handleColumnVisible = useCallback(() => {
    // Auto-save when column visibility changes
    debouncedAutoSave();
  }, [debouncedAutoSave]);

  const handleSortChanged = useCallback(() => {
    // Auto-save when sorting changes
    debouncedAutoSave();
  }, [debouncedAutoSave]);

  const handleFilterChanged = useCallback(() => {
    // Auto-save when filters change
    debouncedAutoSave();

    // Notify parent of filter changes for SearchBar sync
    if (onFilterChanged && gridApi && !gridApi.isDestroyed()) {
      const filterModel = gridApi.getFilterModel();
      onFilterChanged(filterModel);
    }
  }, [debouncedAutoSave, onFilterChanged, gridApi]);

  const handleDisplayedColumnsChanged = useCallback(() => {
    // Auto-save when displayed columns change (sidebar column panel)
    debouncedAutoSave();
  }, [debouncedAutoSave]);

  // Handle row group opened/closed - scroll child rows into view + autosize
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

        // Autosize after group expansion (only if no saved column widths and auto-sizing is not prevented)
        const tableType = activeTab as TableType;
        if (!hasSavedState(tableType) && !shouldPreventAutoSize.current) {
          gridApi.autoSizeAllColumns();
        }

        // Auto-save row group state
        autoSaveState();
      }
    },
    [activeTab, isRowGroupingEnabled, gridApi, autoSaveState]
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
        'filters-new', // Shortcut untuk New Filters Tool Panel
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
          loading={isLoading || isGridRestoring}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          autoSizeColumns={
            shouldPreventAutoSize.current
              ? []
              : activeTab === 'items'
                ? itemColumnsToAutoSize
                : []
          }
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getMainMenuItems}
          enableFilterHandlers={true}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            headerCheckbox: false,
          }}
          // Live save event handlers
          onColumnResized={handleColumnResized}
          onColumnMoved={handleColumnMoved}
          onColumnPinned={handleColumnPinned}
          onColumnVisible={handleColumnVisible}
          onSortChanged={handleSortChanged}
          onFilterChanged={handleFilterChanged}
          onDisplayedColumnsChanged={handleDisplayedColumnsChanged}
          onColumnRowGroupChanged={handleColumnRowGroupChanged}
          // Auto-restore now handled via restoreGridState function in onFirstDataRendered
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
