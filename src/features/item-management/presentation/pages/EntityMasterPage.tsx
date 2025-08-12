import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from 'react';
import { useLocation } from 'react-router-dom';
// Components
import {
  DataGrid,
  DataGridRef,
  createTextColumn,
  getPinAndFilterMenuItems,
} from '@/components/ag-grid';
import { TableSkeleton } from '@/components/skeleton';
import { AGGridPagination } from '@/components/pagination';
import {
  ColDef,
  RowClickedEvent,
  GridApi,
  GridReadyEvent,
  ColumnPinnedEvent,
  ColumnMovedEvent,
} from 'ag-grid-community';
import SearchToolbar from '@/features/shared/components/SearchToolbar';

// Hooks and contexts
import {
  useEntityManager,
  useGenericEntityManagement,
} from '../../application/hooks/collections';
import { useEntityColumnVisibility } from '../../application/hooks/ui';
import { useItemMasterRealtime } from '@/hooks/realtime/useItemMasterRealtime';
import { EntityManagementModal } from '../templates/entity';

// Types
import {
  EntityType,
  EntityData,
} from '../../application/hooks/collections/useEntityManager';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { getSearchColumnsByEntity } from '@/utils/searchColumns';
import { FilterSearch } from '@/types/search';
import { useDynamicGridHeight } from '@/hooks/useDynamicGridHeight';

// Use EntityType directly since it now includes 'items'

// Memoize static configurations outside component

const URL_TO_TAB_MAP: Record<string, EntityType> = {
  items: 'items',
  categories: 'categories',
  types: 'types',
  packages: 'packages',
  dosages: 'dosages',
  manufacturers: 'manufacturers',
  units: 'units',
};

// Static grid configuration
const GRID_STYLE = {
  width: '100%',
  marginTop: '1rem',
  marginBottom: '1rem',
} as const;

const getOverlayTemplate = (
  search: string,
  currentConfig: { searchNoDataMessage?: string; noDataMessage?: string } | null
) => {
  // Skip overlay error message for badge mode (filter search)
  // Badge mode uses AG Grid native filtering, so no need for custom overlay
  const isBadgeMode =
    search.startsWith('#') && (search.includes(':') || search.includes(' #'));

  if (search && !isBadgeMode) {
    return `<span style="padding: 10px; color: #888;">${currentConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"</span>`;
  }
  return `<span style="padding: 10px; color: #888;">${currentConfig?.noDataMessage || 'Tidak ada data'}</span>`;
};

const EntityMasterPage: React.FC = memo(() => {
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);
  
  // Memoize tab detection function
  const getTabFromPath = useCallback((pathname: string): EntityType => {
    const pathSegments = pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return URL_TO_TAB_MAP[lastSegment] || 'items';
  }, []);

  const [activeTab, setActiveTab] = useState<EntityType>(() =>
    getTabFromPath(location.pathname)
  );

  // Simple realtime for all item master data
  useItemMasterRealtime({ enabled: true });

  // Update active tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    setActiveTab(prev => (prev !== newTab ? newTab : prev));
  }, [location.pathname, getTabFromPath]);

  // Entity manager - only for entity types, not items
  const entityManager = useEntityManager({
    activeEntityType: activeTab !== 'items' ? activeTab : 'categories',
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
    // Remove onEntityChange to prevent circular dependency
    // activeTab is already managed by URL changes
  });

  // Memoize options to prevent unnecessary re-renders
  const entityManagementOptions = useMemo(
    () => ({
      entityType: activeTab !== 'items' ? activeTab : 'categories',
      search: entityManager.search,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: activeTab !== 'items',
    }),
    [
      activeTab,
      entityManager.search,
      entityManager.itemsPerPage,
    ]
  );

  // Generic entity data management - simplified realtime
  const entityData = useGenericEntityManagement(entityManagementOptions);
  
  // Use dynamic grid height hook
  const { gridHeight } = useDynamicGridHeight({
    data: entityData.data,
    currentPageSize,
    viewportOffset: 320, // navbar + toolbar + pagination + margins + bottom pagination
    debug: false,
  });

  // Simple loading state for realtime data

  // Memoize current config to prevent unnecessary re-renders
  const currentConfig = useMemo(
    () =>
      activeTab !== 'items' ? entityManager.entityConfigs[activeTab] : null,
    [activeTab, entityManager.entityConfigs]
  );

  // Column visibility management
  const {
    columnOptions,
    isColumnVisible,
    handleColumnToggle,
    autoSizeColumns,
    getColumnPinning,
    handleColumnPinning,
    orderingState,
    handleColumnOrdering,
  } = useEntityColumnVisibility({
    entityType: activeTab,
    currentConfig,
  });

  // Simple wrappers - no memoization needed

  // Helper function to determine if column uses multi-filter
  const isMultiFilterColumn = useCallback((columnField: string) => {
    const multiFilterColumns = ['code', 'nci_code'];
    return multiFilterColumns.includes(columnField);
  }, []);

  // Handle filter from search bar
  const handleFilterSearch = useCallback(
    async (filterSearch: FilterSearch | null) => {
      if (!filterSearch) {
        if (gridApi && !gridApi.isDestroyed()) {
          gridApi.setFilterModel(null);
          gridApi.onFilterChanged();
        }
        return;
      }

      if (gridApi && !gridApi.isDestroyed()) {
        try {
          const isMultiFilter = isMultiFilterColumn(filterSearch.field);

          if (isMultiFilter) {
            // For multi-filter columns, use the multi-filter structure
            await gridApi.setColumnFilterModel(filterSearch.field, {
              filterType: 'multi',
              filterModels: [
                {
                  filterType: 'text',
                  type: filterSearch.operator,
                  filter: filterSearch.value,
                },
              ],
            });
          } else {
            // For single filter columns, use the original structure
            await gridApi.setColumnFilterModel(filterSearch.field, {
              filterType: 'text',
              type: filterSearch.operator,
              filter: filterSearch.value,
            });
          }

          gridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply filter:', error);
        }
      }
    },
    [gridApi, isMultiFilterColumn]
  );

  // Get search columns for current tab
  const searchColumns = useMemo(() => {
    return getSearchColumnsByEntity(activeTab);
  }, [activeTab]);

  // Unified search functionality
  const {
    search,
    onGridReady: originalOnGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: searchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: entityData.data,
    onSearch: entityManager.handleSearch,
    onClear: () => entityManager.handleSearch(''),
    onFilterSearch: handleFilterSearch,
  });

  // Enhanced onGridReady to capture grid API
  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);
      
      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);
      
      // Set initial page if needed
      if (entityManager.currentPage > 1) {
        params.api.paginationGoToPage(entityManager.currentPage - 1);
      }
      
      originalOnGridReady(params);
    },
    [originalOnGridReady, entityManager.currentPage]
  );


  // Cleanup grid API reference when activeTab changes or component unmounts
  useEffect(() => {
    return () => {
      // Clear grid API reference on cleanup
      setGridApi(null);
    };
  }, [activeTab]);

  // Handle column pinning events
  const handleEntityColumnPinned = useCallback(
    (event: ColumnPinnedEvent) => {
      // Save pinning state to database
      if (event.column && handleColumnPinning) {
        const colId = event.column.getColId();
        // AG Grid returns true for left pin, 'right' for right pin, false/null/undefined for unpinned
        let pinned: 'left' | 'right' | null = null;
        if (event.pinned === true || event.pinned === 'left') {
          pinned = 'left';
        } else if (event.pinned === 'right') {
          pinned = 'right';
        }
        handleColumnPinning(colId, pinned);
      }
    },
    [handleColumnPinning]
  );

  // Handle column moved events
  const handleEntityColumnMoved = useCallback(
    (event: ColumnMovedEvent) => {
      // Only save if the column was actually moved (not just during initialization)
      if (event.finished && gridApi && !gridApi.isDestroyed()) {
        try {
          // Get current column order from the grid API
          const allColumns = gridApi.getAllGridColumns();
          const newOrder: string[] = [];

          allColumns.forEach(column => {
            const colId = column.getColId();
            // Skip the row number column as it's not movable and not part of ordering
            if (colId !== 'rowNumber') {
              newOrder.push(colId);
            }
          });

          // Save new column order
          handleColumnOrdering(newOrder);
        } catch (error) {
          console.error('Failed to update entity column order:', error);
        }
      }
    },
    [handleColumnOrdering, gridApi]
  );

  // Memoize column definitions
  const columnDefs: ColDef[] = useMemo(() => {
    // Create column definitions map for ordering
    const columnDefinitionsMap: Record<string, ColDef> = {
      code: {
        ...createTextColumn({
          field: 'code',
          headerName: 'Kode',

          valueGetter: params => {
            // All master data tables now use 'code'
            return params.data.code || '-';
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
        pinned: getColumnPinning('code') || undefined,
      },
      name: {
        field: 'name',
        headerName: currentConfig?.nameColumnHeader || 'Nama',

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
        cellStyle: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        tooltipField: 'name',
        sortable: true,
        resizable: true,
        suppressHeaderFilterButton: true,
        pinned: getColumnPinning('name') || undefined,
      },
      // Add NCI Code column for packages and dosages
      ...(currentConfig?.hasNciCode
        ? {
            nci_code: {
              ...createTextColumn({
                field: 'nci_code',
                headerName: 'Kode NCI',

                valueGetter: params => params.data.nci_code || '-',
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
              pinned: getColumnPinning('nci_code') || undefined,
            },
          }
        : {}),
      // Address or description column
      [currentConfig?.hasAddress ? 'address' : 'description']: {
        ...createTextColumn({
          field: currentConfig?.hasAddress ? 'address' : 'description',
          headerName: currentConfig?.hasAddress ? 'Alamat' : 'Deskripsi',

          flex: 1,
          valueGetter: params => {
            if (currentConfig?.hasAddress) {
              return params.data.address || '-';
            }
            return params.data.description || '-';
          },
        }),
        suppressHeaderFilterButton: true,
        pinned:
          getColumnPinning(
            currentConfig?.hasAddress ? 'address' : 'description'
          ) || undefined,
      },
    };

    // Default column order if not specified
    const defaultOrder = ['code', 'name'];
    if (currentConfig?.hasNciCode) defaultOrder.push('nci_code');
    defaultOrder.push(currentConfig?.hasAddress ? 'address' : 'description');

    // Use provided order or default order
    const orderedColumns = orderingState.length > 0 ? orderingState : defaultOrder;

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

    // Use ordered columns
    const allColumns = orderedColumnDefs;

    // Filter columns based on visibility
    return allColumns.filter(column => isColumnVisible(column.field as string));
  }, [currentConfig, isColumnVisible, getColumnPinning, orderingState]);

  const onRowClicked = useCallback(
    (event: RowClickedEvent) => {
      entityManager.openEditModal(event.data);
    },
    [entityManager]
  );


  // Use static functions - no memoization needed

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (entityData.hasData) {
          const firstEntity = entityData.data[0] as EntityData;
          entityManager.openEditModal(firstEntity);
        } else if (entityManager.search.trim() !== '') {
          entityManager.openAddModal();
        }
      }
    },
    [entityData.hasData, entityData.data, entityManager]
  );


  // Memoize SearchToolbar props for stable references

  const memoizedPlaceholder = useMemo(
    () =>
      `${currentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`,
    [currentConfig?.searchPlaceholder]
  );

  // If items tab is selected, redirect to parent (handled by ItemMasterNew)
  if (activeTab === 'items') {
    return (
      <div className="text-center p-8">
        <div className="text-gray-500 text-lg">
          <p>
            Silakan gunakan halaman utama Item Master untuk mengelola daftar
            item.
          </p>
          <p className="text-sm mt-2">
            Halaman ini khusus untuk manajemen entitas master data.
          </p>
        </div>
      </div>
    );
  }

  // Entity content only - navigation handled by parent
  return (
    <>
      <div className="flex items-center pt-0">
        <div className="grow">
          <SearchToolbar
            searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
            searchBarProps={searchBarProps}
            search={search}
            placeholder={memoizedPlaceholder}
            onAdd={entityManager.openAddModal}
            onKeyDown={handleKeyDown}
            columnOptions={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>
      </div>

      <div
        className={
          entityData.isFetching
            ? 'opacity-75 transition-opacity duration-300'
            : ''
        }
      >
        {entityData.isError ? (
          <div className="text-center p-6 text-red-500">
            Error: {entityData.error?.message || 'Gagal memuat data'}
          </div>
        ) : entityData.isLoading && entityData.totalItems === 0 ? (
          <TableSkeleton
            rows={entityManager.itemsPerPage || 10}
            columns={
              currentConfig?.hasNciCode ? 4 : currentConfig?.hasAddress ? 4 : 3
            }
            showPagination={true}
            className="mt-4"
          />
        ) : (
          <>
            {/* Background loading indicator for realtime updates */}
            {entityData.isLoading && entityData.totalItems > 0 && (
              <div className="absolute top-0 right-0 z-10 mt-2 mr-4">
                <div className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm shadow-sm">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memperbarui data...</span>
                </div>
              </div>
            )}

            <div className="relative">
              <DataGrid
                key={`entity-grid-${activeTab}`}
                ref={dataGridRef}
                rowData={entityData.data}
                columnDefs={columnDefs}
                onRowClicked={onRowClicked}
                onGridReady={onGridReady}
                loading={false}
                overlayNoRowsTemplate={getOverlayTemplate(
                  search,
                  currentConfig
                )}
                autoSizeColumns={autoSizeColumns}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
                mainMenuItems={getPinAndFilterMenuItems}
                onColumnPinned={handleEntityColumnPinned}
                onColumnMoved={handleEntityColumnMoved}
                rowNumbers={true}
                domLayout="normal"
                style={{
                  ...GRID_STYLE,
                  height: `${gridHeight}px`, // Dynamic height based on pagination size
                  opacity:
                    entityData.isLoading && entityData.totalItems > 0 ? 0.8 : 1,
                  transition: 'opacity 0.2s ease-in-out, height 0.3s ease-in-out',
                }}
                // AG Grid Pagination (hidden - we'll use custom component)
                pagination={true}
                paginationPageSize={entityManager.itemsPerPage || 10}
                suppressPaginationPanel={true} // Hide AG Grid's built-in pagination UI
              />
              
              {/* Custom Pagination Component using AG Grid API */}
              <AGGridPagination
                gridApi={gridApi}
                pageSizeOptions={[10, 20, 50, 100]}
                enableFloating={true}
                hideFloatingWhenModalOpen={false}
                onPageSizeChange={setCurrentPageSize}
              />
            </div>
          </>
        )}
      </div>

      {/* Entity Management Modal - Only render when modal is open */}
      {(entityManager.isAddModalOpen || entityManager.isEditModalOpen) && (
        <EntityManagementModal
          isOpen={true}
          onClose={
            entityManager.isEditModalOpen
              ? entityManager.closeEditModal
              : entityManager.closeAddModal
          }
          onSubmit={entityManager.handleSubmit}
          initialData={entityManager.editingEntity}
          onDelete={
            entityManager.editingEntity
              ? () => entityManager.handleDelete(entityManager.editingEntity!)
              : undefined
          }
          isLoading={false}
          isDeleting={false}
          entityName={currentConfig?.entityName || 'Entity'}
        />
      )}
    </>
  );
});

EntityMasterPage.displayName = 'EntityMasterPage';

export default EntityMasterPage;
