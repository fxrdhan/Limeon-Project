import { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  ColumnPinnedEvent,
  ColumnMovedEvent,
  ColDef,
  IRowNode,
} from 'ag-grid-community';

// Components
import { DataGrid, DataGridRef, getPinAndFilterMenuItems } from '@/components/ag-grid';
import { StandardPagination } from '../atoms';

// Hooks
import { useDynamicGridHeight } from '@/hooks/useDynamicGridHeight';
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui';

// Types
import type { Item } from '@/types/database';
import { EntityType, EntityData } from '../../application/hooks/collections/useEntityManager';

type MasterDataType = 'items' | EntityType;

interface EntityConfig {
  entityName: string;
  nameColumnHeader: string;
  hasAddress?: boolean;
  hasNciCode?: boolean;
  searchPlaceholder?: string;
  noDataMessage?: string;
  searchNoDataMessage?: string;
}

interface MasterDataGridProps {
  activeTab: MasterDataType;
  
  // Data
  itemsData?: Item[];
  entityData?: EntityData[];
  
  // States
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown;
  search: string;
  
  // Grid config
  itemColumnDefs?: ColDef[];
  itemColumnsToAutoSize?: string[];
  
  // Entity config
  entityConfig?: EntityConfig | null;
  entityColumnDefs?: ColDef[];
  
  // Handlers
  onRowClick: (data: Item | EntityData) => void;
  onGridReady: (params: GridReadyEvent) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (node: IRowNode) => boolean;
  onColumnPinned?: (event: ColumnPinnedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
  onGridApiReady?: (api: GridApi | null) => void; // Add grid API callback
  
  // Pagination (for items)
  currentPage?: number;
  itemsPerPage?: number;
}

const MasterDataGrid = memo<MasterDataGridProps>(function MasterDataGrid({
  activeTab,
  itemsData = [],
  entityData = [],
  isLoading,
  isError,
  error,
  search,
  itemColumnDefs = [],
  itemColumnsToAutoSize = [],
  entityConfig,
  entityColumnDefs = [],
  onRowClick,
  onGridReady,
  isExternalFilterPresent,
  doesExternalFilterPass,
  onColumnPinned,
  onColumnMoved,
  onGridApiReady,
  currentPage = 1,
  itemsPerPage = 10,
}) {
  // Single grid API for all tabs
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(itemsPerPage);

  // Column display mode for items (reference columns)
  const {
    displayModeState: columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode: toggleDisplayMode,
  } = useColumnDisplayMode();

  // Determine current data and column definitions based on active tab
  const { rowData, columnDefs } = useMemo(() => {
    let data: (Item | EntityData)[] = [];
    let columns: ColDef[] = [];

    if (activeTab === 'items') {
      data = itemsData;
      columns = itemColumnDefs;
      
      // Apply column display mode transformations for items
      data = itemsData.map(item => {
        const modifiedItem = { ...item };

        // Apply display mode transformations
        Object.entries(columnDisplayModes).forEach(([colId, mode]) => {
          if (mode === 'code') {
            switch (colId) {
              case 'manufacturer':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (item.manufacturer_info && (item.manufacturer_info as any).code) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  modifiedItem.manufacturer = (item.manufacturer_info as any).code;
                }
                break;
              case 'category.name':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (item.category && (item.category as any).code) {
                  modifiedItem.category = {
                    ...item.category,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name: (item.category as any).code,
                  };
                }
                break;
              case 'type.name':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (item.type && (item.type as any).code) {
                  modifiedItem.type = {
                    ...item.type,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name: (item.type as any).code,
                  };
                }
                break;
              case 'unit.name':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (item.unit && (item.unit as any).code) {
                  modifiedItem.unit = {
                    ...item.unit,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name: (item.unit as any).code,
                  };
                }
                break;
              case 'dosage.name':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (item.dosage && (item.dosage as any).code) {
                  modifiedItem.dosage = {
                    ...item.dosage,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name: (item.dosage as any).code,
                  };
                }
                break;
            }
          }
        });

        return modifiedItem;
      });
    } else {
      data = entityData;
      columns = entityColumnDefs;
    }

    return { rowData: data, columnDefs: columns };
  }, [activeTab, itemsData, entityData, itemColumnDefs, entityColumnDefs, columnDisplayModes]);

  // Call useDynamicGridHeight at top level (Rules of Hooks compliant)
  const { gridHeight } = useDynamicGridHeight({
    data: rowData,
    currentPageSize,
    viewportOffset: 320,
    debug: false,
  });

  // Auto trigger autosize when switching tabs or column definitions change
  useEffect(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      // Small delay to ensure grid has updated with new column definitions
      const timer = setTimeout(() => {
        gridApi.autoSizeAllColumns();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [gridApi, activeTab, columnDefs]);

  // Toggle display mode for items reference columns
  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      toggleDisplayMode(colId);
      
      // Auto trigger autosize after toggle
      setTimeout(() => {
        if (gridApi) {
          gridApi.autoSizeAllColumns();
        }
      }, 50);
    },
    [toggleDisplayMode, gridApi]
  );

  // Handle row clicks
  const handleRowClicked = useCallback(
    (event: RowClickedEvent) => {
      onRowClick(event.data);
    },
    [onRowClick]
  );

  // Handle grid ready
  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);
      
      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);
      
      // Set initial page if needed (for items)
      if (activeTab === 'items' && currentPage > 1) {
        params.api.paginationGoToPage(currentPage - 1);
      }
      
      // Notify parent about grid API
      if (onGridApiReady) {
        onGridApiReady(params.api);
      }
      
      onGridReady(params);
    },
    [onGridReady, activeTab, currentPage, onGridApiReady]
  );

  // Custom menu items (items-specific features)
  const getMainMenuItems = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params: any) => {
      if (activeTab !== 'items' || !params.column) {
        return getPinAndFilterMenuItems(params);
      }

      const colId = params.column.getColId();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseMenuItems: (string | any)[] = [
        'columnFilter',
        'separator',
        'pinSubMenu',
        'separator',
        'autoSizeAll',
      ];

      // Add toggle menu for reference columns only (items tab)
      if (isReferenceColumn(colId)) {
        const currentMode = columnDisplayModes[colId];
        const nextMode = currentMode === 'name' ? 'kode' : 'nama';

        baseMenuItems.push('separator', {
          name: `Tampilkan ${nextMode}`,
          action: () => {
            toggleColumnDisplayMode(colId);
          },
          icon: currentMode === 'name' ? '#' : 'T',
        });
      }

      return baseMenuItems;
    },
    [activeTab, isReferenceColumn, columnDisplayModes, toggleColumnDisplayMode]
  );

  // Overlay template
  const overlayTemplate = useMemo(() => {
    if (activeTab === 'items') {
      if (search) {
        return `<span style="padding: 10px; color: #888;">Tidak ada item dengan nama "${search}"</span>`;
      }
      return '<span style="padding: 10px; color: #888;">Tidak ada data item yang ditemukan</span>';
    } else {
      // Entity overlay
      const isBadgeMode = search.startsWith('#') && (search.includes(':') || search.includes(' #'));
      
      if (search && !isBadgeMode) {
        return `<span style="padding: 10px; color: #888;">${entityConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"</span>`;
      }
      return `<span style="padding: 10px; color: #888;">${entityConfig?.noDataMessage || 'Tidak ada data'}</span>`;
    }
  }, [activeTab, search, entityConfig]);

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
          key="master-data-unified-grid" // Single stable key for all tabs
          ref={dataGridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          onRowClicked={handleRowClicked}
          onGridReady={handleGridReady}
          loading={isLoading}
          overlayNoRowsTemplate={overlayTemplate}
          autoSizeColumns={activeTab === 'items' ? itemColumnsToAutoSize : []}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          mainMenuItems={getMainMenuItems}
          onColumnPinned={onColumnPinned}
          onColumnMoved={onColumnMoved}
          rowNumbers={true}
          domLayout="normal"
          style={{
            width: '100%',
            marginTop: '1rem',
            marginBottom: '1rem',
            height: `${gridHeight}px`,
            transition: 'height 0.3s ease-in-out',
          }}
          // AG Grid Built-in Pagination
          pagination={true}
          paginationPageSize={itemsPerPage}
          suppressPaginationPanel={true}
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

export default MasterDataGrid;