import { forwardRef, useRef, useEffect, useImperativeHandle } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  GridReadyEvent,
} from "ag-grid-community";
import { DataGridProps, DataGridRef } from "@/types";

ModuleRegistry.registerModules([AllCommunityModule]);

// Custom theme with secondary color for input focus border
const customTheme = themeQuartz.withParams({
  inputFocusBorder: {
    color: "oklch(59.6% 0.145 163.225)",
    style: "solid",
    width: 1,
  },
  accentColor: "oklch(84.5% 0.143 164.978)",
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
      domLayout = "autoHeight",
      overlayNoRowsTemplate,
      className,
      style,
      autoSizeColumns,
      autoSizeDelay = 200,
      sizeColumnsToFit = false,
      getRowHeight,
      rowClass = "cursor-pointer",
      suppressMovableColumns = true,
      cellSelection = false,
      suppressScrollOnNewData = true,
      suppressAnimationFrame = true,
      animateRows = true,
      loadThemeGoogleFonts = true,
      rowSelection = "single",
      colResizeDefault = "shift",
      isExternalFilterPresent,
      doesExternalFilterPass,
      disableFiltering = false,
    },
    ref,
  ) => {
    const gridRef = useRef<AgGridReact>(null);

    useImperativeHandle(ref, () => ({
      api: gridRef.current?.api || null,
      autoSizeColumns: (columns?: string[]) => {
        if (gridRef.current?.api) {
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
        if (gridRef.current?.api) {
          gridRef.current.api.sizeColumnsToFit();
        }
      },
      onFilterChanged: () => {
        if (gridRef.current?.api) {
          gridRef.current.api.onFilterChanged();
        }
      },
      refreshCells: () => {
        if (gridRef.current?.api) {
          gridRef.current.api.refreshCells();
        }
      },
    }));

    useEffect(() => {
      if (rowData && rowData.length > 0 && gridRef.current) {
        setTimeout(() => {
          if (gridRef.current?.api) {
            if (autoSizeColumns && autoSizeColumns.length > 0) {
              gridRef.current.api.autoSizeColumns(autoSizeColumns);
            } else if (sizeColumnsToFit) {
              gridRef.current.api.sizeColumnsToFit();
            }
          }
          if (onFirstDataRendered) {
            onFirstDataRendered();
          }
        }, autoSizeDelay);
      }
    }, [
      rowData,
      autoSizeColumns,
      sizeColumnsToFit,
      autoSizeDelay,
      onFirstDataRendered,
    ]);

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

    return (
      <div className={className} style={style}>
        <AgGridReact
          ref={gridRef}
          theme={customTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          domLayout={domLayout}
          getRowHeight={getRowHeight}
          defaultColDef={defaultColDef}
          colResizeDefault={colResizeDefault}
          onRowClicked={onRowClicked}
          onGridReady={handleGridReady}
          rowSelection={rowSelection}
          suppressMovableColumns={suppressMovableColumns}
          cellSelection={cellSelection}
          suppressScrollOnNewData={suppressScrollOnNewData}
          suppressAnimationFrame={suppressAnimationFrame}
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
  },
);

DataGrid.displayName = "DataGrid";

export default DataGrid;
export type { DataGridProps, DataGridRef };
