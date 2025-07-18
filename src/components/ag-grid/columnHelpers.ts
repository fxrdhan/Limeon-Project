import { ColDef } from "ag-grid-community";
import { ColumnConfig } from "@/types";

export type { ColumnConfig };

export const createTextColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth || 100,
  flex: config.flex,
  cellStyle: config.cellStyle || {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tooltipField: config.tooltipField || config.field,
  valueGetter: config.valueGetter,
  valueFormatter: config.valueFormatter,
  sortable: config.sortable !== false,
  resizable: config.resizable !== false,
});

export const createWrapTextColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth || 120,
  cellStyle: config.cellStyle || {
    overflow: "visible",
    textOverflow: "unset",
    whiteSpace: "normal",
  },
  valueGetter: config.valueGetter,
  valueFormatter: config.valueFormatter,
  sortable: config.sortable !== false,
  resizable: config.resizable !== false,
});

export const createNumberColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth || 120,
  cellStyle: config.cellStyle || { textAlign: "right" },
  valueGetter: config.valueGetter,
  valueFormatter: config.valueFormatter,
  sortable: config.sortable !== false,
  resizable: config.resizable !== false,
});

export const createCurrencyColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth || 120,
  cellStyle: config.cellStyle || { textAlign: "right" },
  valueFormatter:
    config.valueFormatter ||
    ((params) =>
      params.value?.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) || ""),
  valueGetter: config.valueGetter,
  sortable: config.sortable !== false,
  resizable: config.resizable !== false,
});

export const createCenterAlignColumn = (config: ColumnConfig): ColDef => ({
  field: config.field,
  headerName: config.headerName,
  minWidth: config.minWidth || 80,
  cellStyle: config.cellStyle || { textAlign: "center" },
  valueGetter: config.valueGetter,
  valueFormatter: config.valueFormatter,
  sortable: config.sortable !== false,
  resizable: config.resizable !== false,
});

export const formatCurrency = (value: number): string => {
  return (
    value?.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) || ""
  );
};

export const formatBaseCurrency = (value: number): string => {
  return (
    value?.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
    }) || ""
  );
};

export const createMatchScoreColumn = (
  config: Omit<ColumnConfig, "field"> & {
    getMatchScore: (data: unknown) => number;
  },
): ColDef => ({
  field: "matchScore",
  headerName: config.headerName,
  width: config.minWidth || 100,
  sort: "desc",
  filter: false,
  sortable: true,
  resizable: config.resizable !== false,
  valueGetter: (params) => {
    return config.getMatchScore(params.data);
  },
  cellStyle: { textAlign: "center" },
});
