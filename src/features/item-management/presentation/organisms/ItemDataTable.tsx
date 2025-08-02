import React from 'react';
import { DataGrid } from '@/components/ag-grid';
import Pagination from '@/components/pagination';
import {
  RowClickedEvent,
  ColDef,
  GridReadyEvent,
  IRowNode,
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
}

export default function ItemDataTable({
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
}: ItemDataTableProps) {
  const handleRowClicked = (event: RowClickedEvent) => {
    onRowClick(event.data);
  };

  const getOverlayTemplate = () => {
    if (search) {
      return `<span style="padding: 10px; color: #888;">Tidak ada item dengan nama "${search}"</span>`;
    }
    return '<span style="padding: 10px; color: #888;">Tidak ada data item yang ditemukan</span>';
  };

  if (isError) {
    return (
      <div className="text-center p-6 text-red-500">
        Error: {error instanceof Error ? error.message : 'Gagal memuat data'}
      </div>
    );
  }

  return (
    <>
      <DataGrid
        rowData={items}
        columnDefs={columnDefs}
        onRowClicked={handleRowClicked}
        onGridReady={onGridReady}
        loading={isLoading}
        overlayNoRowsTemplate={getOverlayTemplate()}
        autoSizeColumns={columnsToAutoSize}
        onFirstDataRendered={() => {}}
        animateRows={true}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        style={{
          width: '100%',
          marginTop: '1rem',
          marginBottom: '1rem',
        }}
      />
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
}
