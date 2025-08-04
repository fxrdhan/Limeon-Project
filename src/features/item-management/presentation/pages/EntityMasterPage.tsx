import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import classNames from 'classnames';

// Components
import Pagination from '@/components/pagination';
import PageTitle from '@/components/page-title';
import { Card } from '@/components/card';
import { DataGrid, DataGridRef, createTextColumn } from '@/components/ag-grid';
import { ColDef, RowClickedEvent, GridApi, GridReadyEvent } from 'ag-grid-community';
import SearchToolbar from '@/features/shared/components/SearchToolbar';

// Hooks and contexts
import { useEntityManager, useGenericEntityManagement } from '../../application/hooks/collections';
import { EntityManagementModal } from '../templates/entity';

// Types
import { EntityType, EntityData, entityConfigs } from '../../application/hooks/collections/useEntityManager';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { itemMasterSearchColumns } from '@/utils/searchColumns';
import { FilterSearch } from '@/types/search';

// Use EntityType directly since it now includes 'items'

// Tab order - add items first
const tabOrder: EntityType[] = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
];

const EntityMasterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Get active tab from URL path
  const getTabFromPath = (pathname: string): EntityType => {
    const pathSegments = pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const urlToTabMap: Record<string, EntityType> = {
      'items': 'items',
      'categories': 'categories', 
      'types': 'types',
      'packages': 'packages',
      'dosages': 'dosages',
      'manufacturers': 'manufacturers',
      'units': 'units'
    };
    
    return urlToTabMap[lastSegment] || 'items';
  };

  const [activeTab, setActiveTab] = useState<EntityType>(getTabFromPath(location.pathname));

  // Update active tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname, activeTab]);

  // Entity manager - only for entity types, not items
  const entityManager = useEntityManager({
    activeEntityType: activeTab !== 'items' ? activeTab : 'categories',
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
    onEntityChange: (entityType) => {
      setActiveTab(entityType);
    },
  });

  // Generic entity data management - only for entity types, not items
  const entityData = useGenericEntityManagement({
    entityType: activeTab !== 'items' ? activeTab : 'categories',
    search: entityManager.search,
    currentPage: entityManager.currentPage,
    itemsPerPage: entityManager.itemsPerPage,
    enabled: activeTab !== 'items',
  });

  const currentConfig = activeTab !== 'items' ? entityConfigs[activeTab] : null;

  // Handle tab change
  const handleTabChange = (newTab: EntityType) => {
    if (newTab !== activeTab) {
      navigate(`/master-data/item-master/${newTab}`);
      
      // Only call entityManager for entity types, not items
      if (newTab !== 'items') {
        entityManager.handleEntityTypeChange(newTab as EntityType);
      }
      
      // Clear search when switching tabs
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
    }
  };

  // Handle search
  const handleSearch = useCallback((searchValue: string) => {
    entityManager.handleSearch(searchValue);
  }, [entityManager]);

  const handleClear = useCallback(() => {
    entityManager.handleSearch('');
  }, [entityManager]);

  // Handle filter from search bar
  const handleFilterSearch = useCallback(async (filterSearch: FilterSearch | null) => {
    if (!filterSearch) {
      if (gridApi) {
        gridApi.setFilterModel(null);
        gridApi.onFilterChanged();
      }
      return;
    }
    
    if (gridApi) {
      try {
        await gridApi.setColumnFilterModel(filterSearch.field, {
          filterType: 'text',
          type: filterSearch.operator,
          filter: filterSearch.value
        });
        gridApi.onFilterChanged();
      } catch (error) {
        console.error('Failed to apply filter:', error);
      }
    }
  }, [gridApi]);

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
    onSearch: handleSearch,
    onClear: handleClear,
    onFilterSearch: handleFilterSearch,
  });

  // Enhanced onGridReady to capture grid API
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    originalOnGridReady(params);
  }, [originalOnGridReady]);

  // Column definitions
  const columnDefs: ColDef[] = [
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
          'endsWith'
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
    // Add abbreviation column for units
    ...(currentConfig?.hasAbbreviation
      ? [
          createTextColumn({
            field: 'abbreviation',
            headerName: 'Singkatan',
            minWidth: 100,
            valueGetter: params => params.data.abbreviation || '-',
          }),
        ]
      : []),
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
  ];

  const onRowClicked = (event: RowClickedEvent) => {
    entityManager.openEditModal(event.data);
  };

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

  // If items tab is selected, show message to use main item view
  if (activeTab === 'items') {
    return (
      <>
        <Card>
          <div className="relative flex items-center justify-center mb-0 pt-0">
            <div className="absolute left-0 pb-4 pt-6">
              <LayoutGroup id="entity-master-tabs">
                <div className="flex items-center rounded-lg bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative w-fit">
                  {tabOrder.map(tabKey => {
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
                              'text-white': (activeTab as EntityType) === config.key,
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
              <p>Silakan gunakan halaman utama Item Master untuk mengelola daftar item.</p>
              <p className="text-sm mt-2">Halaman ini khusus untuk manajemen entitas master data.</p>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card className={entityData.isFetching ? 'opacity-75 transition-opacity duration-300' : ''}>
        <div className="relative flex items-center justify-center mb-0 pt-0">
          <div className="absolute left-0 pb-4 pt-6">
            <LayoutGroup id="entity-master-tabs">
              <div className="flex items-center rounded-lg bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative w-fit">
                {tabOrder.map(tabKey => {
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
                              'text-white': activeTab === ('items' as EntityType),
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
                            'text-white': (activeTab as EntityType) === config.key,
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
              searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
              searchBarProps={searchBarProps}
              search={search}
              buttonText={currentConfig?.addButtonText || 'Tambah'}
              placeholder={`${currentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`}
              onAdd={entityManager.openAddModal}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {entityData.isError ? (
          <div className="text-center p-6 text-red-500">
            Error: {entityData.error?.message || 'Gagal memuat data'}
          </div>
        ) : (
          <>
            <DataGrid
              ref={dataGridRef}
              rowData={entityData.data}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={entityData.isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">${currentConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"</span>`
                  : `<span style="padding: 10px; color: #888;">${currentConfig?.noDataMessage || 'Tidak ada data'}</span>`
              }
              autoSizeColumns={
                currentConfig?.hasNciCode
                  ? ['kode', 'name', 'nci_code']
                  : ['kode', 'name']
              }
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              style={{
                width: '100%',
                marginTop: '1rem',
                marginBottom: '1rem',
              }}
            />
            <Pagination
              currentPage={entityManager.currentPage}
              totalPages={entityData.totalPages}
              totalItems={entityData.totalItems || 0}
              itemsPerPage={entityManager.itemsPerPage || 10}
              itemsCount={entityData.data?.length || 0}
              onPageChange={entityManager.handlePageChange}
              onItemsPerPageChange={(e) => entityManager.handleItemsPerPageChange(Number(e.target.value))}
              hideFloatingWhenModalOpen={entityManager.isAddModalOpen || entityManager.isEditModalOpen}
            />
          </>
        )}
      </Card>

      {/* Entity Management Modal */}
      <EntityManagementModal
        isOpen={entityManager.isAddModalOpen || entityManager.isEditModalOpen}
        onClose={entityManager.isEditModalOpen ? entityManager.closeEditModal : entityManager.closeAddModal}
        onSubmit={entityManager.handleSubmit}
        initialData={entityManager.editingEntity}
        onDelete={entityManager.editingEntity ? () => entityManager.handleDelete(entityManager.editingEntity!) : undefined}
        isLoading={false}
        isDeleting={false}
        entityName={currentConfig?.entityName || 'Entity'}
      />
    </>
  );
};

export default EntityMasterPage;