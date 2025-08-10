import { useMemo } from 'react';
import { ColDef } from 'ag-grid-community';
import {
  createTextColumn,
  createWrapTextColumn,
  createCurrencyColumn,
  createCenterAlignColumn,
  formatCurrency,
  formatBaseCurrency,
} from '@/components/ag-grid';
import type { PackageConversion } from '@/types';
interface UseItemGridColumnsProps {
  visibleColumns?: string[];
  isColumnVisible?: (columnKey: string) => boolean;
  getColumnPinning?: (columnKey: string) => 'left' | 'right' | null;
}

export const useItemGridColumns = (props: UseItemGridColumnsProps = {}) => {
  const { isColumnVisible, getColumnPinning } = props;

  const columnDefs: ColDef[] = useMemo(() => {
    const allColumns: ColDef[] = [
      // Row number column
      {
        field: 'rowNumber',
        headerName: 'No.',
        width: 60,
        minWidth: 60,
        maxWidth: 60,
        pinned: 'left',
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        suppressHeaderMenuButton: true,
        cellStyle: { textAlign: 'center', fontWeight: 'bold' },
        valueGetter: 'node.rowIndex + 1',
      },
      {
        ...createTextColumn({
          field: 'name',
          headerName: 'Nama Item',
          minWidth: 200,
          flex: 1,
        }),
        pinned: getColumnPinning?.('name') || undefined,
      },
      {
        ...createTextColumn({
          field: 'manufacturer',
          headerName: 'Produsen',
          minWidth: 120,
          valueGetter: params => params.data.manufacturer || '-',
        }),
        pinned: getColumnPinning?.('manufacturer') || undefined,
      },
      {
        ...createTextColumn({
          field: 'code',
          headerName: 'Kode',
          minWidth: 80,
        }),
        pinned: getColumnPinning?.('code') || undefined,
      },
      {
        ...createTextColumn({
          field: 'barcode',
          headerName: 'Barcode',
          minWidth: 100,
          valueGetter: params => params.data.barcode || '-',
        }),
        pinned: getColumnPinning?.('barcode') || undefined,
      },
      {
        ...createTextColumn({
          field: 'category.name',
          headerName: 'Kategori',
          minWidth: 100,
        }),
        pinned: getColumnPinning?.('category.name') || undefined,
      },
      {
        ...createWrapTextColumn({
          field: 'type.name',
          headerName: 'Jenis',
          minWidth: 120,
        }),
        pinned: getColumnPinning?.('type.name') || undefined,
      },
      {
        ...createTextColumn({
          field: 'unit.name',
          headerName: 'Kemasan',
          minWidth: 80,
        }),
        pinned: getColumnPinning?.('unit.name') || undefined,
      },
      {
        ...createTextColumn({
          field: 'dosage.name',
          headerName: 'Sediaan',
          minWidth: 100,
          valueGetter: params => params.data.dosage?.name || '-',
        }),
        pinned: getColumnPinning?.('dosage.name') || undefined,
      },
      {
        ...createTextColumn({
          field: 'package_conversions',
          headerName: 'Kemasan Turunan',
          minWidth: 140,
          valueGetter: params => {
            const conversions = params.data.package_conversions;
            if (conversions && conversions.length > 0) {
              return conversions
                .map((uc: PackageConversion) => uc.unit_name || 'N/A')
                .join(', ');
            }
            return '-';
          },
        }),
        pinned: getColumnPinning?.('package_conversions') || undefined,
      },
      {
        ...createCurrencyColumn({
          field: 'base_price',
          headerName: 'Harga Pokok',
          minWidth: 120,
          valueFormatter: params => formatBaseCurrency(params.value),
        }),
        pinned: getColumnPinning?.('base_price') || undefined,
      },
      {
        ...createCurrencyColumn({
          field: 'sell_price',
          headerName: 'Harga Jual',
          minWidth: 120,
          valueFormatter: params => formatCurrency(params.value),
        }),
        pinned: getColumnPinning?.('sell_price') || undefined,
      },
      {
        ...createCenterAlignColumn({
          field: 'stock',
          headerName: 'Stok',
          minWidth: 70,
          maxWidth: 100, // Reduced from 120 to 100 for more compact width
        }),
        pinned: getColumnPinning?.('stock') || undefined,
      },
    ];

    // Filter columns based on visibility
    if (isColumnVisible) {
      return allColumns.filter(column =>
        isColumnVisible(column.field as string)
      );
    }

    return allColumns;
  }, [isColumnVisible, getColumnPinning]);

  const columnsToAutoSize = useMemo(() => {
    const allColumnsToAutoSize = [
      'code',
      'manufacturer',
      'barcode',
      'category.name',
      'type.name',
      'unit.name',
      'dosage.name',
      'package_conversions',
      'base_price',
      'sell_price',
      // 'stock' - excluded from autoSize, using fixed width range instead
    ];

    // Filter columns to auto-size based on visibility
    if (isColumnVisible) {
      return allColumnsToAutoSize.filter(columnKey =>
        isColumnVisible(columnKey)
      );
    }

    return allColumnsToAutoSize;
  }, [isColumnVisible]);

  return {
    columnDefs,
    columnsToAutoSize,
  };
};
