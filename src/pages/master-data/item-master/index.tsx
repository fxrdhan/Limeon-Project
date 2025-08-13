import { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  GridApi,
  GridReadyEvent,
  ColumnPinnedEvent,
  ColumnMovedEvent,
} from 'ag-grid-community';

// Components
import PageTitle from '@/components/page-title';
import { Card } from '@/components/card';
import SearchToolbar from '@/features/shared/components/SearchToolbar';
import { ItemDataTable } from '@/features/item-management/presentation/organisms';
import ItemManagementModal from '@/features/item-management/presentation/templates/item/ItemManagementModal';
import {
  SlidingSelector,
  SlidingSelectorOption,
} from '@/components/shared/sliding-selector';

// New unified entity management
import { EntityMasterPage } from '@/features/item-management/presentation/organisms';

// Simple realtime for all item master data
import { useItemMasterRealtime } from '@/hooks/realtime/useItemMasterRealtime';

// Hooks and utilities
import { useMasterDataManagement } from '@/hooks/useMasterDataManagement';
import {
  useItemGridColumns,
  useColumnVisibility,
} from '@/features/item-management/application/hooks/ui';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { getOrderedSearchColumnsByEntity } from '@/utils/searchColumns';

// Types
import type { Item as ItemDataType } from '@/types/database';
import { FilterSearch } from '@/types/search';

type MasterDataType =
  | 'items'
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units';

// Transform to SlidingSelector format
const TAB_OPTIONS: SlidingSelectorOption<MasterDataType>[] = [
  {
    key: 'items',
    value: 'items',
    defaultLabel: 'Item',
    activeLabel: 'Daftar Item',
  },
  {
    key: 'categories',
    value: 'categories',
    defaultLabel: 'Kategori',
    activeLabel: 'Kategori Item',
  },
  {
    key: 'types',
    value: 'types',
    defaultLabel: 'Jenis',
    activeLabel: 'Jenis Item',
  },
  {
    key: 'packages',
    value: 'packages',
    defaultLabel: 'Kemasan',
    activeLabel: 'Kemasan Item',
  },
  {
    key: 'dosages',
    value: 'dosages',
    defaultLabel: 'Sediaan',
    activeLabel: 'Sediaan Item',
  },
  {
    key: 'manufacturers',
    value: 'manufacturers',
    defaultLabel: 'Produsen',
    activeLabel: 'Produsen Item',
  },
  {
    key: 'units',
    value: 'units',
    defaultLabel: 'Satuan',
    activeLabel: 'Satuan Item',
  },
];

const URL_TO_TAB_MAP: Record<string, MasterDataType> = {
  items: 'items',
  categories: 'categories',
  types: 'types',
  packages: 'packages',
  dosages: 'dosages',
  manufacturers: 'manufacturers',
  units: 'units',
};

const ItemMasterNew = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();

  // Memoize tab detection function
  const getTabFromPath = useCallback((pathname: string): MasterDataType => {
    const pathSegments = pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return URL_TO_TAB_MAP[lastSegment] || 'items';
  }, []);

  const [activeTab, setActiveTab] = useState<MasterDataType>(() =>
    getTabFromPath(location.pathname)
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // AG Grid API reference for items tab filtering
  const [itemGridApi, setItemGridApi] = useState<GridApi | null>(null);

  // ✅ REALTIME WORKING! Use postgres_changes approach
  useItemMasterRealtime({ enabled: true });

  // Update active tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname, activeTab, getTabFromPath]);

  // Items tab states (only needed for items tab)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isItemModalClosing, setIsItemModalClosing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | undefined>(
    undefined
  );
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<
    string | undefined
  >(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);

  // Items tab management (only for items tab)
  const itemsManagement = useMasterDataManagement('items', 'Item', {
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
  });

  // Column visibility management
  const {
    columnOptions,
    visibleColumns,
    isColumnVisible,
    handleColumnToggle,
    getColumnPinning,
    handleColumnPinning,
    orderingState,
    handleColumnOrdering,
  } = useColumnVisibility();

  const { columnDefs: itemColumnDefs, columnsToAutoSize } = useItemGridColumns({
    visibleColumns,
    isColumnVisible,
    getColumnPinning,
    columnOrder: orderingState,
  });

  // Memoize modal handlers
  const openAddItemModal = useCallback(
    (itemId?: string, searchQuery?: string) => {
      setEditingItemId(itemId);
      setCurrentSearchQueryForModal(searchQuery);
      setIsItemModalClosing(false);
      setIsAddItemModalOpen(true);
      setModalRenderId(prevId => prevId + 1);
    },
    []
  );

  const closeAddItemModal = useCallback(() => {
    setIsItemModalClosing(true);
    setTimeout(() => {
      setIsAddItemModalOpen(false);
      setIsItemModalClosing(false);
      setEditingItemId(undefined);
      setCurrentSearchQueryForModal(undefined);
    }, 100);
  }, []);

  // Memoize item handlers
  const handleItemEdit = useCallback(
    (item: ItemDataType) => {
      openAddItemModal(item.id);
    },
    [openAddItemModal]
  );

  const handleItemSelect = useCallback(
    (itemId: string) => {
      openAddItemModal(itemId);
    },
    [openAddItemModal]
  );

  const handleAddItem = useCallback(
    (itemId?: string, searchQuery?: string) => {
      openAddItemModal(itemId, searchQuery);
    },
    [openAddItemModal]
  );

  // Items tab search functionality
  const handleItemSearch = useCallback(
    (searchValue: string) => {
      itemsManagement.setSearch(searchValue);
    },
    [itemsManagement]
  );

  const handleItemClear = useCallback(() => {
    itemsManagement.setSearch('');
  }, [itemsManagement]);

  // Helper function to determine if column uses multi-filter
  const isMultiFilterColumn = useCallback((columnField: string) => {
    const multiFilterColumns = [
      'manufacturer',
      'code',
      'barcode',
      'category.name',
      'type.name',
      'unit.name',
      'dosage.name',
      'package_conversions',
      'stock',
    ];
    return multiFilterColumns.includes(columnField);
  }, []);

  const handleItemFilterSearch = useCallback(
    async (filterSearch: FilterSearch | null) => {
      if (!filterSearch) {
        if (itemGridApi && !itemGridApi.isDestroyed()) {
          itemGridApi.setFilterModel(null);
          itemGridApi.onFilterChanged();
        }
        return;
      }

      if (itemGridApi && !itemGridApi.isDestroyed()) {
        try {
          const isMultiFilter = isMultiFilterColumn(filterSearch.field);

          if (isMultiFilter) {
            // For multi-filter columns, use the multi-filter structure
            const filterType =
              filterSearch.field === 'stock' ? 'number' : 'text';
            await itemGridApi.setColumnFilterModel(filterSearch.field, {
              filterType: 'multi',
              filterModels: [
                {
                  filterType,
                  type: filterSearch.operator,
                  filter: filterSearch.value,
                },
              ],
            });
          } else {
            // For single filter columns, use the original structure
            await itemGridApi.setColumnFilterModel(filterSearch.field, {
              filterType: 'text',
              type: filterSearch.operator,
              filter: filterSearch.value,
            });
          }

          itemGridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply filter:', error);
        }
      }
    },
    [itemGridApi, isMultiFilterColumn]
  );

  // Get ordered search columns based on user preferences
  const orderedSearchColumns = useMemo(() => {
    return getOrderedSearchColumnsByEntity('items', orderingState);
  }, [orderingState]);

  const {
    search: itemSearch,
    onGridReady: itemOnGridReady,
    isExternalFilterPresent: itemIsExternalFilterPresent,
    doesExternalFilterPass: itemDoesExternalFilterPass,
    searchBarProps: itemSearchBarProps,
  } = useUnifiedSearch({
    columns: orderedSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: itemsManagement.data as ItemDataType[],
    onSearch: handleItemSearch,
    onClear: handleItemClear,
    onFilterSearch: handleItemFilterSearch,
  });

  // Enhanced onGridReady to capture grid API for items tab
  const enhancedItemOnGridReady = useCallback(
    (params: GridReadyEvent) => {
      setItemGridApi(params.api);
      itemOnGridReady(params);
    },
    [itemOnGridReady]
  );

  // Cleanup grid API reference when activeTab changes or component unmounts
  useEffect(() => {
    if (activeTab !== 'items') {
      setItemGridApi(null);
    }
  }, [activeTab]);

  // Handle column pinning events
  const handleColumnPinned = useCallback(
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
  const handleColumnMoved = useCallback(
    (event: ColumnMovedEvent) => {
      // Only save if the column was actually moved (not just during initialization)
      if (event.finished && itemGridApi && !itemGridApi.isDestroyed()) {
        try {
          // Get current column order from the grid API
          const allColumns = itemGridApi.getAllGridColumns();
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
          console.error('Failed to update column order:', error);
        }
      }
    },
    [handleColumnOrdering, itemGridApi]
  );


  const handleTabChange = useCallback(
    (_key: string, value: MasterDataType) => {
      if (value !== activeTab) {
        navigate(`/master-data/item-master/${value}`);

        // Clear search when switching tabs
        if (searchInputRef.current) {
          searchInputRef.current.value = '';
        }

        // Reset item modal state when switching tabs
        if (isAddItemModalOpen) {
          closeAddItemModal();
        }
      }
    },
    [activeTab, navigate, isAddItemModalOpen, closeAddItemModal]
  );

  // No need for mouse handlers - handled by SlidingSelector

  // Unified rendering - keep tabs always mounted for smooth animation
  return (
    <>
      <Card>
        <div className="relative flex items-center justify-center mb-0 pt-0">
          <div className="absolute left-0 pb-4 pt-6">
            <SlidingSelector
              options={TAB_OPTIONS}
              activeKey={activeTab}
              onSelectionChange={handleTabChange}
              variant="tabs"
              size="md"
              shape="rounded"
              collapsible={true}
              defaultExpanded={true}
              expandOnHover={true}
              autoCollapseDelay={300}
              layoutId="item-master-tabs"
              animationPreset="smooth"
            />
          </div>

          <PageTitle title="Item Master" />
        </div>

        {/* Conditional content rendering */}
        {activeTab === 'items' ? (
          <>
            <div className="flex items-center pt-8">
              <div className="grow">
                <SearchToolbar
                  searchInputRef={
                    searchInputRef as React.RefObject<HTMLInputElement>
                  }
                  searchBarProps={itemSearchBarProps}
                  search={itemSearch}
                  placeholder="Cari item..."
                  onAdd={() => handleAddItem(undefined, itemSearch)}
                  items={itemsManagement.data as ItemDataType[]}
                  onItemSelect={(item: { id: string }) => handleItemSelect(item.id)}
                  columnOptions={columnOptions}
                  onColumnToggle={handleColumnToggle}
                  gridApi={itemGridApi}
                  exportFilename="daftar-item"
                />
              </div>
            </div>

            <div>
              {itemsManagement.isError ? (
                <div className="text-center p-6 text-red-500">
                  Error:{' '}
                  {itemsManagement.queryError?.message || 'Gagal memuat data'}
                </div>
              ) : (
                <ItemDataTable
                  items={itemsManagement.data as ItemDataType[]}
                  columnDefs={itemColumnDefs}
                  columnsToAutoSize={columnsToAutoSize}
                  isLoading={itemsManagement.isLoading}
                  isError={itemsManagement.isError}
                  error={itemsManagement.queryError}
                  search={itemSearch}
                  currentPage={itemsManagement.currentPage}
                  totalPages={itemsManagement.totalPages}
                  totalItems={itemsManagement.totalItems}
                  itemsPerPage={itemsManagement.itemsPerPage}
                  onRowClick={handleItemEdit}
                  onPageChange={itemsManagement.handlePageChange}
                  onItemsPerPageChange={
                    itemsManagement.handleItemsPerPageChange
                  }
                  onGridReady={enhancedItemOnGridReady}
                  isExternalFilterPresent={itemIsExternalFilterPresent}
                  doesExternalFilterPass={itemDoesExternalFilterPass}
                  onColumnPinned={handleColumnPinned}
                  onColumnMoved={handleColumnMoved}
                />
              )}
            </div>
          </>
        ) : (
          <div className="pt-8">
            <EntityMasterPage />
          </div>
        )}
      </Card>

      {/* Item Management Modal - only render for items tab */}
      {activeTab === 'items' && (
        <ItemManagementModal
          key={`${editingItemId ?? 'new'}-${currentSearchQueryForModal ?? ''}-${modalRenderId}`}
          isOpen={isAddItemModalOpen}
          onClose={closeAddItemModal}
          itemId={editingItemId}
          initialSearchQuery={currentSearchQueryForModal}
          isClosing={isItemModalClosing}
          setIsClosing={setIsItemModalClosing}
        />
      )}
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;
