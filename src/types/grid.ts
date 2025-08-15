import {
  RowClickedEvent,
  IRowNode,
  GridApi,
  CellStyle,
  ValueFormatterParams,
  ValueGetterParams,
  GridReadyEvent,
  ColDef,
  RowDataTransaction,
  ColumnMenuTab,
  GetMainMenuItems,
  GetContextMenuItems,
  ColumnPinnedEvent,
  ColumnMovedEvent,
  PaginationChangedEvent,
  ColumnRowGroupChangedEvent,
  RowGroupOpenedEvent,
} from 'ag-grid-community';

export interface ColumnConfig {
  field: string;
  headerName: string;
  minWidth?: number;
  maxWidth?: number; // Add maxWidth support to prevent excessive column expansion
  flex?: number;
  sortable?: boolean;
  resizable?: boolean;
  cellStyle?: CellStyle;
  valueGetter?: (params: ValueGetterParams) => unknown;
  valueFormatter?: (params: ValueFormatterParams) => string;
  tooltipField?: string;
}

export interface DataGridProps {
  rowData: unknown[];
  columnDefs: ColDef[];
  loading?: boolean;
  onRowClicked?: (event: RowClickedEvent) => void;
  onGridReady?: (event: GridReadyEvent) => void;
  onFirstDataRendered?: () => void;
  domLayout?: 'normal' | 'autoHeight' | 'print';
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
  rowSelection?: 'single' | 'multiple' | { mode: 'singleRow' | 'multiRow' };
  colResizeDefault?: 'shift' | undefined;
  isExternalFilterPresent?: () => boolean;
  doesExternalFilterPass?: (node: IRowNode) => boolean;
  disableFiltering?: boolean;
  columnMenuTabs?: ColumnMenuTab[];
  mainMenuItems?: GetMainMenuItems;
  getContextMenuItems?: GetContextMenuItems;
  onColumnPinned?: (event: ColumnPinnedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
  onColumnRowGroupChanged?: (event: ColumnRowGroupChangedEvent) => void;
  onRowGroupOpened?: (event: RowGroupOpenedEvent) => void;
  onColumnVisible?: () => void;
  rowNumbers?: boolean;
  suppressHeaderFilterButton?: boolean;
  // Pagination props
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[] | boolean;
  paginationAutoPageSize?: boolean;
  suppressPaginationPanel?: boolean;
  onPaginationChanged?: (event: PaginationChangedEvent) => void;
  // Row grouping props
  rowGroupPanelShow?: 'always' | 'onlyWhenGrouping' | 'never';
  groupDefaultExpanded?: number;
  suppressGroupChangesColumnVisibility?: 'suppressHideOnGroup' | 'suppressShowOnUngroup' | boolean;
  autoGroupColumnDef?: ColDef;
  groupDisplayType?: 'singleColumn' | 'multipleColumns' | 'groupRows' | 'custom';
}

export interface DataGridRef {
  api: GridApi | null;
  autoSizeColumns: (columns?: string[]) => void;
  sizeColumnsToFit: () => void;
  onFilterChanged: () => void;
  refreshCells: () => void;
  applyTransaction: (transaction: RowDataTransaction) => unknown;
  applyTransactionAsync: (transaction: RowDataTransaction) => unknown;
}
