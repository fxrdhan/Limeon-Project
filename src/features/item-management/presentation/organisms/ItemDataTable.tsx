import { memo, useCallback, useMemo, useState } from 'react';
import { useDynamicGridHeight } from '@/hooks/useDynamicGridHeight';
import { DataGrid } from '@/components/ag-grid';
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui';
import { StandardPagination } from '../atoms';
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
  GetMainMenuItems,
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
  totalPages: number; // Keep for backward compatibility
  totalItems: number;
  itemsPerPage: number;
  onRowClick: (item: Item) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
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
  totalPages: _totalPages, // eslint-disable-line @typescript-eslint/no-unused-vars
  totalItems: _totalItems, // eslint-disable-line @typescript-eslint/no-unused-vars
  itemsPerPage,
  onRowClick,
  onPageChange: _onPageChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  onItemsPerPageChange: _onItemsPerPageChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  onGridReady,
  isExternalFilterPresent,
  doesExternalFilterPass,
  onColumnPinned,
  onColumnMoved,
}: ItemDataTableProps) {
  // Grid API state for triggering autosize
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(itemsPerPage || 10);

  // Column display mode state - persistent across sessions
  const {
    displayModeState: columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode: toggleDisplayMode,
  } = useColumnDisplayMode();

  // Toggle display mode for a column with auto-resize
  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      toggleDisplayMode(colId);

      // Auto trigger autosize after toggle untuk menyesuaikan lebar kolom dengan konten baru
      setTimeout(() => {
        if (gridApi) {
          gridApi.autoSizeAllColumns();
        }
      }, 50);
    },
    [toggleDisplayMode, gridApi]
  );

  // Use AG-Grid built-in loading overlay instead of skeleton
  const showAGGridLoading = isLoading;

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
      
      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);
      
      // Set initial page if needed
      if (currentPage > 1) {
        params.api.paginationGoToPage(currentPage - 1);
      }
      
      onGridReady(params);
    },
    [onGridReady, currentPage]
  );


  // Custom menu items with reference column toggle
  const getMainMenuItems = useCallback(
    (params: GetMainMenuItemsParams) => {
      if (!params.column) {
        return [
          'columnFilter',
          'separator', 
          'pinSubMenu',
        ];
      }

      const colId = params.column.getColId();
      const baseMenuItems: (string | MenuItemDef)[] = [
        'columnFilter',
        'separator',
        'pinSubMenu',
        'separator',
        'autoSizeAll',
      ];

      // Add toggle menu for reference columns only
      if (isReferenceColumn(colId)) {
        const currentMode = columnDisplayModes[colId];
        const nextMode = currentMode === 'name' ? 'kode' : 'nama';

        baseMenuItems.push('separator', {
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

  // Use dynamic grid height hook
  const { gridHeight } = useDynamicGridHeight({
    data: items,
    currentPageSize,
    viewportOffset: 320, // navbar + toolbar + pagination + margins + bottom pagination
    debug: false,
  });

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


  return (
    <>
      <div className="relative">
        <DataGrid
          key="items-data-grid" // Stable key prevents recreation
          rowData={modifiedItems}
          columnDefs={columnDefs}
          onRowClicked={handleRowClicked}
          onGridReady={handleGridReady}
          loading={showAGGridLoading}
          overlayNoRowsTemplate={overlayTemplate}
          autoSizeColumns={columnsToAutoSize}
          onFirstDataRendered={undefined}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getMainMenuItems as GetMainMenuItems}
          onColumnPinned={onColumnPinned}
          onColumnMoved={onColumnMoved}
          rowNumbers={true}
          domLayout="normal"
          style={{
            width: '100%',
            marginTop: '1rem',
            marginBottom: '1rem',
            height: `${gridHeight}px`, // Dynamic height based on pagination size
            transition: 'height 0.3s ease-in-out',
          }}
          // AG Grid Built-in Pagination (hidden - we'll use custom component)
          pagination={true}
          paginationPageSize={itemsPerPage || 10}
          suppressPaginationPanel={true} // Hide AG Grid's built-in pagination UI
        />
      </div>
      
      {/* Custom Pagination Component using AG Grid API */}
      <StandardPagination
        gridApi={gridApi}
        onPageSizeChange={setCurrentPageSize}
      />
    </>
  );
});

export default ItemDataTable;
