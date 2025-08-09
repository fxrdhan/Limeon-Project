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
}

export const useItemGridColumns = (props: UseItemGridColumnsProps = {}) => {
  const { isColumnVisible } = props;
  
  const columnDefs: ColDef[] = useMemo(() => {
    const allColumns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Item',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'manufacturer',
        headerName: 'Produsen',
        minWidth: 120,
        valueGetter: params => params.data.manufacturer || '-',
      }),
      createTextColumn({
        field: 'code',
        headerName: 'Kode',
        minWidth: 80,
      }),
      createTextColumn({
        field: 'barcode',
        headerName: 'Barcode',
        minWidth: 100,
        valueGetter: params => params.data.barcode || '-',
      }),
      createTextColumn({
        field: 'category.name',
        headerName: 'Kategori',
        minWidth: 100,
      }),
      createWrapTextColumn({
        field: 'type.name',
        headerName: 'Jenis',
        minWidth: 120,
      }),
      createTextColumn({
        field: 'unit.name',
        headerName: 'Kemasan',
        minWidth: 80,
      }),
      createTextColumn({
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
      createCurrencyColumn({
        field: 'base_price',
        headerName: 'Harga Pokok',
        minWidth: 120,
        valueFormatter: params => formatBaseCurrency(params.value),
      }),
      createCurrencyColumn({
        field: 'sell_price',
        headerName: 'Harga Jual',
        minWidth: 120,
        valueFormatter: params => formatCurrency(params.value),
      }),
      createCenterAlignColumn({
        field: 'stock',
        headerName: 'Stok',
        minWidth: 70,
        maxWidth: 100, // Reduced from 120 to 100 for more compact width
      }),
    ];

    // Filter columns based on visibility
    if (isColumnVisible) {
      return allColumns.filter(column => isColumnVisible(column.field as string));
    }

    return allColumns;
  }, [isColumnVisible]);

  const columnsToAutoSize = useMemo(() => {
    const allColumnsToAutoSize = [
      'code',
      'manufacturer',
      'barcode',
      'category.name',
      'type.name',
      'unit.name',
      'package_conversions',
      'base_price',
      'sell_price',
      // 'stock' - excluded from autoSize, using fixed width range instead
    ];
    
    // Filter columns to auto-size based on visibility
    if (isColumnVisible) {
      return allColumnsToAutoSize.filter(columnKey => isColumnVisible(columnKey));
    }
    
    return allColumnsToAutoSize;
  }, [isColumnVisible]);

  return {
    columnDefs,
    columnsToAutoSize,
  };
};
