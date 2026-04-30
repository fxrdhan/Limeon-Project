import React, { forwardRef, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { type AgGridReactProps } from 'ag-grid-react';
import type {
  ColDef,
  ColGroupDef,
  ColumnResizedEvent,
  FirstDataRenderedEvent,
  GetContextMenuItems,
  GridApi,
  GridState,
  RowDataUpdatedEvent,
  ColumnMenuTab,
} from 'ag-grid-community';
import { getDefaultGridConfig } from './gridSetup';

const MANUAL_COLUMN_RESIZE_PREFIX = 'ag_grid_manual_column_resize_';

const hashString = (value: string): string => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
};

const getColumnSignature = (
  defs?: (ColDef | ColGroupDef)[]
): string | undefined => {
  if (!defs) return undefined;

  const flatten = (items: (ColDef | ColGroupDef)[]): string[] =>
    items.flatMap(def => {
      if ('children' in def && def.children) {
        return flatten(def.children as (ColDef | ColGroupDef)[]);
      }

      const column = def as ColDef;
      return [
        String(column.colId ?? column.field ?? column.headerName ?? 'column'),
      ];
    });

  return flatten(defs).join('|');
};

const readManualResizeState = (key?: string): boolean => {
  if (!key || typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const writeManualResizeState = (key?: string): void => {
  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, 'true');
  } catch {
    // ignore storage failures
  }
};

const hasInitialColumnSizing = (state: unknown): boolean => {
  const gridState = state as Partial<GridState> | undefined;
  return (gridState?.columnSizing?.columnSizingModel?.length ?? 0) > 0;
};

// Simple interface - extend AgGridReactProps and add commonly used shortcuts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataGridProps extends AgGridReactProps<any> {
  className?: string;
  style?: React.CSSProperties;
  autoSizeColumns?: string[];
  sizeColumnsToFit?: boolean;
  autoSizeOnFirstRender?: boolean;
  autoSizeStorageKey?: string;
  disableFiltering?: boolean;
  getContextMenuItems?: GetContextMenuItems;
}

const DataGrid = forwardRef<AgGridReact, DataGridProps>(
  (
    {
      className,
      style,
      autoSizeColumns,
      sizeColumnsToFit,
      autoSizeOnFirstRender = true,
      autoSizeStorageKey,
      disableFiltering,
      getMainMenuItems,
      getContextMenuItems: customGetContextMenuItems,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<AgGridReact | null>(null);
    const defaultAutoSizedKeyRef = useRef<string | null>(null);
    const defaultConfig = getDefaultGridConfig();
    const normalizedColumnDefs = useMemo(() => {
      const stripFlex = (
        defs?: (ColDef | ColGroupDef)[]
      ): (ColDef | ColGroupDef)[] | undefined => {
        if (!defs) return defs;
        return defs.map(def => {
          if ('children' in def && def.children) {
            return {
              ...def,
              children: stripFlex(def.children as (ColDef | ColGroupDef)[]),
            } as ColGroupDef;
          }

          const rest = { ...(def as ColDef) };
          delete rest.flex;
          return rest;
        });
      };

      return stripFlex(
        props.columnDefs as (ColDef | ColGroupDef)[] | undefined
      );
    }, [props.columnDefs]);
    const columnSignature = useMemo(
      () =>
        getColumnSignature(
          props.columnDefs as (ColDef | ColGroupDef)[] | undefined
        ),
      [props.columnDefs]
    );
    const manualResizeStorageKey = useMemo(() => {
      if (autoSizeStorageKey) {
        return `${MANUAL_COLUMN_RESIZE_PREFIX}${autoSizeStorageKey}`;
      }

      if (!columnSignature) return undefined;

      const path =
        typeof window === 'undefined'
          ? 'server'
          : `${window.location.pathname}${window.location.search}`;
      return `${MANUAL_COLUMN_RESIZE_PREFIX}${hashString(`${path}:${columnSignature}`)}`;
    }, [autoSizeStorageKey, columnSignature]);
    const hasManualResize = readManualResizeState(manualResizeStorageKey);
    const hasExplicitSizing =
      Boolean(autoSizeColumns?.length) ||
      Boolean(sizeColumnsToFit) ||
      Boolean(props.autoSizeStrategy);
    const shouldDefaultAutoSize =
      autoSizeOnFirstRender &&
      !hasExplicitSizing &&
      !hasInitialColumnSizing(props.initialState) &&
      !hasManualResize;
    const defaultAutoSizeKey = `${manualResizeStorageKey ?? 'grid'}:${columnSignature ?? 'columns'}`;

    // Modify default config based on props
    const finalConfig = {
      ...defaultConfig,
      ...(shouldDefaultAutoSize && {
        autoSizeStrategy: {
          type: 'fitCellContents' as const,
        },
      }),
      // Apply conditional defaultColDef modifications
      defaultColDef: {
        ...defaultConfig.defaultColDef,
        // Add menuTabs only if no custom getMainMenuItems provided AND not disabling filtering
        ...(!getMainMenuItems &&
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
    const setGridRef = useCallback(
      (instance: AgGridReact | null) => {
        internalRef.current = instance;

        if (typeof ref === 'function') {
          ref(instance);
          return;
        }

        if (ref) {
          (ref as React.MutableRefObject<AgGridReact | null>).current =
            instance;
        }
      },
      [ref]
    );
    const runDefaultAutoSize = useCallback(
      (api: GridApi) => {
        if (!shouldDefaultAutoSize || api.isDestroyed()) return;
        if (defaultAutoSizedKeyRef.current === defaultAutoSizeKey) return;

        defaultAutoSizedKeyRef.current = defaultAutoSizeKey;
        requestAnimationFrame(() => {
          if (!api.isDestroyed()) {
            api.autoSizeAllColumns();
          }
        });
      },
      [defaultAutoSizeKey, shouldDefaultAutoSize]
    );

    const handleFirstDataRendered = useCallback(
      (event: FirstDataRenderedEvent) => {
        const api = event.api ?? internalRef.current?.api;
        if (api && !api.isDestroyed()) {
          if (autoSizeColumns?.length) {
            api.autoSizeColumns(autoSizeColumns);
          } else if (sizeColumnsToFit) {
            api.sizeColumnsToFit();
          } else {
            runDefaultAutoSize(api);
          }
        }
        props.onFirstDataRendered?.(event);
      },
      [autoSizeColumns, runDefaultAutoSize, sizeColumnsToFit, props]
    );
    const handleRowDataUpdated = useCallback(
      (event: RowDataUpdatedEvent) => {
        runDefaultAutoSize(event.api);
        props.onRowDataUpdated?.(event);
      },
      [props, runDefaultAutoSize]
    );
    const handleColumnResized = useCallback(
      (event: ColumnResizedEvent) => {
        if (event.finished && event.source === 'uiColumnResized') {
          writeManualResizeState(manualResizeStorageKey);
        }

        props.onColumnResized?.(event);
      },
      [manualResizeStorageKey, props]
    );

    return (
      <div className={className} style={style}>
        <AgGridReact
          ref={setGridRef}
          {...finalConfig}
          {...props}
          columnDefs={normalizedColumnDefs ?? props.columnDefs}
          {...(getMainMenuItems && { getMainMenuItems })}
          onFirstDataRendered={handleFirstDataRendered}
          onRowDataUpdated={handleRowDataUpdated}
          onColumnResized={handleColumnResized}
        />
      </div>
    );
  }
);

DataGrid.displayName = 'DataGrid';

export default DataGrid;
export type { DataGridProps };
