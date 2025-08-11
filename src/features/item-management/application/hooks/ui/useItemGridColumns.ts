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
  columnOrder?: string[];
}

export const useItemGridColumns = (props: UseItemGridColumnsProps = {}) => {
  const { isColumnVisible, getColumnPinning, columnOrder } = props;

  const columnDefs: ColDef[] = useMemo(() => {

    // Create column definitions map for ordering
    const columnDefinitionsMap: Record<string, ColDef> = {
      'name': {
        ...createTextColumn({
          field: 'name',
          headerName: 'Nama Item',
          minWidth: 200,
          flex: 1,
        }),
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('name') || undefined,
      },
      'manufacturer': {
        ...createTextColumn({
          field: 'manufacturer',
          headerName: 'Produsen',
          minWidth: 120,
          valueGetter: params => params.data.manufacturer || '-',
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
      },
      'code': {
        ...createTextColumn({
          field: 'code',
          headerName: 'Kode',
          minWidth: 80,
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
      'barcode': {
        ...createTextColumn({
          field: 'barcode',
          headerName: 'Barcode',
          minWidth: 100,
          valueGetter: params => params.data.barcode || '-',
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
          minWidth: 100,
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
      },
      'type.name': {
        ...createWrapTextColumn({
          field: 'type.name',
          headerName: 'Jenis',
          minWidth: 120,
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
      },
      'unit.name': {
        ...createTextColumn({
          field: 'unit.name',
          headerName: 'Kemasan',
          minWidth: 80,
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
      },
      'dosage.name': {
        ...createTextColumn({
          field: 'dosage.name',
          headerName: 'Sediaan',
          minWidth: 100,
          valueGetter: params => params.data.dosage?.name || '-',
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
      },
      'package_conversions': {
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
      'base_price': {
        ...createCurrencyColumn({
          field: 'base_price',
          headerName: 'Harga Pokok',
          minWidth: 120,
          valueFormatter: params => formatBaseCurrency(params.value),
        }),
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('base_price') || undefined,
      },
      'sell_price': {
        ...createCurrencyColumn({
          field: 'sell_price',
          headerName: 'Harga Jual',
          minWidth: 120,
          valueFormatter: params => formatCurrency(params.value),
        }),
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning?.('sell_price') || undefined,
      },
      'stock': {
        ...createCenterAlignColumn({
          field: 'stock',
          headerName: 'Stok',
          minWidth: 70,
          maxWidth: 100, // Reduced from 120 to 100 for more compact width
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
    const allColumns = orderedColumnDefs;

    // Filter columns based on visibility
    if (isColumnVisible) {
      return allColumns.filter(column =>
        isColumnVisible(column.field as string)
      );
    }

    return allColumns;
  }, [isColumnVisible, getColumnPinning, columnOrder]);

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
