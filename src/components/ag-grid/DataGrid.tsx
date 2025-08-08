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
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  GridReadyEvent,
  GetRowIdParams,
  RowDataTransaction,
} from 'ag-grid-community';
import { DataGridProps, DataGridRef } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

// Custom theme with secondary color for input focus border
const customTheme = themeQuartz.withParams({
  inputFocusBorder: {
    color: 'oklch(59.6% 0.145 163.225)',
    style: 'solid',
    width: 1,
  },
  accentColor: 'oklch(84.5% 0.143 164.978)',
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
      suppressMovableColumns = true,
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

    const defaultColDef: ColDef = {
      sortable: true,
      resizable: true,
      filter: disableFiltering ? false : true,
      menuTabs: disableFiltering ? [] : undefined,
      cellDataType: false,
      minWidth: 80,
    };

    const handleGridReady = (event: GridReadyEvent) => {
      if (onGridReady) {
        onGridReady(event);
      }
    };

    const handleGridPreDestroyed = useCallback(() => {
      // Clean up any references or listeners here if needed
      // This is called just before the grid is destroyed
    }, []);

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
          {...(normalizedRowSelection && {
            rowSelection: normalizedRowSelection,
          })}
          suppressMovableColumns={suppressMovableColumns}
          cellSelection={cellSelection}
          suppressScrollOnNewData={suppressScrollOnNewData}
          suppressAnimationFrame={suppressAnimationFrame}
          suppressRowTransform={true}
          loading={loading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          rowClass={rowClass}
          animateRows={animateRows}
          loadThemeGoogleFonts={loadThemeGoogleFonts}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
        />
      </div>
    );
  }
);

DataGrid.displayName = 'DataGrid';

export default DataGrid;
export type { DataGridProps, DataGridRef };
