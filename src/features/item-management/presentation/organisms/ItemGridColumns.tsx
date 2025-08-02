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
import type { UnitConversion } from '@/types';

export const useItemGridColumns = () => {
  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
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
        headerName: 'Satuan',
        minWidth: 80,
      }),
      createTextColumn({
        field: 'dosage.name',
        headerName: 'Sediaan',
        minWidth: 100,
        valueGetter: params => params.data.dosage?.name || '-',
      }),
      createTextColumn({
        field: 'unit_conversions',
        headerName: 'Satuan Turunan',
        minWidth: 140,
        valueGetter: params => {
          const conversions = params.data.unit_conversions;
          if (conversions && conversions.length > 0) {
            return conversions
              .map((uc: UnitConversion) => uc.unit_name || 'N/A')
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
      }),
    ];

    return columns;
  }, []);

  const columnsToAutoSize = [
    'code',
    'manufacturer',
    'barcode',
    'category.name',
    'type.name',
    'unit.name',
    'dosage.name',
    'unit_conversions',
    'base_price',
    'sell_price',
    'stock',
  ];

  return {
    columnDefs,
    columnsToAutoSize,
  };
};
