import React, { memo, useCallback, useMemo, useState } from 'react';
import { DataGrid } from '@/components/ag-grid';
import Pagination from '@/components/pagination';
import { TableSkeleton } from '@/components/skeleton';
import {
  RowClickedEvent,
  ColDef,
  GridReadyEvent,
  IRowNode,
  ColumnPinnedEvent,
  ColumnMovedEvent,
  GridApi,
  MenuItemDef,
  GetMainMenuItemsParams,
} from 'ag-grid-community';
import type {
  Item,
  Category,
  MedicineType,
  Unit,
  ItemPackage,
} from '@/types/database';

interface ItemDataTableProps {
  items: Item[];
  columnDefs: ColDef[];
  columnsToAutoSize: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown;
  search: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onRowClick: (item: Item) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onGridReady: (params: GridReadyEvent) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (node: IRowNode) => boolean;
  onColumnPinned?: (event: ColumnPinnedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
}

// Column display mode state type
type ColumnDisplayMode = 'name' | 'code';

const ItemDataTable = memo<ItemDataTableProps>(function ItemDataTable({
  items,
  columnDefs,
  columnsToAutoSize,
  isLoading,
  isError,
  error,
  search,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onRowClick,
  onPageChange,
  onItemsPerPageChange,
  onGridReady,
  isExternalFilterPresent,
  doesExternalFilterPass,
  onColumnPinned,
  onColumnMoved,
}: ItemDataTableProps) {
  // Grid API state for triggering autosize
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Column display mode state - tracks whether to show name or code for reference columns
  const [columnDisplayModes, setColumnDisplayModes] = useState<
    Record<string, ColumnDisplayMode>
  >({
    manufacturer: 'name',
    'category.name': 'name',
    'type.name': 'name',
    'unit.name': 'name',
    'dosage.name': 'name',
  });

  // Helper to check if a column is a reference column
  const isReferenceColumn = useCallback((colId: string) => {
    return [
      'manufacturer',
      'category.name',
      'type.name',
      'unit.name',
      'dosage.name',
    ].includes(colId);
  }, []);

  // Toggle display mode for a column
  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      setColumnDisplayModes(prev => ({
        ...prev,
        [colId]: prev[colId] === 'name' ? 'code' : 'name',
      }));

      // Auto trigger autosize after toggle untuk menyesuaikan lebar kolom dengan konten baru
      setTimeout(() => {
        if (gridApi) {
          gridApi.autoSizeAllColumns();
        }
      }, 50);
    },
    [gridApi]
  );

  // SIMPLE SOLUTION: Show skeleton ONLY when truly no data exists
  // If totalItems > 0, NEVER show skeleton (data is cached/available)
  const shouldShowSkeleton = isLoading && totalItems === 0;

  // Skip complex useCacheFirstLoading - use direct simple logic
  const showSkeleton = shouldShowSkeleton;
  const showBackgroundLoading = isLoading && totalItems > 0;
  const shouldSuppressOverlay = isLoading;

  const handleRowClicked = useCallback(
    (event: RowClickedEvent) => {
      onRowClick(event.data);
    },
    [onRowClick]
  );

  // Handle grid ready untuk capture API dan trigger original handler
  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);
      onGridReady(params);
    },
    [onGridReady]
  );

  // Custom menu items with reference column toggle
  const getMainMenuItems = useCallback(
    (params: GetMainMenuItemsParams) => {
      if (!params.column) {
        return [
          { name: 'columnFilter' },
          { name: 'separator' },
          { name: 'pinSubMenu' },
        ] as MenuItemDef[];
      }

      const colId = params.column.getColId();
      const baseMenuItems: MenuItemDef[] = [
        { name: 'columnFilter' },
        { name: 'separator' },
        { name: 'pinSubMenu' },
        { name: 'separator' },
        { name: 'autoSizeAll' },
      ];

      // Add toggle menu for reference columns only
      if (isReferenceColumn(colId)) {
        const currentMode = columnDisplayModes[colId];
        const nextMode = currentMode === 'name' ? 'kode' : 'nama';

        baseMenuItems.push({ name: 'separator' }, {
          name: `Tampilkan ${nextMode}`,
          action: () => {
            toggleColumnDisplayMode(colId);
          },
          icon: currentMode === 'name' ? '#' : 'T',
        } as MenuItemDef);
      }

      return baseMenuItems;
    },
    [isReferenceColumn, columnDisplayModes, toggleColumnDisplayMode]
  );

  // Modified items data based on column display modes
  const modifiedItems = useMemo(() => {

    return items.map(item => {
      const modifiedItem = { ...item };

      // Apply display mode transformations
      Object.entries(columnDisplayModes).forEach(([colId, mode]) => {
        if (mode === 'code') {
          switch (colId) {
            case 'manufacturer':
              if (item.manufacturer_info && item.manufacturer_info.code) {
                modifiedItem.manufacturer = item.manufacturer_info.code;
              }
              break;
            case 'category.name':
              if (item.category && (item.category as Category).code) {
                modifiedItem.category = {
                  ...item.category,
                  name: (item.category as Category).code!,
                };
              }
              break;
            case 'type.name':
              if (item.type && (item.type as MedicineType).code) {
                modifiedItem.type = {
                  ...item.type,
                  name: (item.type as MedicineType).code!,
                };
              }
              break;
            case 'unit.name':
              if (item.unit && (item.unit as Unit).code) {
                modifiedItem.unit = {
                  ...item.unit,
                  name: (item.unit as Unit).code!,
                };
              }
              break;
            case 'dosage.name':
              if (item.dosage && (item.dosage as ItemPackage).code) {
                modifiedItem.dosage = {
                  ...item.dosage,
                  name: (item.dosage as ItemPackage).code!,
                };
              }
              break;
          }
        }
      });

      return modifiedItem;
    });
  }, [items, columnDisplayModes]);

  const overlayTemplate = useMemo(() => {
    if (search) {
      return `<span style="padding: 10px; color: #888;">Tidak ada item dengan nama "${search}"</span>`;
    }
    return '<span style="padding: 10px; color: #888;">Tidak ada data item yang ditemukan</span>';
  }, [search]);

  if (isError) {
    return (
      <div className="text-center p-6 text-red-500">
        Error: {error instanceof Error ? error.message : 'Gagal memuat data'}
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <TableSkeleton
        rows={itemsPerPage || 10}
        columns={5}
        showPagination={true}
        className="mt-4"
      />
    );
  }

  return (
    <>
      {/* Background loading indicator */}
      {showBackgroundLoading && (
        <div className="absolute top-0 right-0 z-10 mt-2 mr-4">
          <div className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm shadow-sm">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Memperbarui data...</span>
          </div>
        </div>
      )}

      <div className="relative">
        <DataGrid
          key="items-data-grid"
          rowData={modifiedItems}
          columnDefs={columnDefs}
          onRowClicked={handleRowClicked}
          onGridReady={handleGridReady}
          loading={false}
          overlayNoRowsTemplate={shouldSuppressOverlay ? '' : overlayTemplate}
          autoSizeColumns={columnsToAutoSize}
          onFirstDataRendered={undefined}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getMainMenuItems}
          onColumnPinned={onColumnPinned}
          onColumnMoved={onColumnMoved}
          rowNumbers={true}
          style={{
            width: '100%',
            marginTop: '1rem',
            marginBottom: '1rem',
            opacity: showBackgroundLoading ? 0.8 : 1,
            transition: 'opacity 0.2s ease-in-out',
          }}
        />
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemsCount={items.length}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </>
  );
});

export default ItemDataTable;
