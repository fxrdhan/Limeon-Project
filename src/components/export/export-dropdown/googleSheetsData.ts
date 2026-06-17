import type { ColDef, Column, GridApi, IRowNode } from 'ag-grid-community';
import type { GoogleSheetsExportData } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isVisibleFieldColumn = (
  columnDefinition: unknown
): columnDefinition is ColDef & { field: string } =>
  isRecord(columnDefinition) &&
  typeof columnDefinition.field === 'string' &&
  !columnDefinition.hide;

const getNestedValue = (obj: unknown, path: string): unknown => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[key];
  }

  return current;
};

const toExportString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const collectGridRowData = (gridApi: GridApi) => {
  const allRowData: unknown[] = [];

  try {
    gridApi.forEachNode(node => {
      if (node.data && !node.group) {
        allRowData.push(node.data);
      }
    });
  } catch (error) {
    console.error('Error getting row data:', error);
    throw new Error(
      'Failed to retrieve grid data. Please ensure grid is ready.'
    );
  }

  return allRowData;
};

const getColumnValue = ({
  gridApi,
  columnDefinition,
  rowData,
  rowIndex,
}: {
  gridApi: GridApi;
  columnDefinition: ColDef & { field: string };
  rowData: unknown;
  rowIndex: number;
}) => {
  let value: unknown;

  if (
    columnDefinition.valueGetter &&
    typeof columnDefinition.valueGetter === 'function'
  ) {
    const column = gridApi.getColumn(columnDefinition.field) || null;
    const fallbackColumn: Partial<Column> = {
      getColId: () => columnDefinition.field,
      getColDef: () => columnDefinition,
    };

    try {
      value = columnDefinition.valueGetter({
        data: rowData,
        node: {
          data: rowData,
          id: String(rowIndex),
          group: false,
        } as IRowNode,
        colDef: columnDefinition,
        api: gridApi,
        context: undefined,
        column: (column || fallbackColumn) as Column,
        getValue: (field: string) => getNestedValue(rowData, field),
      });
    } catch (error) {
      console.warn(
        `ValueGetter error for column ${columnDefinition.field}:`,
        error
      );
      value = getNestedValue(rowData, columnDefinition.field);
    }
  } else {
    value = getNestedValue(rowData, columnDefinition.field);
  }

  return toExportString(value);
};

export const processGridDataForGoogleSheets = async (
  gridApi: GridApi
): Promise<GoogleSheetsExportData> => {
  if (gridApi.isDestroyed()) {
    throw new Error('Grid API is not available');
  }

  const columnDefs = gridApi.getColumnDefs() || [];
  const visibleColumns = columnDefs.filter(isVisibleFieldColumn);
  const headers = visibleColumns.map(
    columnDefinition => columnDefinition.headerName || columnDefinition.field
  );
  const allRowData = collectGridRowData(gridApi);
  const processedData = allRowData.map((rowData, rowIndex) =>
    visibleColumns.map(columnDefinition =>
      getColumnValue({
        gridApi,
        columnDefinition,
        rowData,
        rowIndex,
      })
    )
  );

  return { processedData, headers };
};
