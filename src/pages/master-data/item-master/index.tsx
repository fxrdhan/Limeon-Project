import { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  GridApi,
  GridReadyEvent,
  ColumnPinnedEvent,
  ColumnMovedEvent,
  ColDef,
} from 'ag-grid-community';
import { createTextColumn } from '@/components/ag-grid';

// Components
import PageTitle from '@/components/page-title';
import { Card } from '@/components/card';
import SearchToolbar from '@/features/shared/components/SearchToolbar';
import { MasterDataGrid } from '@/features/item-management/presentation/organisms';
import ItemManagementModal from '@/features/item-management/presentation/templates/item/ItemManagementModal';
import { EntityManagementModal } from '@/features/item-management/presentation/templates/entity';
import {
  SlidingSelector,
  SlidingSelectorOption,
} from '@/components/shared/sliding-selector';

// Simple realtime for all item master data
import { useItemMasterRealtime } from '@/hooks/realtime/useItemMasterRealtime';

// Hooks and utilities
import { useItemsManagement } from '@/hooks/useItemsManagement';
import {
  useItemGridColumns,
  useColumnVisibility,
} from '@/features/item-management/application/hooks/ui';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import {
  getOrderedSearchColumnsByEntity,
  getSearchColumnsByEntity,
} from '@/utils/searchColumns';

// Entity management hooks
import {
  useEntityManager,
  useGenericEntityManagement,
} from '@/features/item-management/application/hooks/collections';
import { useEntityColumnVisibility } from '@/features/item-management/application/hooks/ui';

// Types
import type { Item as ItemDataType } from '@/types/database';
import { FilterSearch } from '@/types/search';
import {
  EntityType,
  EntityData,
} from '@/features/item-management/application/hooks/collections/useEntityManager';

// Testing utilities for random item generation
import { RandomItemFloatingButton } from '@/utils/testing';
import { config } from '@/config';

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

  // Unified Grid API reference from MasterDataGrid
  const [unifiedGridApi, setUnifiedGridApi] = useState<GridApi | null>(null);

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

  // Simple row grouping state (client-side only, no persistence)
  const [isRowGroupingEnabled, setIsRowGroupingEnabled] = useState(false);
  const showGroupPanel = true;
  const defaultExpanded = 1;

  // Simple row grouping toggle (client-side only)
  const handleRowGroupingToggle = useCallback(() => {
    const willBeEnabled = !isRowGroupingEnabled;
    setIsRowGroupingEnabled(willBeEnabled);

    // Clear grouping when disabling
    if (!willBeEnabled && unifiedGridApi && !unifiedGridApi.isDestroyed()) {
      unifiedGridApi.setRowGroupColumns([]);
    }
  }, [isRowGroupingEnabled, unifiedGridApi]);

  // No event handling needed for simple client-side row grouping

  // Clean and simple - no persistence logic needed

  // Simple client-side row grouping - no complex state management needed

  // Items tab management (only for items tab)
  const itemsManagement = useItemsManagement({
    enabled: true,
  });

  // Entity management (for entity tabs)
  const entityManager = useEntityManager({
    activeEntityType:
      activeTab !== 'items' ? (activeTab as EntityType) : 'categories',
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
  });

  // Memoize entity options to prevent unnecessary re-renders
  const entityManagementOptions = useMemo(
    () => ({
      entityType:
        activeTab !== 'items' ? (activeTab as EntityType) : 'categories',
      search: entityManager.search,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: activeTab !== 'items',
    }),
    [activeTab, entityManager.search, entityManager.itemsPerPage]
  );

  // Generic entity data management
  const entityData = useGenericEntityManagement(entityManagementOptions);

  // Column visibility management
  const {
    columnOptions,
    handleColumnToggle,
    getColumnPinning,
    handleColumnPinning,
    orderingState,
    handleColumnOrdering,
    handleColumnVisibilityChangedFromGrid,
  } = useColumnVisibility({ gridApi: unifiedGridApi });

  const { columnDefs: itemColumnDefs, columnsToAutoSize } = useItemGridColumns({
    getColumnPinning,
    columnOrder: orderingState,
  });

  // Entity column visibility management
  const entityCurrentConfig = useMemo(
    () =>
      activeTab !== 'items'
        ? entityManager.entityConfigs[activeTab as EntityType]
        : null,
    [activeTab, entityManager.entityConfigs]
  );

  const {
    columnOptions: entityColumnOptions,
    isColumnVisible: isEntityColumnVisible,
    handleColumnToggle: handleEntityColumnToggle,
    getColumnPinning: getEntityColumnPinning,
    handleColumnPinning: handleEntityColumnPinning,
    orderingState: entityOrderingState,
    handleColumnOrdering: handleEntityColumnOrdering,
    handleColumnVisibilityChangedFromGrid:
      handleEntityColumnVisibilityChangedFromGrid,
  } = useEntityColumnVisibility({
    entityType: activeTab as EntityType,
    currentConfig: entityCurrentConfig,
    gridApi: unifiedGridApi,
  });

  // Entity column definitions (similar to EntityMasterPage logic)
  const entityColumnDefs: ColDef[] = useMemo(() => {
    if (activeTab === 'items' || !entityCurrentConfig) return [];

    // Create column definitions map for ordering
    const columnDefinitionsMap: Record<string, ColDef> = {
      code: {
        ...createTextColumn({
          field: 'code',
          headerName: 'Kode',
          valueGetter: params => params.data?.code || '-',
        }),
        filter: 'agMultiColumnFilter',
        filterParams: {
          filters: [
            { filter: 'agTextColumnFilter' },
            { filter: 'agSetColumnFilter' },
          ],
        },
        suppressHeaderFilterButton: true,
        pinned: getEntityColumnPinning('code') || undefined,
      },
      name: {
        field: 'name',
        headerName: entityCurrentConfig.nameColumnHeader || 'Nama',
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
        pinned: getEntityColumnPinning('name') || undefined,
      },
      // Add NCI Code column for packages and dosages
      ...(entityCurrentConfig.hasNciCode
        ? {
            nci_code: {
              ...createTextColumn({
                field: 'nci_code',
                headerName: 'Kode NCI',
                valueGetter: params => params.data?.nci_code || '-',
              }),
              filter: 'agMultiColumnFilter',
              filterParams: {
                filters: [
                  { filter: 'agTextColumnFilter' },
                  { filter: 'agSetColumnFilter' },
                ],
              },
              suppressHeaderFilterButton: true,
              pinned: getEntityColumnPinning('nci_code') || undefined,
            },
          }
        : {}),
      // Address or description column
      [entityCurrentConfig.hasAddress ? 'address' : 'description']: {
        ...createTextColumn({
          field: entityCurrentConfig.hasAddress ? 'address' : 'description',
          headerName: entityCurrentConfig.hasAddress ? 'Alamat' : 'Deskripsi',
          flex: 1,
          valueGetter: params => {
            if (entityCurrentConfig.hasAddress) {
              return params.data?.address || '-';
            }
            return params.data?.description || '-';
          },
        }),
        suppressHeaderFilterButton: true,
        pinned:
          getEntityColumnPinning(
            entityCurrentConfig.hasAddress ? 'address' : 'description'
          ) || undefined,
      },
    };

    // Handle ordering state - if empty, use natural order from column definitions
    let orderedColumns = entityOrderingState;
    if (orderedColumns.length === 0) {
      // Use natural order from columnDefinitionsMap keys (first time users)
      orderedColumns = Object.keys(columnDefinitionsMap);
    }

    // Create ordered column array
    const orderedColumnDefs = orderedColumns
      .map(fieldName => columnDefinitionsMap[fieldName])
      .filter(Boolean);

    // Add any missing columns that aren't in the order (fallback)
    Object.keys(columnDefinitionsMap).forEach(fieldName => {
      if (!orderedColumns.includes(fieldName)) {
        orderedColumnDefs.push(columnDefinitionsMap[fieldName]);
      }
    });

    // Filter columns based on visibility
    return orderedColumnDefs.filter(column =>
      isEntityColumnVisible(column.field as string)
    );
  }, [
    activeTab,
    entityCurrentConfig,
    isEntityColumnVisible,
    getEntityColumnPinning,
    entityOrderingState,
  ]);

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
        if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
          unifiedGridApi.setFilterModel(null);
          unifiedGridApi.onFilterChanged();
        }
        return;
      }

      if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
        try {
          const isMultiFilter = isMultiFilterColumn(filterSearch.field);

          if (isMultiFilter) {
            // For multi-filter columns, use the multi-filter structure
            const filterType =
              filterSearch.field === 'stock' ? 'number' : 'text';
            await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
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
            await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
              filterType: 'text',
              type: filterSearch.operator,
              filter: filterSearch.value,
            });
          }

          unifiedGridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply filter:', error);
        }
      }
    },
    [unifiedGridApi, isMultiFilterColumn]
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
    clearSearch: clearItemSearch,
  } = useUnifiedSearch({
    columns: orderedSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: itemsManagement.data as ItemDataType[],
    onSearch: handleItemSearch,
    onClear: handleItemClear,
    onFilterSearch: handleItemFilterSearch,
  });

  // Grid API ready callback from MasterDataGrid
  const handleUnifiedGridApiReady = useCallback((api: GridApi | null) => {
    setUnifiedGridApi(api);
  }, []);

  // Enhanced onGridReady to capture grid API for items tab
  const enhancedItemOnGridReady = useCallback(
    (params: GridReadyEvent) => {
      itemOnGridReady(params);
    },
    [itemOnGridReady]
  );

  // Entity search functionality
  const entitySearchColumns = useMemo(() => {
    if (activeTab === 'items') return [];
    return getSearchColumnsByEntity(activeTab as EntityType);
  }, [activeTab]);

  // Entity filter search handler
  const handleEntityFilterSearch = useCallback(
    async (filterSearch: FilterSearch | null) => {
      if (!filterSearch) {
        if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
          unifiedGridApi.setFilterModel(null);
          unifiedGridApi.onFilterChanged();
        }
        return;
      }

      if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
        try {
          // Entity columns are simpler - mostly text filters
          // Special handling for 'code' and 'nci_code' which use multi-filter
          const isMultiFilter =
            filterSearch.field === 'code' || filterSearch.field === 'nci_code';

          if (isMultiFilter) {
            // For multi-filter columns (code, nci_code)
            await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
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
            // For single filter columns (name, description, address)
            await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
              filterType: 'text',
              type: filterSearch.operator,
              filter: filterSearch.value,
            });
          }

          unifiedGridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply entity filter:', error);
        }
      }
    },
    [unifiedGridApi]
  );

  const {
    search: entitySearch,
    onGridReady: entityOnGridReady,
    isExternalFilterPresent: entityIsExternalFilterPresent,
    doesExternalFilterPass: entityDoesExternalFilterPass,
    searchBarProps: entitySearchBarProps,
    clearSearch: clearEntitySearch,
  } = useUnifiedSearch({
    columns: entitySearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: entityData.data,
    onSearch: entityManager.handleSearch,
    onClear: () => entityManager.handleSearch(''),
    onFilterSearch: handleEntityFilterSearch,
  });

  // Cleanup grid API reference when component unmounts
  useEffect(() => {
    return () => {
      setUnifiedGridApi(null);
    };
  }, []);

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
      if (event.finished && unifiedGridApi && !unifiedGridApi.isDestroyed()) {
        try {
          // Get current column order from the grid API
          const allColumns = unifiedGridApi.getAllGridColumns();
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
    [handleColumnOrdering, unifiedGridApi]
  );

  const handleTabChange = useCallback(
    (_key: string, value: MasterDataType) => {
      if (value !== activeTab) {
        navigate(`/master-data/item-master/${value}`);

        // Simple client-side grouping - no need to clear on tab switch

        // Clear search when switching tabs - both DOM value and all React states
        if (searchInputRef.current) {
          searchInputRef.current.value = '';
        }

        // Clear all search states - useUnifiedSearch clearSearch already calls onClear callbacks
        clearItemSearch();
        clearEntitySearch();

        // Clear all filter/badge states
        handleItemFilterSearch(null);
        handleEntityFilterSearch(null);

        // Clear AG Grid filter model if available
        if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
          unifiedGridApi.setFilterModel(null);
          unifiedGridApi.onFilterChanged();
        }

        // Reset item modal state when switching tabs
        if (isAddItemModalOpen) {
          closeAddItemModal();
        }
      }
    },
    [
      activeTab,
      navigate,
      isAddItemModalOpen,
      closeAddItemModal,
      clearItemSearch,
      clearEntitySearch,
      handleItemFilterSearch,
      handleEntityFilterSearch,
      unifiedGridApi,
    ]
  );

  // Unified handlers for MasterDataGrid
  const unifiedRowClickHandler = useCallback(
    (data: ItemDataType | EntityData) => {
      if (activeTab === 'items') {
        // Convert back to base Item type for editing
        const baseItem = data as ItemDataType;
        handleItemEdit(baseItem);
      } else {
        entityManager.openEditModal(data as EntityData);
      }
    },
    [activeTab, handleItemEdit, entityManager]
  );

  const unifiedGridReadyHandler = useCallback(
    (params: GridReadyEvent) => {
      if (activeTab === 'items') {
        enhancedItemOnGridReady(params);
      } else {
        entityOnGridReady(params);
      }
    },
    [activeTab, enhancedItemOnGridReady, entityOnGridReady]
  );

  const unifiedColumnPinnedHandler = useCallback(
    (event: ColumnPinnedEvent) => {
      if (activeTab === 'items') {
        handleColumnPinned(event);
      } else {
        // Entity column pinning logic
        if (event.column && handleEntityColumnPinning) {
          const colId = event.column.getColId();
          let pinned: 'left' | 'right' | null = null;
          if (event.pinned === true || event.pinned === 'left') {
            pinned = 'left';
          } else if (event.pinned === 'right') {
            pinned = 'right';
          }
          handleEntityColumnPinning(colId, pinned);
        }
      }
    },
    [activeTab, handleColumnPinned, handleEntityColumnPinning]
  );

  const unifiedColumnMovedHandler = useCallback(
    (event: ColumnMovedEvent) => {
      if (activeTab === 'items') {
        handleColumnMoved(event);
      } else {
        // Entity column moved logic
        if (event.finished && unifiedGridApi && !unifiedGridApi.isDestroyed()) {
          // 🚨 FIX: Prevent automatic saves during grid initialization
          // Only save if this is a real user drag (has source/toIndex changes)
          const isUserDrag =
            event.column &&
            (event.source === 'uiColumnMoved' ||
              event.source === 'uiColumnDragged');

          if (!isUserDrag) {
            return;
          }

          try {
            const allColumns = unifiedGridApi.getAllGridColumns();
            const newOrder: string[] = [];
            allColumns.forEach(column => {
              const colId = column.getColId();
              if (colId !== 'rowNumber') {
                newOrder.push(colId);
              }
            });
            handleEntityColumnOrdering(newOrder);
          } catch (error) {
            console.error('Failed to update entity column order:', error);
          }
        }
      }
    },
    [activeTab, handleColumnMoved, handleEntityColumnOrdering, unifiedGridApi]
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

        {/* Unified SearchToolbar */}
        <div className="flex items-center pt-8">
          <div className="grow">
            <SearchToolbar
              searchInputRef={
                searchInputRef as React.RefObject<HTMLInputElement>
              }
              searchBarProps={
                activeTab === 'items'
                  ? itemSearchBarProps
                  : entitySearchBarProps
              }
              search={activeTab === 'items' ? itemSearch : entitySearch}
              placeholder={
                activeTab === 'items'
                  ? 'Cari item...'
                  : `${entityCurrentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`
              }
              onAdd={
                activeTab === 'items'
                  ? () => handleAddItem(undefined, itemSearch)
                  : entityManager.openAddModal
              }
              items={
                activeTab === 'items'
                  ? (itemsManagement.data as ItemDataType[])
                  : undefined
              }
              onItemSelect={
                activeTab === 'items'
                  ? (item: { id: string }) => handleItemSelect(item.id)
                  : undefined
              }
              columnOptions={
                activeTab === 'items' ? columnOptions : entityColumnOptions
              }
              onColumnToggle={
                activeTab === 'items'
                  ? handleColumnToggle
                  : handleEntityColumnToggle
              }
              gridApi={unifiedGridApi}
              exportFilename={
                activeTab === 'items'
                  ? 'daftar-item'
                  : activeTab === 'categories'
                    ? 'kategori-item'
                    : activeTab === 'types'
                      ? 'jenis-item'
                      : activeTab === 'packages'
                        ? 'kemasan-item'
                        : activeTab === 'dosages'
                          ? 'sediaan-item'
                          : activeTab === 'manufacturers'
                            ? 'produsen-item'
                            : 'satuan-item'
              }
              // Row grouping props - only for items tab
              isRowGroupingEnabled={activeTab === 'items' ? isRowGroupingEnabled : undefined}
              onRowGroupingToggle={activeTab === 'items' ? handleRowGroupingToggle : undefined}
              showGridModal={activeTab === 'items'}
            />
          </div>

        </div>

        {/* Unified MasterDataGrid */}
        <div>
          <MasterDataGrid
            activeTab={activeTab}
            itemsData={itemsManagement.data as ItemDataType[]}
            entityData={entityData.data}
            isLoading={
              activeTab === 'items'
                ? itemsManagement.isLoading
                : entityData.isLoading
            }
            isError={
              activeTab === 'items'
                ? itemsManagement.isError
                : entityData.isError
            }
            error={
              activeTab === 'items'
                ? itemsManagement.queryError
                : entityData.error
            }
            search={activeTab === 'items' ? itemSearch : entitySearch}
            itemColumnDefs={itemColumnDefs}
            itemColumnsToAutoSize={columnsToAutoSize}
            entityConfig={entityCurrentConfig}
            entityColumnDefs={entityColumnDefs}
            onRowClick={unifiedRowClickHandler}
            onGridReady={unifiedGridReadyHandler}
            isExternalFilterPresent={
              activeTab === 'items'
                ? itemIsExternalFilterPresent
                : entityIsExternalFilterPresent
            }
            doesExternalFilterPass={
              activeTab === 'items'
                ? itemDoesExternalFilterPass
                : entityDoesExternalFilterPass
            }
            onColumnPinned={unifiedColumnPinnedHandler}
            onColumnMoved={unifiedColumnMovedHandler}
            onColumnVisible={
              activeTab === 'items'
                ? handleColumnVisibilityChangedFromGrid
                : handleEntityColumnVisibilityChangedFromGrid
            }
            onGridApiReady={handleUnifiedGridApiReady}
            currentPage={itemsManagement.currentPage}
            itemsPerPage={itemsManagement.itemsPerPage}
            isRowGroupingEnabled={
              activeTab === 'items' ? isRowGroupingEnabled : false
            }
            defaultExpanded={activeTab === 'items' ? defaultExpanded : 1}
            showGroupPanel={activeTab === 'items' ? showGroupPanel : true}
          />
        </div>
      </Card>

      {/* Floating Random Item Generator Button - only for items tab */}
      <RandomItemFloatingButton
        enabled={activeTab === 'items' && config.random_item_generator_enabled}
      />

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

      {/* Entity Management Modal - only render for entity tabs */}
      {activeTab !== 'items' &&
        (entityManager.isAddModalOpen || entityManager.isEditModalOpen) && (
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
            entityName={entityCurrentConfig?.entityName || 'Entity'}
          />
        )}
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;
