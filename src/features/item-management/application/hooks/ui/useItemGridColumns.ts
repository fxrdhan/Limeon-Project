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
    // Create column definitions (order and pinning handled by AG Grid sidebar)
    const columnDefinitionsMap: Record<string, ColDef> = {
      name: {
        ...createWrapTextColumn({
          field: 'name',
          headerName: 'Nama Item',
          flex: 1,
        }),
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: [
            'contains',
            'notContains',
            'equals',
            'notEqual',
            'startsWith',
            'endsWith',
          ],
          defaultOption: 'contains',
          suppressAndOrCondition: false,
          caseSensitive: false,
        },
        suppressHeaderFilterButton: true,
      },
      'manufacturer.name': {
        ...createTextColumn({
          field: 'manufacturer.name',
          headerName: 'Produsen',
          valueGetter: params => params.data?.manufacturer?.name || '-',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            { filter: 'agTextColumnFilter' },
            { filter: 'agSetColumnFilter' },
          ],
        },
        suppressHeaderFilterButton: true,
        enableRowGroup: true,
      },
      code: {
        ...createTextColumn({
          field: 'code',
          headerName: 'Kode',
        }),
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: [
            'contains',
            'notContains',
            'equals',
            'notEqual',
            'startsWith',
            'endsWith',
          ],
          defaultOption: 'contains',
          suppressAndOrCondition: false,
          caseSensitive: false,
        },
        suppressHeaderFilterButton: true,
      },
      barcode: {
        ...createTextColumn({
          field: 'barcode',
          headerName: 'Barcode',

          valueGetter: params => params.data?.barcode || '-',
        }),
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: [
            'contains',
            'notContains',
            'equals',
            'notEqual',
            'startsWith',
            'endsWith',
          ],
          defaultOption: 'contains',
          suppressAndOrCondition: false,
          caseSensitive: false,
        },
        suppressHeaderFilterButton: true,
      },
      'category.name': {
        ...createTextColumn({
          field: 'category.name',
          headerName: 'Kategori',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            { filter: 'agTextColumnFilter' },
            { filter: 'agSetColumnFilter' },
          ],
        },
        suppressHeaderFilterButton: true,
        enableRowGroup: true,
      },
      'type.name': {
        ...createWrapTextColumn({
          field: 'type.name',
          headerName: 'Jenis',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            { filter: 'agTextColumnFilter' },
            { filter: 'agSetColumnFilter' },
          ],
        },
        suppressHeaderFilterButton: true,
        enableRowGroup: true,
      },
      'package.name': {
        ...createTextColumn({
          field: 'package.name',
          headerName: 'Kemasan',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            { filter: 'agTextColumnFilter' },
            { filter: 'agSetColumnFilter' },
          ],
        },
        suppressHeaderFilterButton: true,
        enableRowGroup: true,
      },
      'dosage.name': {
        ...createTextColumn({
          field: 'dosage.name',
          headerName: 'Sediaan',

          valueGetter: params => params.data?.dosage?.name || '-',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            { filter: 'agTextColumnFilter' },
            { filter: 'agSetColumnFilter' },
          ],
        },
        suppressHeaderFilterButton: true,
        enableRowGroup: true,
      },
      package_conversions: {
        ...createTextColumn({
          field: 'package_conversions',
          headerName: 'Kemasan Turunan',

          valueGetter: params => {
            const conversions = params.data?.package_conversions;
            if (conversions && conversions.length > 0) {
              return conversions
                .map((uc: PackageConversion) => uc.unit_name || 'N/A')
                .join(', ');
            }
            return ''; // Return empty string instead of "-" for better AG Grid behavior
          },
        }),
        cellRenderer: (params: { value: string }) => {
          // Display "-" in UI when value is empty, but keep internal value as empty string
          return params.value || '-';
        },
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: [
            'contains',
            'notContains',
            'equals',
            'notEqual',
            'startsWith',
            'endsWith',
          ],
          defaultOption: 'contains',
          suppressAndOrCondition: false,
          caseSensitive: false,
        },
        suppressHeaderFilterButton: true,
      },
      base_price: {
        ...createCurrencyColumn({
          field: 'base_price',
          headerName: 'Harga Pokok',
          valueFormatter: params => formatBaseCurrency(params.value),
        }),
        // cellDataType is required for Advanced Filter to recognize this as a number column
        // filter: true allows AG Grid to use cellDataType to determine filter type
        cellDataType: 'number',
        filter: true,
        suppressHeaderFilterButton: true,
      },
      sell_price: {
        ...createCurrencyColumn({
          field: 'sell_price',
          headerName: 'Harga Jual',
          valueFormatter: params => formatCurrency(params.value),
        }),
        // cellDataType is required for Advanced Filter to recognize this as a number column
        // filter: true allows AG Grid to use cellDataType to determine filter type
        cellDataType: 'number',
        filter: true,
        suppressHeaderFilterButton: true,
      },
      stock: {
        ...createCenterAlignColumn({
          field: 'stock',
          headerName: 'Stok',
        }),
        // cellDataType is required for Advanced Filter to recognize this as a number column
        // filter: true allows AG Grid to use cellDataType to determine filter type
        cellDataType: 'number',
        filter: true,
        suppressHeaderFilterButton: true,
      },
    };

    // Return all columns in default order (AG Grid sidebar handles column ordering)
    return Object.values(columnDefinitionsMap);
  }, []);

  const columnsToAutoSize = useMemo(() => {
    // Return all columns for autosize - AG Grid will only autosize visible columns anyway
    const allColumnsToAutoSize = [
      'name', // ← Added: Include name column in autosize
      'code',
      'manufacturer.name', // ← Fix: seharusnya manufacturer.name
      'barcode',
      'category.name',
      'type.name',
      'package.name', // ← Fix: ganti unit.name dengan package.name
      'dosage.name',
      'package_conversions',
      'base_price',
      'sell_price',
      'stock', // ← Added: Include stock column in autosize
    ];

    return allColumnsToAutoSize;
  }, []);

  return {
    columnDefs,
    columnsToAutoSize,
  };
};
