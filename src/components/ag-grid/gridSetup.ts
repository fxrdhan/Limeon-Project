import {
  ModuleRegistry,
  themeQuartz,
  ColDef,
  GetRowIdParams,
  GetContextMenuItems,
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
  CsvExportModule,
  ValidationModule,
  RowApiModule,
  LocaleModule,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_EN } from '@ag-grid-community/locale';
import {
  LicenseManager,
  RowSelectionModule,
  RowGroupingModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  NewFiltersToolPanelModule,
  SetFilterModule,
  MenuModule,
  CellSelectionModule,
  RowNumbersModule,
  RowGroupingPanelModule,
  MultiFilterModule,
  ExcelExportModule,
  AdvancedFilterModule,
} from 'ag-grid-enterprise';

// Setup AG Grid once
export const setupAgGrid = () => {
  // Register modules
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
    CsvExportModule,
    ValidationModule,
    RowApiModule,
    LocaleModule,
    // Enterprise modules
    RowSelectionModule,
    RowGroupingModule,
    ColumnsToolPanelModule,
    FiltersToolPanelModule,
    NewFiltersToolPanelModule,
    SetFilterModule,
    MenuModule,
    CellSelectionModule,
    RowNumbersModule,
    RowGroupingPanelModule,
    MultiFilterModule,
    ExcelExportModule,
    AdvancedFilterModule,
  ]);

  // Configure license from environment variable
  const licenseKey = import.meta.env.VITE_AG_GRID_LICENSE_KEY;
  if (licenseKey) {
    LicenseManager.setLicenseKey(licenseKey);
  } else {
    console.warn(
      'AG Grid Enterprise license key not found. Please set VITE_AG_GRID_LICENSE_KEY in your .env file.'
    );
  }
};

// Default theme - uses CSS variables from @theme (App.scss)
export const defaultTheme = themeQuartz.withParams({
  inputFocusBorder: {
    color: 'oklch(59.6% 0.145 163.225)',
    style: 'solid',
    width: 1,
  },
  accentColor: 'oklch(76.5% 0.177 163.223/0.7)',
  fontFamily: 'var(--font-sans)', // Reference CSS variable from @theme
  fontSize: 13, // Compact size for better space efficiency
  // Note: fontWeight is not supported in theme params, use CSS instead
});

// Default column definition
export const defaultColDef: ColDef = {
  // Note: cellDataType removed to allow Advanced Filter to detect column types properly
  // When cellDataType: false, AG Grid's type system is disabled and Advanced Filter cannot
  // determine numeric/date columns. Individual columns can still set cellDataType explicitly.
  enableCellChangeFlash: true,
  sortable: true, // Enable sorting by default
  resizable: true, // Enable column resizing by default
  // menuTabs removed - let individual grids control this
  // This allows mainMenuItems to work properly
};

// Default getRowId function
export const getRowId = (params: GetRowIdParams) => {
  return params.data?.id || params.data?.kode || params.data?.code;
};

// Default context menu
export const getContextMenuItems: GetContextMenuItems = () => {
  return ['copy', 'copyWithHeaders', 'copyWithGroupHeaders'];
};

// Custom locale text with readable Advanced Filter operators
export const localeText = {
  ...AG_GRID_LOCALE_EN,
  // Override Advanced Filter numeric operators with readable text
  advancedFilterEquals: 'Equals',
  advancedFilterNotEqual: 'Not equal',
  advancedFilterGreaterThan: 'Greater than',
  advancedFilterGreaterThanOrEqual: 'Greater than or equal',
  advancedFilterLessThan: 'Less than',
  advancedFilterLessThanOrEqual: 'Less than or equal',
  // Keep text filter operators readable
  advancedFilterTextEquals: 'Equals',
  advancedFilterTextNotEqual: 'Not equal',
  advancedFilterContains: 'Contains',
  advancedFilterNotContains: 'Not contains',
  advancedFilterStartsWith: 'Starts with',
  advancedFilterEndsWith: 'Ends with',
  advancedFilterBlank: 'Is blank',
  advancedFilterNotBlank: 'Is not blank',
};

// Base grid configuration with sensible defaults
export const getDefaultGridConfig = () => ({
  theme: defaultTheme,
  defaultColDef,
  getRowId,
  getContextMenuItems,
  localeText, // Include locale text for proper operator display in Advanced Filter
  domLayout: 'autoHeight' as const,
  rowClass: 'cursor-pointer',
  suppressScrollOnNewData: true,
  suppressRowTransform: true,
  maintainColumnOrder: true,
  animateRows: true,
  loadThemeGoogleFonts: false, // Disabled - using Quicksand from Fontshare instead
});

// Initialize AG Grid setup
setupAgGrid();
