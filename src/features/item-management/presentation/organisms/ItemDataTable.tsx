import React, { memo, useCallback, useMemo } from 'react';
import { DataGrid, getPinOnlyMenuItems } from '@/components/ag-grid';
import Pagination from '@/components/pagination';
import { TableSkeleton } from '@/components/skeleton';
import {
  RowClickedEvent,
  ColDef,
  GridReadyEvent,
  IRowNode,
  ColumnPinnedEvent,
  ColumnMovedEvent,
} from 'ag-grid-community';
import type { Item } from '@/types/database';

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
          rowData={items}
          columnDefs={columnDefs}
          onRowClicked={handleRowClicked}
          onGridReady={onGridReady}
          loading={false}
          overlayNoRowsTemplate={shouldSuppressOverlay ? '' : overlayTemplate}
          autoSizeColumns={columnsToAutoSize}
          onFirstDataRendered={undefined}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getPinOnlyMenuItems}
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
