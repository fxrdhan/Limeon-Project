import { forwardRef, useRef, useEffect, useImperativeHandle } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  IRowNode,
} from "ag-grid-community";

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

export interface DataGridProps {
  rowData: unknown[];
  columnDefs: ColDef[];
  loading?: boolean;
  onRowClicked?: (event: RowClickedEvent) => void;
  onGridReady?: (event: GridReadyEvent) => void;
  onFirstDataRendered?: () => void;
  domLayout?: "normal" | "autoHeight" | "print";
  overlayNoRowsTemplate?: string;
  className?: string;
  style?: React.CSSProperties;
  autoSizeColumns?: string[];
  autoSizeDelay?: number;
  sizeColumnsToFit?: boolean;
  getRowHeight?: () => number | undefined;
  rowClass?: string;
  suppressMovableColumns?: boolean;
  cellSelection?: boolean;
  suppressScrollOnNewData?: boolean;
  suppressAnimationFrame?: boolean;
  animateRows?: boolean;
  loadThemeGoogleFonts?: boolean;
  rowSelection?: "single" | "multiple";
  colResizeDefault?: "shift" | undefined;
  autoHeightForSmallTables?: boolean;
  isExternalFilterPresent?: () => boolean;
  doesExternalFilterPass?: (node: IRowNode) => boolean;
}

export interface DataGridRef {
  api: GridApi | null;
  autoSizeColumns: (columns?: string[]) => void;
  sizeColumnsToFit: () => void;
  onFilterChanged: () => void;
  refreshCells: () => void;
}

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
      autoHeightForSmallTables = false,
      isExternalFilterPresent,
      doesExternalFilterPass,
    },
    ref,
  ) => {
    const gridRef = useRef<AgGridReact>(null);

    // Calculate dynamic height properties when autoHeightForSmallTables is enabled
    const isSmallTable = autoHeightForSmallTables && rowData.length <= 3;
    const dynamicDomLayout = isSmallTable ? "normal" : domLayout;
    const dynamicGetRowHeight = isSmallTable ? () => 42 : getRowHeight;
    const dynamicStyle = isSmallTable
      ? {
          ...style,
          height: `${95 + rowData.length * 42}px`,
        }
      : style;

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
      filter: true,
      cellDataType: false,
      minWidth: 80,
    };

    const handleGridReady = (event: GridReadyEvent) => {
      if (onGridReady) {
        onGridReady(event);
      }
    };

    return (
      <div className={className} style={dynamicStyle}>
        <AgGridReact
          ref={gridRef}
          theme={customTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          domLayout={dynamicDomLayout}
          getRowHeight={dynamicGetRowHeight}
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
