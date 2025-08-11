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

export const useItemGridColumns = () => {
  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createWrapTextColumn({
        field: 'name',
        headerName: 'Nama Item',
        
        flex: 1,
      }),
      createTextColumn({
        field: 'manufacturer',
        headerName: 'Produsen',
        
        valueGetter: params => params.data.manufacturer || '-',
      }),
      createTextColumn({
        field: 'code',
        headerName: 'Kode',
        
      }),
      createTextColumn({
        field: 'barcode',
        headerName: 'Barcode',
        
        valueGetter: params => params.data.barcode || '-',
      }),
      createTextColumn({
        field: 'category.name',
        headerName: 'Kategori',
        
      }),
      createWrapTextColumn({
        field: 'type.name',
        headerName: 'Jenis',
        
      }),
      createTextColumn({
        field: 'unit.name',
        headerName: 'Kemasan',
        
      }),
      createTextColumn({
        field: 'dosage.name',
        headerName: 'Sediaan',
        
        valueGetter: params => params.data.dosage?.name || '-',
      }),
      createTextColumn({
        field: 'package_conversions',
        headerName: 'Kemasan Turunan',
        
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
        
        valueFormatter: params => formatBaseCurrency(params.value),
      }),
      createCurrencyColumn({
        field: 'sell_price',
        headerName: 'Harga Jual',
        
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
    'name', // ← Added: Include name column in autosize
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
    'stock',
  ];

  return {
    columnDefs,
    columnsToAutoSize,
  };
};
