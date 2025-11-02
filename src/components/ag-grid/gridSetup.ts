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

  // Configure license
  LicenseManager.setLicenseKey(
    '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-090576}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{31 August 2025}____[v3]_[0102]_MTc1NjU5NDgwMDAwMA==055771d37eabf862ce4b35dbb0d2a1df'
  );
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
  fontSize: 15, // Increased from default 14px
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
