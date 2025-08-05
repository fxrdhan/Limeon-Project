import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import classNames from 'classnames';

// Components
import Pagination from '@/components/pagination';
import PageTitle from '@/components/page-title';
import { Card } from '@/components/card';
import { DataGrid, DataGridRef, createTextColumn } from '@/components/ag-grid';
import { TableSkeleton } from '@/components/skeleton';
import {
  ColDef,
  RowClickedEvent,
  GridApi,
  GridReadyEvent,
} from 'ag-grid-community';
import SearchToolbar from '@/features/shared/components/SearchToolbar';

// Hooks and contexts
import {
  useEntityManager,
  useGenericEntityManagement,
} from '../../application/hooks/collections';
import { useItemMasterRealtime } from '@/hooks/realtime/useItemMasterRealtime';
import { EntityManagementModal } from '../templates/entity';

// Types
import {
  EntityType,
  EntityData,
  entityConfigs,
} from '../../application/hooks/collections/useEntityManager';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { itemMasterSearchColumns } from '@/utils/searchColumns';
import { FilterSearch } from '@/types/search';

// Use EntityType directly since it now includes 'items'

// Memoize static configurations outside component
const TAB_ORDER: EntityType[] = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
];

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

const getAutoSizeColumns = (hasNciCode?: boolean) =>
  hasNciCode ? ['kode', 'name', 'nci_code'] : ['kode', 'name'];

const getOverlayTemplate = (
  search: string,
  currentConfig: { searchNoDataMessage?: string; noDataMessage?: string } | null
) => {
  if (search) {
    return `<span style="padding: 10px; color: #888;">${currentConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"</span>`;
  }
  return `<span style="padding: 10px; color: #888;">${currentConfig?.noDataMessage || 'Tidak ada data'}</span>`;
};

const EntityMasterPage: React.FC = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
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
      currentPage: entityManager.currentPage,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: activeTab !== 'items',
    }),
    [
      activeTab,
      entityManager.search,
      entityManager.currentPage,
      entityManager.itemsPerPage,
    ]
  );

  // Generic entity data management - simplified realtime
  const entityData = useGenericEntityManagement(entityManagementOptions);

  // Simple loading state for realtime data

  // Memoize current config to prevent unnecessary re-renders
  const currentConfig = useMemo(
    () => (activeTab !== 'items' ? entityConfigs[activeTab] : null),
    [activeTab]
  );

  // Memoize tab change handler
  const handleTabChange = useCallback(
    (newTab: EntityType) => {
      if (newTab !== activeTab) {
        // Only navigate - URL change will trigger useEffect to handle the rest
        navigate(`/master-data/item-master/${newTab}`);

        // Clear search when switching tabs
        if (searchInputRef.current) {
          searchInputRef.current.value = '';
        }
      }
    },
    [activeTab, navigate]
  );

  // Simple wrappers - no memoization needed

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
          await gridApi.setColumnFilterModel(filterSearch.field, {
            filterType: 'text',
            type: filterSearch.operator,
            filter: filterSearch.value,
          });
          gridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply filter:', error);
        }
      }
    },
    [gridApi]
  );

  // Unified search functionality
  const {
    search,
    onGridReady: originalOnGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: itemMasterSearchColumns,
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
      originalOnGridReady(params);
    },
    [originalOnGridReady]
  );

  // Cleanup grid API reference when activeTab changes or component unmounts
  useEffect(() => {
    return () => {
      // Clear grid API reference on cleanup
      setGridApi(null);
    };
  }, [activeTab]);

  // Memoize column definitions
  const columnDefs: ColDef[] = useMemo(
    () => [
      createTextColumn({
        field: 'kode',
        headerName: 'Kode',
        minWidth: 80,
        valueGetter: params => {
          // Handle different field names: 'kode' for most tables, 'code' for item_units
          return params.data.kode || params.data.code || '-';
        },
      }),
      {
        field: 'name',
        headerName: currentConfig?.nameColumnHeader || 'Nama',
        minWidth: 120,
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
      },
      // Add NCI Code column for packages and dosages
      ...(currentConfig?.hasNciCode
        ? [
            createTextColumn({
              field: 'nci_code',
              headerName: 'Kode NCI',
              minWidth: 120,
              valueGetter: params => params.data.nci_code || '-',
            }),
          ]
        : []),
      // Note: abbreviation field removed as it doesn't exist in item_units table
      createTextColumn({
        field: currentConfig?.hasAddress ? 'address' : 'description',
        headerName: currentConfig?.hasAddress ? 'Alamat' : 'Deskripsi',
        minWidth: 200,
        flex: 1,
        valueGetter: params => {
          if (currentConfig?.hasAddress) {
            return params.data.address || '-';
          }
          return params.data.description || '-';
        },
      }),
    ],
    [currentConfig]
  );

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
  const memoizedButtonText = useMemo(
    () => currentConfig?.addButtonText || 'Tambah',
    [currentConfig?.addButtonText]
  );

  const memoizedPlaceholder = useMemo(
    () =>
      `${currentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`,
    [currentConfig?.searchPlaceholder]
  );

  // If items tab is selected, show message to use main item view
  if (activeTab === 'items') {
    return (
      <>
        <Card>
          <div className="relative flex items-center justify-center mb-0 pt-0">
            <div className="absolute left-0 pb-4 pt-6">
              <LayoutGroup id="entity-master-tabs">
                <div className="flex items-center rounded-lg bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative w-fit">
                  {TAB_ORDER.map(tabKey => {
                    // Handle items tab separately
                    if (tabKey === 'items') {
                      return (
                        <button
                          key="items"
                          className={classNames(
                            'group px-4 py-2 rounded-lg focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150',
                            {
                              'hover:bg-emerald-100 hover:text-emerald-700':
                                activeTab !== 'items',
                            }
                          )}
                          onClick={() => handleTabChange('items' as EntityType)}
                        >
                          {activeTab === ('items' as EntityType) && (
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
                                'text-white': activeTab === 'items',
                                'text-gray-700 group-hover:text-emerald-700':
                                  activeTab !== 'items',
                              }
                            )}
                          >
                            Daftar Item
                          </span>
                        </button>
                      );
                    }

                    // Handle entity tabs
                    const config = entityConfigs[tabKey as EntityType];
                    return (
                      <button
                        key={config.key}
                        className={classNames(
                          'group px-4 py-2 rounded-lg focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150',
                          {
                            'hover:bg-emerald-100 hover:text-emerald-700':
                              (activeTab as EntityType) !== config.key,
                          }
                        )}
                        onClick={() => handleTabChange(config.key)}
                      >
                        {(activeTab as EntityType) === config.key && (
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
                              'text-white':
                                (activeTab as EntityType) === config.key,
                              'text-gray-700 group-hover:text-emerald-700':
                                (activeTab as EntityType) !== config.key,
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

            <PageTitle title="Master Data Entities" />
          </div>
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
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        <div className="relative flex items-center justify-center mb-0 pt-0">
          <div className="absolute left-0 pb-4 pt-6">
            <LayoutGroup id="entity-master-tabs">
              <div className="flex items-center rounded-lg bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative w-fit">
                {TAB_ORDER.map(tabKey => {
                  // Handle items tab separately
                  if (tabKey === 'items') {
                    return (
                      <button
                        key="items"
                        className={classNames(
                          'group px-4 py-2 rounded-lg focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150',
                          {
                            'hover:bg-emerald-100 hover:text-emerald-700':
                              activeTab !== ('items' as EntityType),
                          }
                        )}
                        onClick={() => handleTabChange('items' as EntityType)}
                      >
                        {activeTab === ('items' as EntityType) && (
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
                              'text-white':
                                activeTab === ('items' as EntityType),
                              'text-gray-700 group-hover:text-emerald-700':
                                activeTab !== ('items' as EntityType),
                            }
                          )}
                        >
                          Daftar Item
                        </span>
                      </button>
                    );
                  }

                  // Handle entity tabs
                  const config = entityConfigs[tabKey as EntityType];
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
                            'text-white':
                              (activeTab as EntityType) === config.key,
                            'text-gray-700 group-hover:text-emerald-700':
                              (activeTab as EntityType) !== config.key,
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

          <PageTitle title="Master Data Entities" />
        </div>

        <div className="flex items-center pt-8">
          <div className="grow">
            <SearchToolbar
              searchInputRef={
                searchInputRef as React.RefObject<HTMLInputElement>
              }
              searchBarProps={searchBarProps}
              search={search}
              buttonText={memoizedButtonText}
              placeholder={memoizedPlaceholder}
              onAdd={entityManager.openAddModal}
              onKeyDown={handleKeyDown}
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
          ) : entityData.isLoading && (!entityData.data || entityData.data.length === 0) ? (
            <TableSkeleton
              rows={entityManager.itemsPerPage || 10}
              columns={
                currentConfig?.hasNciCode
                  ? 4
                  : currentConfig?.hasAddress
                    ? 4
                    : 3
              }
              showPagination={true}
              className="mt-4"
            />
          ) : (
            <>
              {/* Background loading indicator for realtime updates */}
              {entityData.isLoading && entityData.data && entityData.data.length > 0 && (
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
                  overlayNoRowsTemplate={getOverlayTemplate(search, currentConfig)}
                  autoSizeColumns={getAutoSizeColumns(
                    currentConfig?.hasNciCode
                  )}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  style={{
                    ...GRID_STYLE,
                    opacity: (entityData.isLoading && entityData.data && entityData.data.length > 0) ? 0.8 : 1,
                    transition: 'opacity 0.2s ease-in-out',
                  }}
                />
              </div>

              <Pagination
                currentPage={entityManager.currentPage}
                totalPages={entityData.totalPages}
                totalItems={entityData.totalItems || 0}
                itemsPerPage={entityManager.itemsPerPage || 10}
                itemsCount={entityData.data?.length || 0}
                onPageChange={entityManager.handlePageChange}
                onItemsPerPageChange={e =>
                  entityManager.handleItemsPerPageChange(Number(e.target.value))
                }
                hideFloatingWhenModalOpen={
                  entityManager.isAddModalOpen || entityManager.isEditModalOpen
                }
              />
            </>
          )}
        </div>
      </Card>

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
