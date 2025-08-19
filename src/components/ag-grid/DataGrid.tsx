import React, { forwardRef, useCallback } from 'react';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import {
  GetMainMenuItems,
  FirstDataRenderedEvent,
  GetContextMenuItems,
  ColumnMenuTab,
} from 'ag-grid-community';
import { getDefaultGridConfig } from './gridSetup';

// Simple interface - extend AgGridReactProps and add commonly used shortcuts
interface DataGridProps extends AgGridReactProps {
  className?: string;
  style?: React.CSSProperties;
  autoSizeColumns?: string[];
  sizeColumnsToFit?: boolean;
  disableFiltering?: boolean;
  // Keep backward compatibility with old prop name
  mainMenuItems?: GetMainMenuItems;
  getContextMenuItems?: GetContextMenuItems;
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
      getContextMenuItems: customGetContextMenuItems,
      onFirstDataRendered,
      ...props
    },
    ref
  ) => {
    const defaultConfig = getDefaultGridConfig();

    // Modify default config based on props
    const finalConfig = {
      ...defaultConfig,
      // Apply conditional defaultColDef modifications
      defaultColDef: {
        ...defaultConfig.defaultColDef,
        // Add menuTabs only if no custom mainMenuItems provided AND not disabling filtering
        ...(!mainMenuItems &&
          !disableFiltering && {
            menuTabs: [
              'filterMenuTab',
              'generalMenuTab',
              'columnsMenuTab',
            ] as ColumnMenuTab[],
          }),
        // Disable filtering if requested
        ...(disableFiltering && {
          filter: false,
          menuTabs: [] as ColumnMenuTab[],
        }),
      },
      // Override context menu if custom one provided
      ...(customGetContextMenuItems && {
        getContextMenuItems: customGetContextMenuItems,
      }),
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
          // Convert mainMenuItems to correct ag-grid prop name
          {...(mainMenuItems && { getMainMenuItems: mainMenuItems })}
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
