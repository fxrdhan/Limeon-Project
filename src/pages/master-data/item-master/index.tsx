import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import classNames from 'classnames';

// Components
import PageTitle from '@/components/page-title';
import { Card } from '@/components/card';
import SearchToolbar from '@/features/shared/components/SearchToolbar';
import { ItemDataTable } from '@/features/item-management/presentation/organisms';
import ItemManagementModal from '@/features/item-management/presentation/templates/item/ItemManagementModal';

// New unified entity management
import { EntityMasterPage } from '@/features/item-management/presentation/pages';

// Hooks and utilities
import { useMasterDataManagement } from '@/features/master-data/hooks/useMasterDataManagement';
import { useItemGridColumns } from '@/features/item-management/application/hooks/ui';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { itemSearchColumns } from '@/utils/searchColumns';

// Types
import type { Item as ItemDataType } from '@/types/database';
import { FilterSearch } from '@/types/search';

type MasterDataType = 'items' | 'categories' | 'types' | 'packages' | 'dosages' | 'manufacturers' | 'units';

// Memoize static configurations outside component
const TAB_CONFIGS = {
  items: { key: 'items' as const, label: 'Daftar Item' },
  categories: { key: 'categories' as const, label: 'Kategori' },
  types: { key: 'types' as const, label: 'Jenis' },
  packages: { key: 'packages' as const, label: 'Kemasan' },
  dosages: { key: 'dosages' as const, label: 'Sediaan' },
  manufacturers: { key: 'manufacturers' as const, label: 'Produsen' },
  units: { key: 'units' as const, label: 'Satuan' },
} as const;

const TAB_ORDER: MasterDataType[] = ['items', 'categories', 'types', 'packages', 'dosages', 'manufacturers', 'units'];

const URL_TO_TAB_MAP: Record<string, MasterDataType> = {
  'items': 'items',
  'categories': 'categories', 
  'types': 'types',
  'packages': 'packages',
  'dosages': 'dosages',
  'manufacturers': 'manufacturers',
  'units': 'units'
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

  const [activeTab, setActiveTab] = useState<MasterDataType>(() => getTabFromPath(location.pathname));
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const [editingItemId, setEditingItemId] = useState<string | undefined>(undefined);
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<string | undefined>(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);

  // Items tab management (only for items tab)
  const itemsManagement = useMasterDataManagement('items', 'Item', {
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
    activeTableName: activeTab === 'items' ? 'items' : undefined,
  });

  const { columnDefs: itemColumnDefs, columnsToAutoSize } = useItemGridColumns();

  // Memoize modal handlers
  const openAddItemModal = useCallback((itemId?: string, searchQuery?: string) => {
    setEditingItemId(itemId);
    setCurrentSearchQueryForModal(searchQuery);
    setIsItemModalClosing(false);
    setIsAddItemModalOpen(true);
    setModalRenderId(prevId => prevId + 1);
  }, []);

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
  const handleItemEdit = useCallback((item: ItemDataType) => {
    openAddItemModal(item.id);
  }, [openAddItemModal]);

  const handleItemSelect = useCallback((itemId: string) => {
    openAddItemModal(itemId);
  }, [openAddItemModal]);

  const handleAddItem = useCallback((itemId?: string, searchQuery?: string) => {
    openAddItemModal(itemId, searchQuery);
  }, [openAddItemModal]);

  // Items tab search functionality
  const handleItemSearch = useCallback((searchValue: string) => {
    itemsManagement.setSearch(searchValue);
  }, [itemsManagement]);

  const handleItemClear = useCallback(() => {
    itemsManagement.setSearch('');
  }, [itemsManagement]);

  const handleItemFilterSearch = useCallback(async (filterSearch: FilterSearch | null) => {
    // Handle AG Grid filter for items
    console.log('Item filter search:', filterSearch);
  }, []);

  const {
    search: itemSearch,
    onGridReady: itemOnGridReady,
    isExternalFilterPresent: itemIsExternalFilterPresent,
    doesExternalFilterPass: itemDoesExternalFilterPass,
    searchBarProps: itemSearchBarProps,
  } = useUnifiedSearch({
    columns: itemSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: itemsManagement.data as ItemDataType[],
    onSearch: handleItemSearch,
    onClear: handleItemClear,
    onFilterSearch: handleItemFilterSearch,
  });

  // Memoize SearchToolbar callback props for stable references (after itemSearch is declared)
  const memoizedOnAdd = useCallback(() => {
    handleAddItem(undefined, itemSearch);
  }, [handleAddItem, itemSearch]);

  const memoizedOnItemSelect = useCallback((item: { id: string }) => {
    handleItemSelect(item.id);
  }, [handleItemSelect]);

  const handleTabChange = useCallback((newTab: MasterDataType) => {
    if (newTab !== activeTab) {
      navigate(`/master-data/item-master/${newTab}`);
      
      // Clear search when switching tabs
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
      
      // Reset item modal state when switching tabs
      if (isAddItemModalOpen) {
        closeAddItemModal();
      }
    }
  }, [activeTab, navigate, isAddItemModalOpen, closeAddItemModal]);

  // Use memoized configurations
  const tabConfigs = TAB_CONFIGS;
  const tabOrder = TAB_ORDER;

  // If it's not items tab, use the new EntityMasterPage
  if (activeTab !== 'items') {
    return <EntityMasterPage />;
  }

  // Items tab rendering (legacy functionality preserved)
  return (
    <>
      <Card>
        <div className="relative flex items-center justify-center mb-0 pt-0">
          <div className="absolute left-0 pb-4 pt-6">
            <LayoutGroup id="item-master-tabs">
              <div className="flex items-center rounded-lg bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative w-fit">
                {tabOrder.map(tabKey => {
                  const config = tabConfigs[tabKey];
                  return (
                    <button
                      key={config.key}
                      className={classNames(
                        'group px-4 py-2 rounded-lg focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150',
                        {
                          'hover:bg-emerald-100 hover:text-emerald-700':
                            activeTab !== config.key,
                        }
                      )}
                      onClick={() => handleTabChange(config.key)}
                    >
                      {activeTab === config.key && (
                        <motion.div
                          layoutId="tab-selector-bg"
                          className="absolute inset-0 bg-primary rounded-lg shadow-xs"
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                            duration: 0.3,
                          }}
                        />
                      )}
                      <span
                        className={classNames(
                          'relative z-10 select-none font-medium',
                          {
                            'text-white': activeTab === config.key,
                            'text-gray-700 group-hover:text-emerald-700':
                              activeTab !== config.key,
                          }
                        )}
                      >
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>

          <PageTitle title="Item Master" />
        </div>

        <div className="flex items-center pt-8">
          <div className="grow">
            <SearchToolbar
              searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
              searchBarProps={itemSearchBarProps}
              search={itemSearch}
              buttonText="Tambah Item Baru"
              placeholder="Cari nama, kode, atau deskripsi item atau ketik # untuk pencarian kolom spesifik"
              onAdd={memoizedOnAdd}
              items={itemsManagement.data as ItemDataType[]}
              onItemSelect={memoizedOnItemSelect}
            />
          </div>
        </div>

        <div className={itemsManagement.isFetching ? 'opacity-75 transition-opacity duration-300' : ''}>
          {itemsManagement.isError ? (
            <div className="text-center p-6 text-red-500">
              Error: {itemsManagement.queryError?.message || 'Gagal memuat data'}
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
            onItemsPerPageChange={itemsManagement.handleItemsPerPageChange}
            onGridReady={itemOnGridReady}
            isExternalFilterPresent={itemIsExternalFilterPresent}
            doesExternalFilterPass={itemDoesExternalFilterPass}
          />
          )}
        </div>
      </Card>

      {/* Item Management Modal */}
      <ItemManagementModal
        key={`${editingItemId ?? 'new'}-${currentSearchQueryForModal ?? ''}-${modalRenderId}`}
        isOpen={isAddItemModalOpen}
        onClose={closeAddItemModal}
        itemId={editingItemId}
        initialSearchQuery={currentSearchQueryForModal}
        isClosing={isItemModalClosing}
        setIsClosing={setIsItemModalClosing}
      />
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;