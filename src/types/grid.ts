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
