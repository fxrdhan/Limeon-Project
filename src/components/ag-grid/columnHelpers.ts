import { ColDef, ColumnMenuTab, GetMainMenuItems } from 'ag-grid-community';
import { ColumnConfig } from '@/types';

export type { ColumnConfig };

export const createTextColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth, // Only use explicit minWidth, no default fallback
  maxWidth: config.maxWidth,
  flex: config.flex,
  cellStyle: config.cellStyle || {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ...(config.tooltipField && { tooltipField: config.tooltipField }),
  // Only include valueGetter/valueFormatter if explicitly provided
  ...(config.valueGetter !== undefined && { valueGetter: config.valueGetter }),
  ...(config.valueFormatter !== undefined && {
    valueFormatter: config.valueFormatter,
  }),
  // Remove default sortable, resizable - let saved state and explicit config control these
  ...(config.sortable !== undefined && { sortable: config.sortable }),
  ...(config.resizable !== undefined && { resizable: config.resizable }),
});

export const createWrapTextColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth, // Only use explicit minWidth, no default fallback
  maxWidth: config.maxWidth,
  cellStyle: config.cellStyle || {
    overflow: 'visible',
    textOverflow: 'unset',
    whiteSpace: 'normal',
  },
  // Only include valueGetter/valueFormatter if explicitly provided
  ...(config.valueGetter !== undefined && { valueGetter: config.valueGetter }),
  ...(config.valueFormatter !== undefined && {
    valueFormatter: config.valueFormatter,
  }),
  // Remove default sortable, resizable - let saved state and explicit config control these
  ...(config.sortable !== undefined && { sortable: config.sortable }),
  ...(config.resizable !== undefined && { resizable: config.resizable }),
});

export const createNumberColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth, // Only use explicit minWidth, no default fallback
  maxWidth: config.maxWidth,
  cellStyle: config.cellStyle || { textAlign: 'right' },
  // Only include valueGetter/valueFormatter if explicitly provided
  ...(config.valueGetter !== undefined && { valueGetter: config.valueGetter }),
  ...(config.valueFormatter !== undefined && {
    valueFormatter: config.valueFormatter,
  }),
  // Remove default sortable, resizable - let saved state and explicit config control these
  ...(config.sortable !== undefined && { sortable: config.sortable }),
  ...(config.resizable !== undefined && { resizable: config.resizable }),
});

export const createCurrencyColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth, // Only use explicit minWidth, no default fallback
  maxWidth: config.maxWidth,
  cellStyle: config.cellStyle || { textAlign: 'right' },
  valueFormatter:
    config.valueFormatter ||
    (params =>
      params.value?.toLocaleString('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) || ''),
  // Only include valueGetter if explicitly provided (undefined valueGetter can break Advanced Filter)
  ...(config.valueGetter !== undefined && { valueGetter: config.valueGetter }),
  // Remove default sortable, resizable - let saved state and explicit config control these
  ...(config.sortable !== undefined && { sortable: config.sortable }),
  ...(config.resizable !== undefined && { resizable: config.resizable }),
});

export const createCenterAlignColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth, // Only use explicit minWidth, no default fallback
  maxWidth: config.maxWidth, // Support maxWidth to prevent excessive expansion
  cellStyle: config.cellStyle || { textAlign: 'center' },
  // Only include valueGetter/valueFormatter if explicitly provided
  ...(config.valueGetter !== undefined && { valueGetter: config.valueGetter }),
  ...(config.valueFormatter !== undefined && {
    valueFormatter: config.valueFormatter,
  }),
  // Remove default sortable, resizable - let saved state and explicit config control these
  ...(config.sortable !== undefined && { sortable: config.sortable }),
  ...(config.resizable !== undefined && { resizable: config.resizable }),
});

export const formatCurrency = (value: number): string => {
  return (
    value?.toLocaleString('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) || ''
  );
};

export const formatBaseCurrency = (value: number): string => {
  return (
    value?.toLocaleString('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) || ''
  );
};

export const createMatchScoreColumn = (
  config: Omit<ColumnConfig, 'field'> & {
    getMatchScore: (data: unknown) => number;
  }
): ColDef => ({
  field: 'matchScore',
  headerName: config.headerName,
  width: config.minWidth, // Only use explicit width, no default fallback
  sort: 'desc',
  filter: false,
  // Remove default sortable, resizable - let saved state and explicit config control these
  ...(config.sortable !== undefined && { sortable: config.sortable }),
  ...(config.resizable !== undefined && { resizable: config.resizable }),
  valueGetter: params => {
    return config.getMatchScore(params.data);
  },
  cellStyle: { textAlign: 'center' },
});

/**
 * Column Menu Tabs Configuration Helper
 * Available menu tabs for AG Grid columns
 */
export const COLUMN_MENU_TABS = {
  FILTER: 'filterMenuTab' as ColumnMenuTab, // Filter options (text filter, date filter, etc.)
  GENERAL: 'generalMenuTab' as ColumnMenuTab, // Sort, Pin, Autosize options
  COLUMNS: 'columnsMenuTab' as ColumnMenuTab, // Choose/Reset Columns visibility
} as const;

/**
 * Pre-configured menu tab combinations for common use cases
 */
export const MENU_PRESETS = {
  // All menu options (default)
  ALL: [
    COLUMN_MENU_TABS.FILTER,
    COLUMN_MENU_TABS.GENERAL,
    COLUMN_MENU_TABS.COLUMNS,
  ] as ColumnMenuTab[],

  // Only sort and filter
  BASIC: [COLUMN_MENU_TABS.FILTER, COLUMN_MENU_TABS.GENERAL] as ColumnMenuTab[],

  // Only sort options (no filter, no column chooser)
  SORT_ONLY: [COLUMN_MENU_TABS.GENERAL] as ColumnMenuTab[],

  // Only filter options
  FILTER_ONLY: [COLUMN_MENU_TABS.FILTER] as ColumnMenuTab[],

  // Only column visibility controls
  COLUMNS_ONLY: [COLUMN_MENU_TABS.COLUMNS] as ColumnMenuTab[],

  // No menu at all
  NONE: [] as ColumnMenuTab[],
} as const;

/**
 * Main Menu Items Helpers - for granular control over individual menu items
 */

/**
 * Show only Pin Column options
 */
export const getPinOnlyMenuItems: GetMainMenuItems = () => {
  return [
    'pinSubMenu', // Pin Column submenu with Left/Right/No Pin options
  ];
};

/**
 * Show Pin Column and Filter options with Sorting and conditional Group By
 */
// @ts-expect-error - AG-Grid typing issues with conditional menu items
export const getPinAndFilterMenuItems: GetMainMenuItems = params => {
  const baseItems = [
    'sortAscending',
    'sortDescending',
    'separator',
    'columnFilter',
    'separator',
    'pinSubMenu',
  ];

  // Only add Group By if column supports it
  const colDef = params.column?.getColDef();
  if (colDef?.enableRowGroup) {
    return [...baseItems, 'separator', 'rowGroup'];
  }

  return baseItems;
};

/**
 * Show only Sort options
 */
export const getSortOnlyMenuItems: GetMainMenuItems = () => {
  return ['sortAscending', 'sortDescending'];
};

/**
 * Show only Autosize options
 */
export const getAutosizeOnlyMenuItems: GetMainMenuItems = () => {
  return ['autoSizeThis', 'autoSizeAll'];
};

/**
 * Show Pin + Sort options
 */
export const getPinAndSortMenuItems: GetMainMenuItems = () => {
  return ['pinSubMenu', 'separator', 'sortAscending', 'sortDescending'];
};

/**
 * Show Pin + Autosize options
 */
export const getPinAndAutosizeMenuItems: GetMainMenuItems = () => {
  return ['pinSubMenu', 'separator', 'autoSizeThis', 'autoSizeAll'];
};

/**
 * Available menu item keys for reference:
 * - 'sortAscending'
 * - 'sortDescending'
 * - 'pinSubMenu' (contains pinLeft, pinRight, clearPinned)
 * - 'autoSizeThis'
 * - 'autoSizeAll'
 * - 'resetColumns'
 * - 'separator'
 */
