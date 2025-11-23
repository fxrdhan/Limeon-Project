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

  // Use getDerivedStateFromProps to sync activeTab with URL changes
  const [tabState, setTabState] = useState<{
    pathname: string;
    activeTab: MasterDataType;
  }>(() => {
    const initialTab = getTabFromPath(location.pathname);
    return { pathname: location.pathname, activeTab: initialTab };
  });
  if (location.pathname !== tabState.pathname) {
    const newTab = getTabFromPath(location.pathname);
    setTabState({ pathname: location.pathname, activeTab: newTab });
    // Save tab to session storage when URL changes
    saveLastTabToSession(newTab);
  }
  const activeTab = tabState.activeTab;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 🚦 Hybrid tab change protection: immediate first click, debounced rapid clicks
  // Smart detection: single click = instant navigation, rapid clicks = debounced to final tab
  const lastNavigationTimeRef = useRef<number>(0);
  const pendingTabRef = useRef<MasterDataType | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const TAB_CHANGE_COOLDOWN_MS = 250; // Cooldown period to detect rapid clicking

  // Unified Grid API reference from MasterDataGrid
  const [unifiedGridApi, setUnifiedGridApi] = useState<GridApi | null>(null);

  // Track visible and ordered columns from AG Grid
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

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

  // 🔒 Flag to block SearchBar from clearing grid filters during tab switch
  const isTabSwitchingRef = useRef(false);

  // 📌 Track the last applied filter field to clear it when changing columns
  const lastFilterFieldRef = useRef<string | null>(null);

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

  const { columnDefs: itemColumnDefs } = useItemGridColumns();

  // activeTab auto-syncs with URL changes via getDerivedStateFromProps pattern
  // Clear pending tab changes when URL changes externally
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    if (newTab !== activeTab) {
      // Clear any pending tab change when URL changes externally
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingTabRef.current = null;
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
      // 🔒 Block grid filter changes during tab switching
      // SearchBar will call this with null when clearing, but we want to preserve grid filters
      if (isTabSwitchingRef.current) {
        // console.log('🔒 Blocked grid filter change during tab switch');
        return;
      }

      if (!filterSearch) {
        if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
          unifiedGridApi.setFilterModel(null);
          unifiedGridApi.onFilterChanged();
        }
        // Clear the tracked filter field
        lastFilterFieldRef.current = null;
        return;
      }

      if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
        // 🔧 Clear old filter when changing columns (editing column badge)
        // If the field changed, clear the previous field's filter first
        if (
          lastFilterFieldRef.current &&
          lastFilterFieldRef.current !== filterSearch.field
        ) {
          try {
            await unifiedGridApi.setColumnFilterModel(
              lastFilterFieldRef.current,
              null
            );
          } catch (error) {
            console.error('Failed to clear old filter:', error);
          }
        }
        try {
          // Determine filter type based on column configuration
          const isNumericColumn = [
            'stock',
            'base_price',
            'sell_price',
          ].includes(filterSearch.field);

          // Columns that use agMultiColumnFilter
          const isMultiFilterColumn = [
            'manufacturer.name',
            'category.name',
            'type.name',
            'package.name',
            'dosage.name',
          ].includes(filterSearch.field);

          // Handle multi-condition filters (AND/OR)
          if (filterSearch.isMultiCondition && filterSearch.conditions) {
            console.log('[handleItemFilterSearch] Multi-condition detected!', {
              field: filterSearch.field,
              conditions: filterSearch.conditions,
              joinOperator: filterSearch.joinOperator,
            });

            const baseFilterType = isNumericColumn ? 'number' : 'text';

            // Build conditions array for AG Grid
            const agConditions = filterSearch.conditions.map(cond => {
              const baseCondition: {
                filterType: string;
                type: string;
                filter: number | string;
                filterTo?: number | string;
              } = {
                filterType: baseFilterType,
                type: cond.operator,
                filter: isNumericColumn ? Number(cond.value) : cond.value,
              };

              // Add filterTo for inRange (Between) operator
              if (cond.operator === 'inRange' && cond.valueTo) {
                baseCondition.filterTo = isNumericColumn
                  ? Number(cond.valueTo)
                  : cond.valueTo;
              }

              return baseCondition;
            });

            console.log(
              '[handleItemFilterSearch] AG Grid conditions:',
              agConditions
            );

            // Build combined filter model
            const combinedModel = {
              filterType: baseFilterType,
              operator: filterSearch.joinOperator || 'AND',
              conditions: agConditions,
            };

            console.log(
              '[handleItemFilterSearch] Combined model:',
              combinedModel
            );

            if (isMultiFilterColumn) {
              // Wrap in multi-filter for columns that use agMultiColumnFilter
              await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
                filterType: 'multi',
                filterModels: [combinedModel],
              });
            } else {
              // Direct combined model for regular columns
              await unifiedGridApi.setColumnFilterModel(
                filterSearch.field,
                combinedModel
              );
            }
          } else {
            // Single condition filter (existing logic)
            console.log('[handleItemFilterSearch] Single condition filter', {
              field: filterSearch.field,
              operator: filterSearch.operator,
              value: filterSearch.value,
              isMultiCondition: filterSearch.isMultiCondition,
            });

            if (isMultiFilterColumn) {
              // For multi-filter columns (manufacturer, category, type, package, dosage)
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
              // For single filter columns (name, code, barcode, package_conversions, numeric columns)
              const filterType = isNumericColumn ? 'number' : 'text';
              const filterModel: {
                filterType: string;
                type: string;
                filter: string;
                filterTo?: string;
              } = {
                filterType,
                type: filterSearch.operator,
                filter: filterSearch.value,
              };

              // Add filterTo for inRange (Between) operator
              if (filterSearch.operator === 'inRange' && filterSearch.valueTo) {
                filterModel.filterTo = filterSearch.valueTo;
              }

              await unifiedGridApi.setColumnFilterModel(
                filterSearch.field,
                filterModel
              );
            }
          }

          // 📌 Track the current filter field for future column changes
          lastFilterFieldRef.current = filterSearch.field;

          unifiedGridApi.onFilterChanged();
        } catch (error) {
          console.error('Failed to apply filter:', error);
        }
      }
    },
    [unifiedGridApi]
  );

  // Get search columns for items - filtered and ordered based on AG Grid visibility & ordering
  const orderedSearchColumns = useMemo(() => {
    const allColumns = getOrderedSearchColumnsByEntity('items', []);

    // If no visible columns tracked yet, return all columns
    if (visibleColumns.length === 0) return allColumns;

    // Filter only visible columns and sort by grid order
    const visibleSearchColumns = allColumns.filter(col =>
      visibleColumns.includes(col.field)
    );

    return visibleSearchColumns.sort((a, b) => {
      const indexA = visibleColumns.indexOf(a.field);
      const indexB = visibleColumns.indexOf(b.field);
      return indexA - indexB;
    });
  }, [visibleColumns]);

  const {
    search: itemSearch,
    onGridReady: itemOnGridReady,
    isExternalFilterPresent: itemIsExternalFilterPresent,
    doesExternalFilterPass: itemDoesExternalFilterPass,
    searchBarProps: itemSearchBarProps,
    clearSearchUIOnly: clearItemSearchUIOnly,
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

  // Update visible columns when grid API or column state changes
  useEffect(() => {
    if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
      return;
    }

    const updateVisibleColumns = () => {
      try {
        // Get all displayed columns in their current order
        const displayedColumns = unifiedGridApi.getAllDisplayedColumns();
        if (displayedColumns) {
          const visibleFields = displayedColumns
            .map(col => col.getColId())
            .filter(colId => colId); // Filter out empty IDs
          setVisibleColumns(visibleFields);
          // console.log('📊 Visible columns updated:', visibleFields);
        }
      } catch (error) {
        console.error('Failed to update visible columns:', error);
      }
    };

    // Initial update
    updateVisibleColumns();

    // Listen to column visibility, move, and state restore events
    const onColumnVisible = () => updateVisibleColumns();
    const onColumnMoved = () => updateVisibleColumns();
    const onFirstDataRendered = () => updateVisibleColumns();
    const onGridColumnsChanged = () => updateVisibleColumns();

    unifiedGridApi.addEventListener('columnVisible', onColumnVisible);
    unifiedGridApi.addEventListener('columnMoved', onColumnMoved);
    unifiedGridApi.addEventListener('firstDataRendered', onFirstDataRendered);
    unifiedGridApi.addEventListener('gridColumnsChanged', onGridColumnsChanged);

    return () => {
      if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
        unifiedGridApi.removeEventListener('columnVisible', onColumnVisible);
        unifiedGridApi.removeEventListener('columnMoved', onColumnMoved);
        unifiedGridApi.removeEventListener(
          'firstDataRendered',
          onFirstDataRendered
        );
        unifiedGridApi.removeEventListener(
          'gridColumnsChanged',
          onGridColumnsChanged
        );
      }
    };
  }, [unifiedGridApi]);

  // Enhanced onGridReady to capture grid API for items tab
  const enhancedItemOnGridReady = useCallback(
    (params: GridReadyEvent) => {
      itemOnGridReady(params);
    },
    [itemOnGridReady]
  );

  // Entity search functionality - filtered and ordered based on AG Grid visibility & ordering
  const entitySearchColumns = useMemo(() => {
    if (activeTab === 'items') return [];

    const allColumns = getSearchColumnsByEntity(activeTab as EntityType);

    // If no visible columns tracked yet, return all columns
    if (visibleColumns.length === 0) return allColumns;

    // Filter only visible columns and sort by grid order
    const visibleSearchColumns = allColumns.filter(col => {
      // Entity columns are prefixed (e.g., "categories.code")
      // Check both the full field and the base field name
      const baseField = col.field.split('.').pop() || col.field;
      return (
        visibleColumns.includes(col.field) ||
        visibleColumns.some(vc => vc.endsWith(`.${baseField}`))
      );
    });

    return visibleSearchColumns.sort((a, b) => {
      const getIndex = (field: string) => {
        const baseField = field.split('.').pop() || field;
        const exactIndex = visibleColumns.indexOf(field);
        if (exactIndex !== -1) return exactIndex;

        // Find by base field name
        const matchIndex = visibleColumns.findIndex(vc =>
          vc.endsWith(`.${baseField}`)
        );
        return matchIndex !== -1 ? matchIndex : visibleColumns.length;
      };

      return getIndex(a.field) - getIndex(b.field);
    });
  }, [activeTab, visibleColumns]);

  // Entity filter search handler
  const handleEntityFilterSearch = useCallback(
    async (filterSearch: FilterSearch | null) => {
      // 🔒 Block grid filter changes during tab switching
      if (isTabSwitchingRef.current) {
        // console.log('🔒 Blocked entity grid filter change during tab switch');
        return;
      }

      if (!filterSearch) {
        if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
          unifiedGridApi.setFilterModel(null);
          unifiedGridApi.onFilterChanged();
        }
        // Clear the tracked filter field
        lastFilterFieldRef.current = null;
        return;
      }

      if (unifiedGridApi && !unifiedGridApi.isDestroyed()) {
        // 🔧 Clear old filter when changing columns (editing column badge)
        // If the field changed, clear the previous field's filter first
        if (
          lastFilterFieldRef.current &&
          lastFilterFieldRef.current !== filterSearch.field
        ) {
          try {
            await unifiedGridApi.setColumnFilterModel(
              lastFilterFieldRef.current,
              null
            );
          } catch (error) {
            console.error('Failed to clear old entity filter:', error);
          }
        }
        try {
          // filterSearch.field is already prefixed (e.g., 'categories.code')
          // Extract base field name for multi-filter check
          const fieldParts = filterSearch.field.split('.');
          const baseFieldName = fieldParts[fieldParts.length - 1]; // Get last part after dot

          // Entity columns are simpler - mostly text filters
          // Special handling for 'code' and 'nci_code' which use multi-filter
          const isMultiFilter =
            baseFieldName === 'code' || baseFieldName === 'nci_code';

          // Handle multi-condition filters (AND/OR)
          if (filterSearch.isMultiCondition && filterSearch.conditions) {
            // Build conditions array for AG Grid
            const agConditions = filterSearch.conditions.map(cond => {
              const baseCondition: {
                filterType: string;
                type: string;
                filter: string;
                filterTo?: string;
              } = {
                filterType: 'text',
                type: cond.operator,
                filter: cond.value,
              };

              // Add filterTo for inRange (Between) operator
              if (cond.operator === 'inRange' && cond.valueTo) {
                baseCondition.filterTo = cond.valueTo;
              }

              return baseCondition;
            });

            // Build combined filter model
            const combinedModel = {
              filterType: 'text',
              operator: filterSearch.joinOperator || 'AND',
              conditions: agConditions,
            };

            if (isMultiFilter) {
              // Wrap in multi-filter for columns that use agMultiColumnFilter
              await unifiedGridApi.setColumnFilterModel(filterSearch.field, {
                filterType: 'multi',
                filterModels: [combinedModel],
              });
            } else {
              // Direct combined model for regular columns
              await unifiedGridApi.setColumnFilterModel(
                filterSearch.field,
                combinedModel
              );
            }
          } else {
            // Single condition filter (existing logic)
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
              const filterModel: {
                filterType: string;
                type: string;
                filter: string;
                filterTo?: string;
              } = {
                filterType: 'text',
                type: filterSearch.operator,
                filter: filterSearch.value,
              };

              // Add filterTo for inRange (Between) operator
              if (filterSearch.operator === 'inRange' && filterSearch.valueTo) {
                filterModel.filterTo = filterSearch.valueTo;
              }

              await unifiedGridApi.setColumnFilterModel(
                filterSearch.field,
                filterModel
              );
            }
          }

          // 📌 Track the current filter field for future column changes
          lastFilterFieldRef.current = filterSearch.field;

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
    clearSearchUIOnly: clearEntitySearchUIOnly,
  } = useUnifiedSearch({
    columns: entitySearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: entityData.data,
    onSearch: entityManager.handleSearch,
    onClear: () => entityManager.handleSearch(''),
    onFilterSearch: handleEntityFilterSearch,
  });

  // Cleanup grid API reference and pending tab changes on unmount
  useEffect(() => {
    return () => {
      // Clear pending tab change timeout
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingTabRef.current = null;
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

  // Navigation logic extracted for reuse
  const performNavigation = useCallback(
    (targetTab: MasterDataType) => {
      navigate(`/master-data/item-master/${targetTab}`);

      // Save selected tab to session storage for future visits
      saveLastTabToSession(targetTab);

      // Simple client-side grouping - no need to clear on tab switch

      // 🔒 Block SearchBar from clearing grid filters during tab switch
      // This prevents the cascade: clearSearch → useSearchState → onFilterSearch(null)
      isTabSwitchingRef.current = true;

      // Clear search UI when switching tabs - both DOM and React state
      // Now safe because handleItemFilterSearch/handleEntityFilterSearch check the flag
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }

      // Clear React state to prevent field contamination
      if (activeTab === 'items') {
        clearItemSearchUIOnly(); // Leaving Items tab
      } else {
        clearEntitySearchUIOnly(); // Leaving Entity tab
      }

      // Reset visible columns to allow new grid to populate
      setVisibleColumns([]);

      // 🔓 Unlock after navigation and grid restoration completes
      // Grid restoration happens quickly after tab switch
      setTimeout(() => {
        isTabSwitchingRef.current = false;
        // console.log('🔓 Tab switch complete - grid filter protection unlocked');
      }, 500);

      // Note: Grid state restoration will handle filter state correctly:
      // - If saved filter exists → restored automatically (including badge filters)
      // - If no saved filter → empty by default
      // SearchBar UI cleared, grid filters preserved

      // Reset item modal state when switching tabs
      if (isAddItemModalOpen) {
        closeAddItemModal();
      }
    },
    [
      navigate,
      activeTab,
      isAddItemModalOpen,
      closeAddItemModal,
      clearItemSearchUIOnly,
      clearEntitySearchUIOnly,
    ]
  );

  const handleTabChange = useCallback(
    (_key: string, value: MasterDataType) => {
      // Skip if same tab
      if (value === activeTab) return;

      const now = Date.now();
      const timeSinceLastNav = now - lastNavigationTimeRef.current;
      const isInCooldown = timeSinceLastNav < TAB_CHANGE_COOLDOWN_MS;

      if (!isInCooldown) {
        // 🚀 First click or after cooldown - navigate IMMEDIATELY (0ms delay)
        // console.log(`✅ Navigating immediately to: ${value}`);
        performNavigation(value);
        lastNavigationTimeRef.current = now;

        // Clear any pending debounced navigation
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingTabRef.current = null;
      } else {
        // ⏸️ Rapid clicking detected - debounce to capture final selection
        // console.log(
        //   `⏸️ Rapid clicking detected (${timeSinceLastNav}ms since last nav) - debouncing to final tab`
        // );

        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Store pending tab selection
        pendingTabRef.current = value;

        // Set new debounce timer - navigates to final selection after user settles
        debounceTimerRef.current = setTimeout(() => {
          if (pendingTabRef.current) {
            // console.log(`✅ Navigating to final tab: ${pendingTabRef.current}`);
            performNavigation(pendingTabRef.current);
            lastNavigationTimeRef.current = Date.now();
            pendingTabRef.current = null;
          }
          debounceTimerRef.current = null;
        }, TAB_CHANGE_COOLDOWN_MS);
      }
    },
    [activeTab, performNavigation]
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
