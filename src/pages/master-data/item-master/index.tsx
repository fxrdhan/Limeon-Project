import { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GridApi, GridReadyEvent, ColDef } from 'ag-grid-community';
import { createTextColumn } from '@/components/ag-grid';

// Components
import PageTitle from '@/components/page-title';
import { Card } from '@/components/card';
import SearchToolbar from '@/features/shared/components/SearchToolbar';
import { EntityGrid } from '@/features/item-management/presentation/organisms';
import ItemModal from '@/features/item-management/presentation/templates/item/ItemModal';
import { EntityModal } from '@/features/item-management/presentation/templates/entity';
import {
  SlidingSelector,
  SlidingSelectorOption,
} from '@/components/shared/sliding-selector';

// Simple realtime for all item master data
import { useItemsSync } from '@/hooks/realtime/useItemsSync';

// Hooks and utilities
import { useItemsManagement } from '@/hooks/data/useItemsManagement';
import { useItemGridColumns } from '@/features/item-management/application/hooks/ui';
import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import {
  getOrderedSearchColumnsByEntity,
  getSearchColumnsByEntity,
} from '@/utils/searchColumns';

// Entity management hooks
import {
  useEntityManager,
  useEntity,
} from '@/features/item-management/application/hooks/collections';

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

// Session storage key for last visited tab
const LAST_TAB_SESSION_KEY = 'item_master_last_tab';

// Session storage utility
const saveLastTabToSession = (tab: MasterDataType): void => {
  try {
    sessionStorage.setItem(LAST_TAB_SESSION_KEY, tab);
  } catch (error) {
    console.warn('Failed to save last tab to session storage:', error);
  }
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
  useItemsSync({ enabled: true });

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

  // 🎨 Grid restoration loading state (prevents flash during tab switch to items)
  const [isGridRestoring, setIsGridRestoring] = useState(false);

  // Enhanced row grouping state with multi-grouping support (client-side only, no persistence)
  const [isRowGroupingEnabled] = useState(true);
  const showGroupPanel = true;
  const defaultExpanded = -1; // -1 means expand all groups by default

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
  const entityData = useEntity(entityManagementOptions);

  // Preload item_units data in background for better caching
  useEntity({
    entityType: 'units',
    enabled: true, // Always fetch units data for complete cache
  });

  const { columnDefs: itemColumnDefs, columnsToAutoSize } =
    useItemGridColumns();

  // Update active tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      // Save tab to session storage when URL changes (for direct navigation)
      saveLastTabToSession(newTab);
    }
  }, [location.pathname, activeTab, getTabFromPath]);

  // Entity column visibility management
  const entityCurrentConfig = useMemo(
    () =>
      activeTab !== 'items'
        ? entityManager.entityConfigs[activeTab as EntityType]
        : null,
    [activeTab, entityManager.entityConfigs]
  );

  // Entity column definitions with unique field IDs per table
  const entityColumnDefs: ColDef[] = useMemo(() => {
    if (activeTab === 'items' || !entityCurrentConfig) return [];

    // 🎯 Create unique field IDs by prefixing with entity type
    const tablePrefix = activeTab as string;

    const columns: ColDef[] = [
      {
        ...createTextColumn({
          field: `${tablePrefix}.code`, // ← UNIQUE: packages.code, dosages.code, etc
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
      },
      {
        field: `${tablePrefix}.name`, // ← UNIQUE: packages.name, dosages.name, etc
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
        valueGetter: params => params.data?.name || '-',
        // Remove hardcoded sortable, resizable - let saved state control these
        suppressHeaderFilterButton: true,
      },
    ];

    // Add NCI Code column for packages and dosages
    if (entityCurrentConfig.hasNciCode) {
      columns.push({
        ...createTextColumn({
          field: `${tablePrefix}.nci_code`, // ← UNIQUE: packages.nci_code vs dosages.nci_code
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
      });
    }

    // Add address or description column
    columns.push({
      ...createTextColumn({
        field: `${tablePrefix}.${entityCurrentConfig.hasAddress ? 'address' : 'description'}`, // ← UNIQUE per table
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
    });

    return columns;
  }, [activeTab, entityCurrentConfig]);

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
          // Determine filter type: number for numeric columns, text for others
          const isNumericColumn = [
            'stock',
            'base_price',
            'sell_price',
          ].includes(filterSearch.field);
          const filterType = isNumericColumn ? 'number' : 'text';

          await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
            filterType,
            type: filterSearch.operator,
            filter: filterSearch.value,
          });

          unifiedGridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply filter:', error);
        }
      }
    },
    [unifiedGridApi]
  );

  // Get search columns for items (use default ordering since AG Grid sidebar handles column order)
  const orderedSearchColumns = useMemo(() => {
    return getOrderedSearchColumnsByEntity('items', []);
  }, []);

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
          // 🎯 Convert field names to table-specific format
          const tablePrefix = activeTab as string;
          const tablePrefixedField = `${tablePrefix}.${filterSearch.field}`;

          // Entity columns are simpler - mostly text filters
          // Special handling for 'code' and 'nci_code' which use multi-filter
          const isMultiFilter =
            filterSearch.field === 'code' || filterSearch.field === 'nci_code';

          if (isMultiFilter) {
            // For multi-filter columns (code, nci_code)
            await unifiedGridApi.setColumnFilterModel(tablePrefixedField, {
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
            await unifiedGridApi.setColumnFilterModel(tablePrefixedField, {
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
    [unifiedGridApi, activeTab]
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

  // Auto-focus searchbar on keyboard input (text only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is already typing in an input/textarea/select
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // If already focused on an input, don't interfere
      if (isInputFocused) return;

      // Check if it's a text character (letters, numbers, space)
      // Exclude special keys like Ctrl, Alt, Shift, Arrow keys, Escape, etc.
      const isTextChar =
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !/^F\d+$/.test(e.key); // Exclude function keys

      if (isTextChar && searchInputRef.current) {
        // Focus the search input
        searchInputRef.current.focus();

        // The character will be automatically typed into the input
        // because we're not preventing default behavior
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTabChange = useCallback(
    (_key: string, value: MasterDataType) => {
      if (value !== activeTab) {
        // 🎨 Show loading overlay BEFORE navigation (prevents flash)
        // Only when switching TO items tab (complex state restoration)
        const isToItemsTab = value === 'items';
        if (isToItemsTab) {
          setIsGridRestoring(true);
          console.log('🎨 Pre-navigation: Grid restoration loading started');
        }

        navigate(`/master-data/item-master/${value}`);

        // Save selected tab to session storage for future visits
        saveLastTabToSession(value);

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

  // Tab navigation handlers for keyboard shortcuts
  const handleTabNext = useCallback(() => {
    const currentIndex = TAB_OPTIONS.findIndex(opt => opt.value === activeTab);
    const nextIndex =
      currentIndex < TAB_OPTIONS.length - 1 ? currentIndex + 1 : 0;
    const nextTab = TAB_OPTIONS[nextIndex];
    handleTabChange(nextTab.key, nextTab.value);
  }, [activeTab, handleTabChange]);

  const handleTabPrevious = useCallback(() => {
    const currentIndex = TAB_OPTIONS.findIndex(opt => opt.value === activeTab);
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : TAB_OPTIONS.length - 1;
    const prevTab = TAB_OPTIONS[prevIndex];
    handleTabChange(prevTab.key, prevTab.value);
  }, [activeTab, handleTabChange]);

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

  // Removed unified column handlers - now handled by live save in MasterDataGrid

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
              defaultExpanded={false}
              expandOnHover={true}
              autoCollapseDelay={150}
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
              onTabNext={handleTabNext}
              onTabPrevious={handleTabPrevious}
            />
          </div>
        </div>

        {/* Unified MasterDataGrid */}
        <div>
          <EntityGrid
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
            onGridApiReady={handleUnifiedGridApiReady}
            itemsPerPage={itemsManagement.itemsPerPage}
            isRowGroupingEnabled={
              activeTab === 'items' ? isRowGroupingEnabled : false
            }
            defaultExpanded={activeTab === 'items' ? defaultExpanded : 1}
            showGroupPanel={activeTab === 'items' ? showGroupPanel : true}
            isGridRestoring={isGridRestoring}
            onRestorationComplete={() => setIsGridRestoring(false)}
          />
        </div>
      </Card>

      {/* Floating Random Item Generator Button - only for items tab */}
      <RandomItemFloatingButton
        enabled={activeTab === 'items' && config.random_item_generator_enabled}
      />

      {/* Item Management Modal - only render for items tab */}
      {activeTab === 'items' && (
        <ItemModal
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
          <EntityModal
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
