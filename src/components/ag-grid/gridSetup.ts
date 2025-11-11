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
} from 'ag-grid-community';
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
  cellDataType: false,
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

// Base grid configuration with sensible defaults
export const getDefaultGridConfig = () => ({
  theme: defaultTheme,
  defaultColDef,
  getRowId,
  getContextMenuItems,
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
