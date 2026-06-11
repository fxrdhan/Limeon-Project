import type { GridApi } from 'ag-grid-community';

export interface ExportDropdownProps {
  gridApi: GridApi | null;
  filename?: string;
  className?: string;
  tooltipLabel?: string;
}

export interface GoogleSheetsExportData {
  processedData: string[][];
  headers: string[];
}
