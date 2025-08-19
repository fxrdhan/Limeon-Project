import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  themeQuartz,
  GridReadyEvent,
  GetRowIdParams,
  RowDataTransaction,
  ModuleRegistry,
  ColumnMenuTab,
  GetContextMenuItems,
  GridPreDestroyedEvent,
  ClientSideRowModelModule,
  PaginationModule,
  TextFilterModule,
  NumberFilterModule,
  RowStyleModule,
  ExternalFilterModule,
  TooltipModule,
  CellStyleModule,
  HighlightChangesModule,
  GridStateModule,
  EventApiModule,
  ColumnApiModule,
  ColumnAutoSizeModule,
} from 'ag-grid-community';
import {
  LicenseManager,
  RowSelectionModule,
  RowGroupingModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  MenuModule,
  CellSelectionModule,
  RowNumbersModule,
  RowGroupingPanelModule,
  MultiFilterModule,
} from 'ag-grid-enterprise';
import { DataGridProps, DataGridRef } from '@/types';

// Register only required AG Grid modules (selective import for smaller bundle)
ModuleRegistry.registerModules([
  // Community modules
  ClientSideRowModelModule,
  PaginationModule,
  TextFilterModule,
  NumberFilterModule,
  RowStyleModule,
  ExternalFilterModule,
  TooltipModule,
  CellStyleModule,
  HighlightChangesModule,
  GridStateModule,
  EventApiModule,
  ColumnApiModule,
  ColumnAutoSizeModule,

  // Enterprise modules (only what we need)
  RowSelectionModule,
  RowGroupingModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  MenuModule,
  CellSelectionModule,
  RowNumbersModule,
  RowGroupingPanelModule,
  MultiFilterModule,
]);

// Configure AG Grid Enterprise License
LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-090576}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{31 August 2025}____[v3]_[0102]_MTc1NjU5NDgwMDAwMA==055771d37eabf862ce4b35dbb0d2a1df'
);

// Custom theme with secondary color for input focus border
const customTheme = themeQuartz.withParams({
  inputFocusBorder: {
    color: 'oklch(59.6% 0.145 163.225)',
    style: 'solid',
    width: 1,
  },
  accentColor: 'oklch(76.5% 0.177 163.223/0.7)',
});

const DataGrid = forwardRef<DataGridRef, DataGridProps>(
  (
    {
      rowData,
      columnDefs,
      loading = false,
      onRowClicked,
      onGridReady,
      onFirstDataRendered,
      domLayout = 'autoHeight',
      overlayNoRowsTemplate,
      className,
      style,
      autoSizeColumns,
      sizeColumnsToFit = false,
      getRowHeight,
      rowClass = 'cursor-pointer',
      suppressMovableColumns = false,
      cellSelection = false,
      suppressScrollOnNewData = true,
      suppressAnimationFrame = false,
      animateRows = true,
      loadThemeGoogleFonts = true,
      rowSelection,
      colResizeDefault = 'shift',
      isExternalFilterPresent,
      doesExternalFilterPass,
      disableFiltering = false,
      columnMenuTabs,
      mainMenuItems,
      getContextMenuItems: customGetContextMenuItems,
      onColumnPinned,
      onColumnMoved,
      onColumnResized,
      onColumnRowGroupChanged,
      onRowGroupOpened,
      onColumnVisible,
      onSortChanged,
      onFilterChanged,
      onDisplayedColumnsChanged,
      rowNumbers = false,
      suppressHeaderFilterButton = false,
      // Pagination props
      pagination = false,
      paginationPageSize = 100,
      paginationPageSizeSelector,
      paginationAutoPageSize = false,
      suppressPaginationPanel = false,
      onPaginationChanged,
      // Row grouping props
      rowGroupPanelShow = 'never',
      groupDefaultExpanded,
      suppressGroupChangesColumnVisibility = false,
      autoGroupColumnDef,
      groupDisplayType = 'singleColumn',
      // Side bar props
      sideBar,
      // Grid state management props
      initialState,
      onStateUpdated,
      onGridPreDestroyed,
      suppressColumnMoveAnimation = false,
      // Enhanced grouping props for multi-grouping
      suppressAggFuncInHeader = false,
      suppressDragLeaveHidesColumns = true,
    },
    ref
  ) => {
    const gridRef = useRef<AgGridReact>(null);

    useImperativeHandle(ref, () => ({
      api: gridRef.current?.api || null,
      autoSizeColumns: (columns?: string[]) => {
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          if (columns && columns.length > 0) {
            gridRef.current.api.autoSizeColumns(columns);
          } else if (autoSizeColumns && autoSizeColumns.length > 0) {
            gridRef.current.api.autoSizeColumns(autoSizeColumns);
          } else if (sizeColumnsToFit) {
            gridRef.current.api.sizeColumnsToFit();
          }
        }
      },
      sizeColumnsToFit: () => {
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          gridRef.current.api.sizeColumnsToFit();
        }
      },
      onFilterChanged: () => {
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          gridRef.current.api.onFilterChanged();
        }
      },
      refreshCells: () => {
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          gridRef.current.api.refreshCells();
        }
      },
      // Transaction-based methods for efficient updates
      applyTransaction: (transaction: RowDataTransaction) => {
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          return gridRef.current.api.applyTransaction(transaction);
        }
        return null;
      },
      applyTransactionAsync: (transaction: RowDataTransaction) => {
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          return gridRef.current.api.applyTransactionAsync(transaction);
        }
        return null;
      },
    }));

    // Handle first data rendered - this is the right place for autoSize
    const handleFirstDataRendered = useCallback(() => {
      if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
        if (autoSizeColumns && autoSizeColumns.length > 0) {
          gridRef.current.api.autoSizeColumns(autoSizeColumns);
        } else if (sizeColumnsToFit) {
          gridRef.current.api.sizeColumnsToFit();
        }
      }
      if (onFirstDataRendered) {
        onFirstDataRendered();
      }
    }, [autoSizeColumns, sizeColumnsToFit, onFirstDataRendered]);

    // Safer defaultColDef - only essential properties that don't conflict with saved state
    const defaultColDef: ColDef = {
      // Essential properties that should always apply
      cellDataType: false,
      enableCellChangeFlash: true,

      // Conditional properties - only apply if not conflicting with saved state features
      ...(disableFiltering && { filter: false }),
      ...(suppressHeaderFilterButton && { suppressHeaderFilterButton: true }),

      // Menu configuration - conditional based on filtering
      ...(!disableFiltering && {
        menuTabs: columnMenuTabs || [
          'filterMenuTab' as ColumnMenuTab, // Filter options
          'generalMenuTab' as ColumnMenuTab, // Sort, Pin, Autosize, etc.
          'columnsMenuTab' as ColumnMenuTab, // Choose/Reset Columns
        ],
      }),

      ...(mainMenuItems && { mainMenuItems }),

      // Remove hardcoded sortable, resizable - let column definitions and saved state control these
      // Remove hardcoded filter - let individual columns and saved state control filtering
      // Remove hardcoded minWidth - allow optimal autosize
    };

    const handleGridReady = (event: GridReadyEvent) => {
      if (onGridReady) {
        onGridReady(event);
      }
    };

    const handleGridPreDestroyed = useCallback(
      (event: GridPreDestroyedEvent) => {
        // Clean up any references or listeners here if needed
        // This is called just before the grid is destroyed
        if (onGridPreDestroyed) {
          onGridPreDestroyed(event);
        }
      },
      [onGridPreDestroyed]
    );

    // Convert deprecated string values to new object format
    const normalizedRowSelection = useMemo(() => {
      if (!rowSelection) return undefined;
      if (typeof rowSelection === 'string') {
        return {
          mode:
            rowSelection === 'single'
              ? ('singleRow' as const)
              : ('multiRow' as const),
        };
      }
      return rowSelection;
    }, [rowSelection]);

    // Memoized getRowId function for better performance
    const getRowId = useCallback((params: GetRowIdParams) => {
      return params.data?.id || params.data?.kode || params.data?.code;
    }, []);

    // Context menu configuration - only show copy menu items by default
    const getContextMenuItems: GetContextMenuItems = useCallback(
      params => {
        // Use custom implementation if provided, otherwise use default copy-only menu
        if (customGetContextMenuItems) {
          return customGetContextMenuItems(params);
        }

        return ['copy', 'copyWithHeaders', 'copyWithGroupHeaders'];
      },
      [customGetContextMenuItems]
    );

    return (
      <div className={className} style={style}>
        <AgGridReact
          ref={gridRef}
          theme={customTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          domLayout={domLayout}
          getRowHeight={getRowHeight}
          getRowId={getRowId}
          defaultColDef={defaultColDef}
          colResizeDefault={colResizeDefault}
          onRowClicked={onRowClicked}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          onGridPreDestroyed={handleGridPreDestroyed}
          {...(initialState && { initialState })}
          {...(normalizedRowSelection && {
            rowSelection: normalizedRowSelection,
          })}
          suppressMovableColumns={suppressMovableColumns}
          cellSelection={cellSelection}
          suppressScrollOnNewData={suppressScrollOnNewData}
          suppressAnimationFrame={suppressAnimationFrame}
          suppressRowTransform={true}
          suppressColumnMoveAnimation={suppressColumnMoveAnimation}
          maintainColumnOrder={true}
          loading={loading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          rowClass={rowClass}
          animateRows={animateRows}
          loadThemeGoogleFonts={loadThemeGoogleFonts}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onColumnPinned={onColumnPinned}
          onColumnMoved={onColumnMoved}
          onColumnResized={onColumnResized}
          onColumnRowGroupChanged={onColumnRowGroupChanged}
          onRowGroupOpened={onRowGroupOpened}
          onColumnVisible={onColumnVisible}
          onSortChanged={onSortChanged}
          onFilterChanged={onFilterChanged}
          onDisplayedColumnsChanged={onDisplayedColumnsChanged}
          rowNumbers={rowNumbers}
          getContextMenuItems={getContextMenuItems}
          // Pagination props
          pagination={pagination}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={paginationPageSizeSelector}
          paginationAutoPageSize={paginationAutoPageSize}
          suppressPaginationPanel={suppressPaginationPanel}
          onPaginationChanged={onPaginationChanged}
          // Row grouping props
          rowGroupPanelShow={rowGroupPanelShow}
          groupDefaultExpanded={groupDefaultExpanded}
          suppressGroupChangesColumnVisibility={
            suppressGroupChangesColumnVisibility
          }
          autoGroupColumnDef={autoGroupColumnDef}
          groupDisplayType={groupDisplayType}
          // Side bar props
          sideBar={sideBar}
          // Enhanced grouping props for multi-grouping
          suppressAggFuncInHeader={suppressAggFuncInHeader}
          suppressDragLeaveHidesColumns={suppressDragLeaveHidesColumns}
          // Grid state management props
          onStateUpdated={onStateUpdated}
        />
      </div>
    );
  }
);

DataGrid.displayName = 'DataGrid';

export default DataGrid;
export type { DataGridProps, DataGridRef };
