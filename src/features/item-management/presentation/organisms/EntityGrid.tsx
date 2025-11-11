import { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  ColDef,
  ColGroupDef,
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
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui';
import { useItemsDisplayTransform } from '@/features/item-management/application/hooks/ui/useItemsDisplayTransform';
// Manual grid state management for auto-restore
import {
  hasSavedState,
  restoreGridState,
  autoSaveGridState,
  type TableType,
} from '@/features/shared/utils/gridStateManager';

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
  itemsPerPage = 20,
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

  // Initialize auto-size prevention based on saved state during component mount
  const shouldPreventAutoSize = useRef<boolean>(
    hasSavedState(activeTab as TableType)
  );

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

  // Dedicated scroll restoration - runs after everything else is completely finished
  const restoreScrollPosition = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      const tableType = activeTab as TableType;
      const savedState = localStorage.getItem(`grid_state_${tableType}`);

      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.scroll && parsedState.scroll.top > 0) {
            const gridContainer = document.querySelector('.ag-body-viewport');
            if (gridContainer) {
              // Immediate scroll restoration
              gridContainer.scrollTop = parsedState.scroll.top;

              // Quick double-check using requestAnimationFrame for smoother performance
              requestAnimationFrame(() => {
                if (gridContainer.scrollTop !== parsedState.scroll.top) {
                  gridContainer.scrollTop = parsedState.scroll.top;
                }
              });
            }
          }
        } catch (error) {
          console.warn('Failed to restore scroll position:', error);
        }
      }
    }
  }, [gridApi, activeTab]);

  // Auto-save helper function for live state persistence
  const autoSaveState = useCallback(() => {
    // 🔒 Skip auto-save during state restoration to prevent race conditions
    if (isRestoringState.current) {
      return;
    }

    if (gridApi && !gridApi.isDestroyed()) {
      const tableType = activeTab as TableType;
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

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveState();
      autoSaveTimeoutRef.current = null;
    }, 150);
  }, [autoSaveState]);

  // Auto-restore now handled via manual restore function in onFirstDataRendered

  // Tab switching state restore (for runtime tab changes after initial load)
  const previousActiveTabRef = useRef<TableType | null>(null);
  useEffect(() => {
    const tableType = activeTab as TableType;

    // Skip initial load (handled by onFirstDataRendered)
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
      // 🔒 Lock auto-save during restoration
      isRestoringState.current = true;

      // Clear any pending auto-save timeouts from previous tab
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      // Reset restoration flag for new tab
      isInitialRestorationDone.current = false;

      const hasSaved = hasSavedState(tableType);

      if (hasSaved) {
        restoreGridState(gridApi, tableType);

        // Sync local page size state with restored pagination state
        setTimeout(() => {
          if (!gridApi.isDestroyed()) {
            const restoredPageSize = gridApi.paginationGetPageSize();
            setCurrentPageSize(restoredPageSize);
            isInitialRestorationDone.current = true;
            // 🔓 Unlock auto-save after restoration complete
            isRestoringState.current = false;
          }
        }, 200); // Increased to 200ms to ensure all events settled
      } else {
        // No saved state, just autosize if not prevented
        if (!shouldPreventAutoSize.current) {
          gridApi.autoSizeAllColumns();
        }
        isInitialRestorationDone.current = true;
        // 🔓 Unlock auto-save immediately if no restoration needed
        isRestoringState.current = false;
      }

      previousActiveTabRef.current = tableType;
    }
  }, [activeTab, gridApi]);

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

  // Handle grid ready - setup and early auto-restore to prevent flicker
  const handleGridReady = useCallback(
    (params: GridReadyEvent<ItemWithExtendedEntities | EntityData>) => {
      setGridApi(params.api);

      // Reset restoration flag for new grid instance
      isInitialRestorationDone.current = false;

      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      // Initialize the current tab reference for tab switching logic
      previousActiveTabRef.current = activeTab as TableType;

      // EARLY auto-restore to prevent default state flickering
      const tableType = activeTab as TableType;
      const hasSaved = hasSavedState(tableType);

      if (hasSaved) {
        // 🔒 Lock auto-save during restoration
        isRestoringState.current = true;

        // Apply immediately - no delay needed since grid is ready but no data rendered yet
        restoreGridState(params.api, tableType);

        // IMMEDIATELY restore scroll position to prevent flickering
        const savedState = localStorage.getItem(`grid_state_${tableType}`);

        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (parsedState.scroll && parsedState.scroll.top > 0) {
              // Apply scroll position BEFORE data renders to prevent flicker
              requestAnimationFrame(() => {
                const gridContainer =
                  document.querySelector('.ag-body-viewport');
                if (gridContainer) {
                  gridContainer.scrollTop = parsedState.scroll.top;
                }
              });
            }
          } catch (error) {
            console.warn(
              'Failed to preemptively restore scroll position:',
              error
            );
          }
        }

        // Sync local page size state with restored pagination state
        setTimeout(() => {
          if (!params.api.isDestroyed()) {
            const restoredPageSize = params.api.paginationGetPageSize();
            setCurrentPageSize(restoredPageSize);
            // Mark initial restoration as done
            isInitialRestorationDone.current = true;
            // 🔓 Unlock auto-save after restoration complete
            isRestoringState.current = false;
          }
        }, 200); // Increased to 200ms to ensure all events settled
      } else {
        // No saved state, mark as done immediately
        isInitialRestorationDone.current = true;
        isRestoringState.current = false;
      }

      // Notify parent about grid API
      if (onGridApiReady) {
        onGridApiReady(params.api);
      }

      onGridReady(params);
    },
    [onGridReady, onGridApiReady, activeTab]
  );

  // Handle first data rendered - only autosize if no saved state (auto-restore moved to onGridReady)
  const handleFirstDataRendered = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      const tableType = activeTab as TableType;

      // Re-apply saved state if exists and initial restoration not yet complete
      if (hasSavedState(tableType) && !isInitialRestorationDone.current) {
        // Re-apply filter model after data is ready for proper filter restoration
        const savedState = localStorage.getItem(`grid_state_${tableType}`);
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);

            // Critical fix: Re-apply filter model after data is loaded
            if (parsedState.filter?.filterModel) {
              requestAnimationFrame(() => {
                if (!gridApi.isDestroyed()) {
                  gridApi.setFilterModel(parsedState.filter.filterModel);
                }
              });
            }
          } catch (error) {
            console.warn('Failed to re-apply filter model:', error);
          }
        }

        // Apply scroll position as final adjustment
        requestAnimationFrame(() => {
          if (!gridApi.isDestroyed()) {
            restoreScrollPosition();
            isInitialRestorationDone.current = true;
          }
        });
      } else if (!shouldPreventAutoSize.current) {
        // Only autosize if no saved state and auto-sizing is not prevented
        gridApi.autoSizeAllColumns();
        isInitialRestorationDone.current = true;
      }
    }
  }, [gridApi, activeTab, restoreScrollPosition]);

  // Backup scroll restoration when row data updates (double protection)
  const handleRowDataUpdated = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      const tableType = activeTab as TableType;

      // Trigger dedicated scroll restoration after data loading completes
      if (hasSavedState(tableType)) {
        // Quick restore since data is cached
        requestAnimationFrame(() => {
          restoreScrollPosition();
        });
      }
    }
  }, [gridApi, activeTab, restoreScrollPosition]);

  // Trigger scroll restoration when loading completes
  useEffect(() => {
    if (
      !isLoading &&
      gridApi &&
      !gridApi.isDestroyed() &&
      isInitialRestorationDone.current
    ) {
      const tableType = activeTab as TableType;
      if (hasSavedState(tableType)) {
        // Quick final restoration since data is cached
        requestAnimationFrame(() => {
          restoreScrollPosition();
        });
      }
    }
  }, [isLoading, gridApi, activeTab, restoreScrollPosition]);

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
  }, [debouncedAutoSave]);

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
          onRowDataUpdated={handleRowDataUpdated}
          loading={isLoading}
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
