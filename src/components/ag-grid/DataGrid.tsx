import React, { forwardRef, useCallback } from 'react';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import { GetMainMenuItems, FirstDataRenderedEvent } from 'ag-grid-community';
import { getDefaultGridConfig } from './gridSetup';

// Simple interface - extend AgGridReactProps and add commonly used shortcuts
interface DataGridProps extends AgGridReactProps {
  className?: string;
  style?: React.CSSProperties;
  autoSizeColumns?: string[];
  sizeColumnsToFit?: boolean;
  disableFiltering?: boolean;
  mainMenuItems?: GetMainMenuItems;
}

const DataGrid = forwardRef<AgGridReact, DataGridProps>(
  (
    {
      className,
      style,
      autoSizeColumns,
      sizeColumnsToFit,
      disableFiltering,
      mainMenuItems,
      onFirstDataRendered,
      ...props
    },
    ref
  ) => {
    const defaultConfig = getDefaultGridConfig();

    // Modify default config based on props
    const finalConfig = {
      ...defaultConfig,
      ...(disableFiltering && {
        defaultColDef: {
          ...defaultConfig.defaultColDef,
          filter: false,
          menuTabs: [],
        },
      }),
      ...(mainMenuItems && { mainMenuItems }),
    };

    const handleFirstDataRendered = useCallback(() => {
      const gridRef = ref as React.RefObject<AgGridReact>;
      const api = gridRef?.current?.api;
      if (api && !api.isDestroyed()) {
        if (autoSizeColumns?.length) {
          api.autoSizeColumns(autoSizeColumns);
        } else if (sizeColumnsToFit) {
          api.sizeColumnsToFit();
        }
      }
      onFirstDataRendered?.({} as FirstDataRenderedEvent);
    }, [autoSizeColumns, sizeColumnsToFit, onFirstDataRendered, ref]);

    return (
      <div className={className} style={style}>
        <AgGridReact
          ref={ref}
          {...finalConfig}
          {...props}
          onFirstDataRendered={handleFirstDataRendered}
        />
      </div>
    );
  }
);

DataGrid.displayName = 'DataGrid';

// For backward compatibility - DataGridRef is now just AgGridReact
export type DataGridRef = AgGridReact;

export default DataGrid;
export type { DataGridProps };
