import {
  RowClickedEvent,
  IRowNode,
  CellStyle,
  ValueFormatterParams,
  ValueGetterParams,
  GridReadyEvent,
  ColDef,
  ColumnMenuTab,
  GetMainMenuItems,
  GetContextMenuItems,
  ColumnPinnedEvent,
  ColumnMovedEvent,
  ColumnResizedEvent,
  PaginationChangedEvent,
  ColumnRowGroupChangedEvent,
  RowGroupOpenedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  DisplayedColumnsChangedEvent,
  StateUpdatedEvent,
  GridPreDestroyedEvent,
  RowSelectionOptions,
} from 'ag-grid-community';
import type { CellSelectionOptions } from 'ag-grid-enterprise';
import { SideBarDef } from 'ag-grid-enterprise';

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
  cellSelection?: boolean | CellSelectionOptions;
  suppressScrollOnNewData?: boolean;
  suppressAnimationFrame?: boolean;
  animateRows?: boolean;
  loadThemeGoogleFonts?: boolean;
  rowSelection?: 'single' | 'multiple' | RowSelectionOptions;
  colResizeDefault?: 'shift' | undefined;
  isExternalFilterPresent?: () => boolean;
  doesExternalFilterPass?: (node: IRowNode) => boolean;
  disableFiltering?: boolean;
  columnMenuTabs?: ColumnMenuTab[];
  getMainMenuItems?: GetMainMenuItems;
  getContextMenuItems?: GetContextMenuItems;
  onColumnPinned?: (event: ColumnPinnedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
  onColumnResized?: (event: ColumnResizedEvent) => void;
  onColumnRowGroupChanged?: (event: ColumnRowGroupChangedEvent) => void;
  onRowGroupOpened?: (event: RowGroupOpenedEvent) => void;
  onColumnVisible?: () => void;
  onSortChanged?: (event: SortChangedEvent) => void;
  onFilterChanged?: (event: FilterChangedEvent) => void;
  onDisplayedColumnsChanged?: (event: DisplayedColumnsChangedEvent) => void;
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
  suppressGroupChangesColumnVisibility?:
    | 'suppressHideOnGroup'
    | 'suppressShowOnUngroup'
    | boolean;
  autoGroupColumnDef?: ColDef;
  groupDisplayType?:
    | 'singleColumn'
    | 'multipleColumns'
    | 'groupRows'
    | 'custom';
  // Enhanced grouping props for multi-grouping
  suppressAggFuncInHeader?: boolean;
  suppressDragLeaveHidesColumns?: boolean;
  // Side bar props
  sideBar?: boolean | string | string[] | SideBarDef;
  // Grid state management props
  initialState?: object;
  onStateUpdated?: (event: StateUpdatedEvent) => void;
  onGridPreDestroyed?: (event: GridPreDestroyedEvent) => void;
  suppressColumnMoveAnimation?: boolean;
}
