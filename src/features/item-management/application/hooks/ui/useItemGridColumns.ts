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
  getColumnPinning?: (columnKey: string) => 'left' | 'right' | null;
  columnOrder?: string[];
}

export const useItemGridColumns = (props: UseItemGridColumnsProps = {}) => {
  const { getColumnPinning, columnOrder } = props;

  const columnDefs: ColDef[] = useMemo(() => {
    // Create column definitions map for ordering
    const columnDefinitionsMap: Record<string, ColDef> = {
      name: {
        ...createWrapTextColumn({
          field: 'name',
          headerName: 'Nama Item',
          flex: 1,
        }),
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('name') || undefined,
      },
      manufacturer: {
        ...createTextColumn({
          field: 'manufacturer',
          headerName: 'Produsen',
          valueGetter: params => params.data?.manufacturer || '-',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('manufacturer') || undefined,
        enableRowGroup: true,
        // Remove rowGroup property - let AG Grid handle grouping state natively
      },
      code: {
        ...createTextColumn({
          field: 'code',
          headerName: 'Kode',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('code') || undefined,
      },
      barcode: {
        ...createTextColumn({
          field: 'barcode',
          headerName: 'Barcode',

          valueGetter: params => params.data?.barcode || '-',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('barcode') || undefined,
      },
      'category.name': {
        ...createTextColumn({
          field: 'category.name',
          headerName: 'Kategori',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('category.name') || undefined,
        enableRowGroup: true, // Always enable for groupable columns
        // Remove rowGroup property - let AG Grid handle grouping state natively
      },
      'type.name': {
        ...createWrapTextColumn({
          field: 'type.name',
          headerName: 'Jenis',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('type.name') || undefined,
        enableRowGroup: true,
        // Remove rowGroup property - let AG Grid handle grouping state natively
      },
      'unit.name': {
        ...createTextColumn({
          field: 'unit.name',
          headerName: 'Kemasan',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('unit.name') || undefined,
        enableRowGroup: true,
        // Remove rowGroup property - let AG Grid handle grouping state natively
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
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('dosage.name') || undefined,
        enableRowGroup: true,
        // Remove rowGroup property - let AG Grid handle grouping state natively
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
            return '-';
          },
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agTextColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('package_conversions') || undefined,
      },
      base_price: {
        ...createCurrencyColumn({
          field: 'base_price',
          headerName: 'Harga Pokok',

          valueFormatter: params => formatBaseCurrency(params.value),
        }),
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('base_price') || undefined,
      },
      sell_price: {
        ...createCurrencyColumn({
          field: 'sell_price',
          headerName: 'Harga Jual',

          valueFormatter: params => formatCurrency(params.value),
        }),
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('sell_price') || undefined,
      },
      stock: {
        ...createCenterAlignColumn({
          field: 'stock',
          headerName: 'Stok',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            {
              filter: 'agNumberColumnFilter',
            },
            {
              filter: 'agSetColumnFilter',
            },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('stock') || undefined,
      },
    };

    // Default column order if not specified
    const defaultOrder = [
      'name',
      'manufacturer',
      'code',
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

    // Use provided order or default order
    const orderedColumns = columnOrder || defaultOrder;

    // Create ordered column array
    const orderedColumnDefs = orderedColumns
      .map(fieldName => columnDefinitionsMap[fieldName])
      .filter(Boolean); // Remove undefined columns

    // Add any missing columns that aren't in the order (fallback)
    Object.keys(columnDefinitionsMap).forEach(fieldName => {
      if (!orderedColumns.includes(fieldName)) {
        orderedColumnDefs.push(columnDefinitionsMap[fieldName]);
      }
    });

    // Use ordered columns without manual row number column (AG Grid built-in rowNumbers will handle this)
    // IMPORTANT: Don't filter by visibility here! Send all columns to AG Grid.
    // Let AG Grid handle column visibility via setColumnsVisible() API to maintain correct ordering.
    const allColumns = orderedColumnDefs;

    return allColumns;
  }, [getColumnPinning, columnOrder]);

  const columnsToAutoSize = useMemo(() => {
    // Return all columns for autosize - AG Grid will only autosize visible columns anyway
    const allColumnsToAutoSize = [
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
      'stock', // ← Added: Include stock column in autosize
    ];

    return allColumnsToAutoSize;
  }, []);

  return {
    columnDefs,
    columnsToAutoSize,
  };
};
