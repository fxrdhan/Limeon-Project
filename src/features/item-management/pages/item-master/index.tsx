import { createTextColumn } from '@/components/ag-grid';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Components
import { Card } from '@/components/card';
import PageTitle from '@/components/page-title';
import IdentityDataModal from '@/components/IdentityDataModal';
import {
  SlidingSelector,
  SlidingSelectorOption,
} from '@/components/shared/sliding-selector';
import { EntityGrid } from '@/features/item-management/presentation/organisms';
import { EntityModal } from '@/features/item-management/presentation/templates/entity';
import ItemModal from '@/features/item-management/presentation/templates/item/ItemModal';
import SearchToolbar from '@/components/SearchToolbar';

// Simple realtime for all item master data
import { useItemsSync } from '@/hooks/realtime/useItemsSync';

// Hooks and utilities
import { useItemGridColumns } from '@/features/item-management/application/hooks/ui';
import { useItemsManagement } from '@/hooks/data/useItemsManagement';
import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import { restoreConfirmedPattern } from '@/components/search-bar/utils/patternRestoration';
import { buildAdvancedFilterModel } from '@/utils/advancedFilterBuilder';
import { useConfirmDialog } from '@/components/dialog-box';
import {
  getOrderedSearchColumnsByEntity,
  getSearchColumnsByEntity,
} from '@/utils/searchColumns';
import { deriveSearchPatternFromGridState } from './utils/advancedFilterToSearchPattern';

// Entity management hooks
import {
  useEntity,
  useEntityManager,
} from '@/features/item-management/application/hooks/collections';

// Types
import {
  EntityData,
  EntityType,
} from '@/features/item-management/application/hooks/collections/useEntityManager';
import type { Item as ItemDataType } from '@/types/database';
import type { FieldConfig, Supplier as SupplierType } from '@/types';
import { FilterSearch } from '@/types/search';

// Testing utilities for random item generation
import { config } from '@/config';
import { RandomItemFloatingButton } from '@/utils/testing';
import { fuzzyMatch } from '@/utils/search';
import { useSuppliers, useSupplierMutations } from '@/hooks/queries';

type MasterDataType =
  | 'items'
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units'
  | 'suppliers';

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
  {
    key: 'suppliers',
    value: 'suppliers',
    defaultLabel: 'Supplier',
    activeLabel: 'Daftar Supplier',
  },
];

const SWITCHER_TAB_OPTIONS = TAB_OPTIONS.filter(
  option => option.value !== 'suppliers'
);

const URL_TO_TAB_MAP: Record<string, MasterDataType> = {
  items: 'items',
  categories: 'categories',
  types: 'types',
  packages: 'packages',
  dosages: 'dosages',
  manufacturers: 'manufacturers',
  units: 'units',
  suppliers: 'suppliers',
};

// Session storage key for last visited tab
const LAST_TAB_SESSION_KEY = 'item_master_last_tab';

const ITEM_MASTER_SEARCH_SESSION_PREFIX = 'item_master_search_';

const getItemMasterSearchSessionKey = (tab: MasterDataType): string => {
  return `${ITEM_MASTER_SEARCH_SESSION_PREFIX}${tab}`;
};

const readGridStateForTab = (tab: MasterDataType): unknown | null => {
  const storageKey = `grid_state_${tab}`;

  try {
    const sessionState = sessionStorage.getItem(storageKey);
    if (sessionState) {
      return JSON.parse(sessionState);
    }
  } catch {
    // ignore
  }
  return null;
};

// Session storage utility
const saveLastTabToSession = (tab: MasterDataType): void => {
  if (tab === 'suppliers') return;
  try {
    sessionStorage.setItem(LAST_TAB_SESSION_KEY, tab);
  } catch (error) {
    console.warn('Failed to save last tab to session storage:', error);
  }
};

const getLastTabFromSession = (): MasterDataType => {
  try {
    const savedTab = sessionStorage.getItem(LAST_TAB_SESSION_KEY);
    if (savedTab && savedTab in URL_TO_TAB_MAP && savedTab !== 'suppliers') {
      return savedTab as MasterDataType;
    }
  } catch {
    // ignore
  }
  return 'items';
};

const ItemMasterNew = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openConfirmDialog } = useConfirmDialog();

  // Memoize tab detection function
  const getTabFromPath = useCallback((pathname: string): MasterDataType => {
    const pathSegments = pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return URL_TO_TAB_MAP[lastSegment] || 'items';
  }, []);

  // Use getDerivedStateFromProps to sync activeTab with URL changes
  const activeTab = useMemo(
    () => getTabFromPath(location.pathname),
    [getTabFromPath, location.pathname]
  );

  // Ensure /master-data/item-master lands on a concrete tab (preserve last visit).
  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '');
    if (normalizedPath !== '/master-data/item-master') return;

    const lastTab = getLastTabFromSession();
    navigate(`/master-data/item-master/${lastTab}`, { replace: true });
  }, [location.pathname, navigate]);

  // Persist last tab as a side-effect (no derived React state needed).
  useEffect(() => {
    saveLastTabToSession(activeTab);
  }, [activeTab]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track SlidingSelector expanded state to avoid focus "tug-of-war".
  // Rule: collapsed -> focus SearchBar; expanded -> let tabs keep focus.
  const [isTabSelectorExpanded, setIsTabSelectorExpanded] = useState(false);

  const wasAnyModalOpenRef = useRef(false);

  // 🚦 Hybrid tab change protection: immediate first click, debounced rapid clicks
  // Smart detection: single click = instant navigation, rapid clicks = debounced to final tab
  const lastNavigationTimeRef = useRef<number>(0);
  const pendingTabRef = useRef<MasterDataType | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const TAB_CHANGE_COOLDOWN_MS = 250; // Cooldown period to detect rapid clicking

  // Unified Grid API reference from EntityGrid
  const [unifiedGridApi, setUnifiedGridApi] = useState<GridApi | null>(null);

  // Track visible and ordered columns from AG Grid
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // ✅ REALTIME WORKING! Use postgres_changes approach
  useItemsSync({ enabled: true });

  // Suppliers tab data + CRUD
  const suppliersQuery = useSuppliers({ enabled: true });
  const supplierMutations = useSupplierMutations();
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierType | null>(
    null
  );

  const supplierFields: FieldConfig[] = useMemo(
    () => [
      { key: 'name', label: 'Nama Supplier', type: 'text' },
      { key: 'address', label: 'Alamat', type: 'textarea' },
      { key: 'phone', label: 'Telepon', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'contact_person', label: 'Kontak Person', type: 'text' },
    ],
    []
  );

  const suppliersData: SupplierType[] = useMemo(
    () => (suppliersQuery.data ?? []) as SupplierType[],
    [suppliersQuery.data]
  );

  // Items tab states (only needed for items tab)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isItemModalClosing, setIsItemModalClosing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | undefined>(
    undefined
  );
  const [editingItemData, setEditingItemData] = useState<
    ItemDataType | undefined
  >(undefined);
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<
    string | undefined
  >(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);

  // 🔒 Flag to block SearchBar from clearing grid filters during tab switch
  const isTabSwitchingRef = useRef(false);

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
      activeTab !== 'items' && activeTab !== 'suppliers'
        ? (activeTab as EntityType)
        : 'categories',
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
  });

  // Memoize entity options to prevent unnecessary re-renders
  const entityManagementOptions = useMemo(
    () => ({
      entityType:
        activeTab !== 'items' && activeTab !== 'suppliers'
          ? (activeTab as EntityType)
          : 'categories',
      search: entityManager.search,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: activeTab !== 'items' && activeTab !== 'suppliers',
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
      activeTab !== 'items' && activeTab !== 'suppliers'
        ? entityManager.entityConfigs[activeTab as EntityType]
        : null,
    [activeTab, entityManager.entityConfigs]
  );

  // Entity column definitions with unique field IDs per table
  const entityColumnDefs: ColDef[] = useMemo(() => {
    if (
      activeTab === 'items' ||
      activeTab === 'suppliers' ||
      !entityCurrentConfig
    )
      return [];

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

  const supplierColumnDefs: ColDef[] = useMemo(() => {
    const tablePrefix = 'suppliers';
    return [
      createTextColumn({
        field: `${tablePrefix}.name`,
        headerName: 'Nama Supplier',
        minWidth: 200,
        valueGetter: params => params.data?.name || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.address`,
        headerName: 'Alamat',
        minWidth: 150,
        flex: 1,
        valueGetter: params => params.data?.address || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.phone`,
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data?.phone || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.email`,
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data?.email || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.contact_person`,
        headerName: 'Kontak Person',
        minWidth: 150,
        valueGetter: params => params.data?.contact_person || '-',
      }),
    ];
  }, []);

  // Memoize modal handlers
  const openAddItemModal = useCallback(
    (item?: ItemDataType, searchQuery?: string) => {
      setEditingItemId(item?.id);
      setEditingItemData(item);
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
      setEditingItemData(undefined);
      setCurrentSearchQueryForModal(undefined);
    }, 100);
  }, []);

  // Memoize item handlers
  const handleItemEdit = useCallback(
    (item: ItemDataType) => {
      openAddItemModal(item);
    },
    [openAddItemModal]
  );

  const handleItemSelect = useCallback(
    (item: { id: string }) => {
      const selectedItem = (itemsManagement.allData as ItemDataType[]).find(
        dataItem => dataItem.id === item.id
      );
      openAddItemModal(selectedItem);
    },
    [itemsManagement.allData, openAddItemModal]
  );

  const handleAddItem = useCallback(
    (_itemId?: string, searchQuery?: string) => {
      openAddItemModal(undefined, searchQuery);
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
    (filterSearch: FilterSearch | null) => {
      // 🔒 Block grid filter changes during tab switching
      // SearchBar will call this with null when clearing, but we want to preserve grid filters
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
        return;
      }

      // Build Advanced Filter model from FilterSearch
      // Advanced Filter API supports OR across different columns natively
      const advancedFilterModel = buildAdvancedFilterModel(filterSearch);

      // Apply the Advanced Filter model
      unifiedGridApi.setAdvancedFilterModel(advancedFilterModel);

      // Persist confirmed badge pattern per tab (session only)
      try {
        const sessionKey = getItemMasterSearchSessionKey('items');
        if (!filterSearch) {
          sessionStorage.removeItem(sessionKey);
        } else if (filterSearch.isConfirmed) {
          sessionStorage.setItem(
            sessionKey,
            restoreConfirmedPattern({
              ...filterSearch,
              isExplicitOperator: filterSearch.isExplicitOperator ?? true,
            } as unknown as import('@/components/search-bar/types').FilterSearch)
          );
        }
      } catch {
        // ignore
      }
    },
    [unifiedGridApi]
  );

  // Get search columns for items - ordered based on AG Grid visibility & ordering.
  // Keep hidden columns at the end so filters can be restored even if a column is hidden.
  const orderedSearchColumns = useMemo(() => {
    return getOrderedSearchColumnsByEntity(
      'items',
      visibleColumns.length > 0 ? visibleColumns : undefined
    );
  }, [visibleColumns]);

  const {
    search: itemSearch,
    setSearch: setItemSearch,
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

  // Grid API ready callback from EntityGrid
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
    if (activeTab === 'items' || activeTab === 'suppliers') return [];

    const allColumns = getSearchColumnsByEntity(activeTab as EntityType);

    // If no visible columns tracked yet, return all columns
    if (visibleColumns.length === 0) return allColumns;

    // Sort by grid order, keeping hidden columns at the end.
    return [...allColumns].sort((a, b) => {
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

  const supplierSearchColumns = useMemo(() => {
    if (activeTab !== 'suppliers') return [];

    const allColumns = [
      {
        field: 'suppliers.name',
        headerName: 'Nama Supplier',
        searchable: true,
        type: 'text' as const,
        description: 'Cari berdasarkan nama supplier',
      },
      {
        field: 'suppliers.address',
        headerName: 'Alamat',
        searchable: true,
        type: 'text' as const,
        description: 'Cari berdasarkan alamat supplier',
      },
      {
        field: 'suppliers.phone',
        headerName: 'Telepon',
        searchable: true,
        type: 'text' as const,
        description: 'Cari berdasarkan nomor telepon supplier',
      },
      {
        field: 'suppliers.email',
        headerName: 'Email',
        searchable: true,
        type: 'text' as const,
        description: 'Cari berdasarkan email supplier',
      },
      {
        field: 'suppliers.contact_person',
        headerName: 'Kontak Person',
        searchable: true,
        type: 'text' as const,
        description: 'Cari berdasarkan kontak person supplier',
      },
    ];

    if (visibleColumns.length === 0) return allColumns;

    return [...allColumns].sort((a, b) => {
      const indexA = visibleColumns.indexOf(a.field);
      const indexB = visibleColumns.indexOf(b.field);
      const safeA = indexA === -1 ? visibleColumns.length : indexA;
      const safeB = indexB === -1 ? visibleColumns.length : indexB;
      return safeA - safeB;
    });
  }, [activeTab, visibleColumns]);

  const handleSupplierFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      // 🔒 Block grid filter changes during tab switching
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (activeTab !== 'suppliers') {
        return;
      }

      if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
        return;
      }

      const advancedFilterModel = buildAdvancedFilterModel(filterSearch);
      unifiedGridApi.setAdvancedFilterModel(advancedFilterModel);

      // Persist confirmed badge pattern per tab (session only)
      try {
        const sessionKey = getItemMasterSearchSessionKey(activeTab);
        if (!filterSearch) {
          sessionStorage.removeItem(sessionKey);
        } else if (filterSearch.isConfirmed) {
          sessionStorage.setItem(
            sessionKey,
            restoreConfirmedPattern({
              ...filterSearch,
              isExplicitOperator: filterSearch.isExplicitOperator ?? true,
            } as unknown as import('@/components/search-bar/types').FilterSearch)
          );
        }
      } catch {
        // ignore
      }
    },
    [activeTab, unifiedGridApi]
  );

  // Entity filter search handler
  const handleEntityFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      // 🔒 Block grid filter changes during tab switching
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (activeTab === 'items' || activeTab === 'suppliers') {
        return;
      }

      if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
        return;
      }

      // Build Advanced Filter model from FilterSearch
      // Advanced Filter API supports OR across different columns natively
      const advancedFilterModel = buildAdvancedFilterModel(filterSearch);

      // Apply the Advanced Filter model
      unifiedGridApi.setAdvancedFilterModel(advancedFilterModel);

      // Persist confirmed badge pattern per tab (session only)
      try {
        const sessionKey = getItemMasterSearchSessionKey(activeTab);
        if (!filterSearch) {
          sessionStorage.removeItem(sessionKey);
        } else if (filterSearch.isConfirmed) {
          sessionStorage.setItem(
            sessionKey,
            restoreConfirmedPattern({
              ...filterSearch,
              isExplicitOperator: filterSearch.isExplicitOperator ?? true,
            } as unknown as import('@/components/search-bar/types').FilterSearch)
          );
        }
      } catch {
        // ignore
      }
    },
    [activeTab, unifiedGridApi]
  );

  const {
    search: entitySearch,
    setSearch: setEntitySearch,
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

  const {
    search: supplierSearch,
    setSearch: setSupplierSearch,
    onGridReady: supplierOnGridReady,
    isExternalFilterPresent: supplierIsExternalFilterPresent,
    doesExternalFilterPass: supplierDoesExternalFilterPass,
    searchBarProps: supplierSearchBarProps,
    clearSearchUIOnly: clearSupplierSearchUIOnly,
  } = useUnifiedSearch({
    columns: supplierSearchColumns,
    searchMode: 'client',
    useFuzzySearch: true,
    data: suppliersData,
    onFilterSearch: handleSupplierFilterSearch,
  });

  const suppliersForDisplay: SupplierType[] = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q || q.startsWith('#')) return suppliersData;

    return suppliersData
      .filter(supplier => {
        return (
          fuzzyMatch(supplier.name, q) ||
          (supplier.address && fuzzyMatch(supplier.address, q)) ||
          (supplier.phone && fuzzyMatch(supplier.phone, q)) ||
          (supplier.email && fuzzyMatch(supplier.email, q)) ||
          (supplier.contact_person && fuzzyMatch(supplier.contact_person, q))
        );
      })
      .sort((a, b) => {
        const getSupplierScore = (supplier: SupplierType) => {
          const nameLower = supplier.name?.toLowerCase?.() ?? '';
          const addressLower = supplier.address?.toLowerCase?.() ?? '';
          const phoneLower = supplier.phone?.toLowerCase?.() ?? '';
          const emailLower = supplier.email?.toLowerCase?.() ?? '';
          const contactLower = supplier.contact_person?.toLowerCase?.() ?? '';

          if (nameLower.startsWith(q)) return 5;
          if (nameLower.includes(q)) return 4;
          if (emailLower.includes(q)) return 3;
          if (phoneLower.includes(q)) return 2;
          if (addressLower.includes(q) || contactLower.includes(q)) return 1;
          return 0;
        };

        const scoreA = getSupplierScore(a);
        const scoreB = getSupplierScore(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
      });
  }, [supplierSearch, suppliersData]);

  // Restore SearchBar badge UI per tab (session-scoped)
  // Priority: explicit saved pattern → derive from grid_state_{tab}.advancedFilterModel
  useEffect(() => {
    const setSearch =
      activeTab === 'items'
        ? setItemSearch
        : activeTab === 'suppliers'
          ? setSupplierSearch
          : setEntitySearch;
    const sessionKey = getItemMasterSearchSessionKey(activeTab);

    let savedPattern: string | null = null;
    try {
      savedPattern = sessionStorage.getItem(sessionKey);
    } catch {
      // ignore
    }

    if (savedPattern && savedPattern.trim() !== '') {
      setSearch(savedPattern);
      return;
    }

    const gridState = readGridStateForTab(activeTab);
    const derivedPattern = gridState
      ? deriveSearchPatternFromGridState(gridState)
      : null;

    if (derivedPattern) {
      try {
        sessionStorage.setItem(sessionKey, derivedPattern);
      } catch {
        // ignore
      }
      setSearch(derivedPattern);
      return;
    }

    setSearch('');
  }, [activeTab, setEntitySearch, setItemSearch, setSupplierSearch]);

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
      const isAnyModalOpen =
        isAddItemModalOpen ||
        entityManager.isAddModalOpen ||
        entityManager.isEditModalOpen;
      const activeDialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (isAnyModalOpen || activeDialog) return;

      // Check if user is already typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"][aria-modal="true"]')) {
        return;
      }
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
  }, [
    entityManager.isAddModalOpen,
    entityManager.isEditModalOpen,
    isAddItemModalOpen,
  ]);

  // Auto-focus SearchBar on initial mount and tab (sub-page) changes.
  // We intentionally prefer focusing our SearchBar over AG Grid internals.
  useEffect(() => {
    if (isTabSelectorExpanded) return;

    const isAnyModalOpen =
      isAddItemModalOpen ||
      entityManager.isAddModalOpen ||
      entityManager.isEditModalOpen;
    if (isAnyModalOpen) return;

    let cancelled = false;
    let attempts = 0;

    const focusSearch = (): boolean => {
      if (
        isAddItemModalOpen ||
        entityManager.isAddModalOpen ||
        entityManager.isEditModalOpen
      ) {
        return false;
      }
      const activeDialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (activeDialog) return false;

      const input = searchInputRef.current;
      if (!input) return false;

      const active = document.activeElement as HTMLElement | null;
      const isTypingElsewhere =
        !!active &&
        active !== document.body &&
        active !== input &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable);

      if (isTypingElsewhere) return false;

      input.focus();
      return document.activeElement === input;
    };

    const tryFocus = () => {
      if (cancelled) return;
      if (focusSearch()) return;

      // SearchBar input can re-mount during grid/tab transitions.
      // Retry briefly so we win focus consistently.
      if (attempts < 12) {
        attempts += 1;
        setTimeout(tryFocus, 50);
      }
    };

    const rafId = requestAnimationFrame(tryFocus);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    activeTab,
    entityManager.isAddModalOpen,
    entityManager.isEditModalOpen,
    isAddItemModalOpen,
    isTabSelectorExpanded,
  ]);

  // Keep focus on SearchBar when clicking non-input UI.
  // This makes the page feel "type-to-search" by default.
  useEffect(() => {
    if (isTabSelectorExpanded) return;

    const isAnyModalOpen =
      isAddItemModalOpen ||
      entityManager.isAddModalOpen ||
      entityManager.isEditModalOpen;

    if (isAnyModalOpen) return;

    const handlePointerDownCapture = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const input = searchInputRef.current;
      if (!input) return;

      // If user explicitly interacts with any input-like element, don't steal focus.
      const isTypingTarget =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTypingTarget) return;

      // Don't override focus when clicking inside dialogs/overlays.
      if (target.closest('[role="dialog"]')) return;

      // If click happens on the SearchBar itself, do nothing.
      if (target === input) return;

      // Re-assert focus after the click's default focus behavior.
      setTimeout(() => {
        // If a modal opens as a result of the click, don't refocus.
        // We must check the DOM (not React state) because this callback runs
        // before state updates are reflected in closures.
        const dialog = document.querySelector(
          '[role="dialog"][aria-modal="true"]'
        );
        if (dialog) return;

        input.focus();
      }, 0);
    };

    document.addEventListener('pointerdown', handlePointerDownCapture, true);
    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDownCapture,
        true
      );
    };
  }, [
    entityManager.isAddModalOpen,
    entityManager.isEditModalOpen,
    isAddItemModalOpen,
    isTabSelectorExpanded,
  ]);

  // When any modal closes, return focus to SearchBar.
  useEffect(() => {
    if (isTabSelectorExpanded) return;

    const input = searchInputRef.current;
    if (!input) return;

    const isAnyModalOpen =
      isAddItemModalOpen ||
      entityManager.isAddModalOpen ||
      entityManager.isEditModalOpen;

    const prev = wasAnyModalOpenRef.current;
    wasAnyModalOpenRef.current = isAnyModalOpen;

    if (!prev || isAnyModalOpen) return;

    let cancelled = false;
    let attempts = 0;

    const tryFocus = () => {
      if (cancelled) return;

      // Wait until all dialogs are actually removed from DOM (exit animations).
      const dialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (dialog && attempts < 20) {
        attempts += 1;
        setTimeout(tryFocus, 50);
        return;
      }

      input.focus();
    };

    setTimeout(tryFocus, 0);
    setTimeout(tryFocus, 200);

    return () => {
      cancelled = true;
    };
  }, [
    entityManager.isAddModalOpen,
    entityManager.isEditModalOpen,
    isAddItemModalOpen,
    isTabSelectorExpanded,
  ]);

  // Navigation logic extracted for reuse
  const performNavigation = useCallback(
    (targetTab: MasterDataType) => {
      navigate(
        targetTab === 'suppliers'
          ? '/master-data/suppliers'
          : `/master-data/item-master/${targetTab}`
      );

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

      // After navigation, aggressively return focus to SearchBar.
      // Clicking the tab leaves focus on the tab button; also, the SearchBar input
      // can re-mount during transitions, so we retry once after a short delay.
      const focusSearch = () => {
        const input = searchInputRef.current;
        if (!input) return;

        const active = document.activeElement as HTMLElement | null;
        const isTypingElsewhere =
          !!active &&
          active !== document.body &&
          active !== input &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable);

        if (isTypingElsewhere) return;

        input.focus();
      };

      if (!isTabSelectorExpanded) {
        requestAnimationFrame(focusSearch);
        setTimeout(focusSearch, 150);
        setTimeout(focusSearch, 700);
      }

      // Clear React state to prevent field contamination
      if (activeTab === 'items') {
        clearItemSearchUIOnly();
      } else if (activeTab === 'suppliers') {
        clearSupplierSearchUIOnly();
      } else {
        clearEntitySearchUIOnly();
      }

      // Reset visible columns to allow new grid to populate
      setVisibleColumns([]);

      // 🔓 Unlock after navigation and grid restoration completes
      // Grid restoration happens quickly after tab switch
      setTimeout(() => {
        isTabSwitchingRef.current = false;
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
      isTabSelectorExpanded,
      isAddItemModalOpen,
      closeAddItemModal,
      clearItemSearchUIOnly,
      clearEntitySearchUIOnly,
      clearSupplierSearchUIOnly,
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

        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Store pending tab selection
        pendingTabRef.current = value;

        // Set new debounce timer - navigates to final selection after user settles
        debounceTimerRef.current = setTimeout(() => {
          if (pendingTabRef.current) {
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
    const currentIndex = SWITCHER_TAB_OPTIONS.findIndex(
      opt => opt.value === activeTab
    );
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex =
      safeIndex < SWITCHER_TAB_OPTIONS.length - 1 ? safeIndex + 1 : 0;
    const nextTab = SWITCHER_TAB_OPTIONS[nextIndex];
    handleTabChange(nextTab.key, nextTab.value);
  }, [activeTab, handleTabChange]);

  const handleTabPrevious = useCallback(() => {
    const currentIndex = SWITCHER_TAB_OPTIONS.findIndex(
      opt => opt.value === activeTab
    );
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const prevIndex =
      safeIndex > 0 ? safeIndex - 1 : SWITCHER_TAB_OPTIONS.length - 1;
    const prevTab = SWITCHER_TAB_OPTIONS[prevIndex];
    handleTabChange(prevTab.key, prevTab.value);
  }, [activeTab, handleTabChange]);

  // Unified handlers for EntityGrid
  const unifiedRowClickHandler = useCallback(
    (data: ItemDataType | EntityData | SupplierType) => {
      if (activeTab === 'items') {
        // Convert back to base Item type for editing
        const baseItem = data as ItemDataType;
        handleItemEdit(baseItem);
      } else if (activeTab === 'suppliers') {
        setEditingSupplier(data as SupplierType);
        setIsEditSupplierModalOpen(true);
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
      } else if (activeTab === 'suppliers') {
        supplierOnGridReady(params);
      } else {
        entityOnGridReady(params);
      }
    },
    [activeTab, enhancedItemOnGridReady, entityOnGridReady, supplierOnGridReady]
  );

  // Removed unified column handlers - now handled by live save in EntityGrid

  // No need for mouse handlers - handled by SlidingSelector

  // Unified rendering - keep tabs always mounted for smooth animation
  return (
    <>
      <Card>
        <div className="relative flex items-center justify-center mb-0 pt-0">
          <div className="absolute left-0 pb-4 pt-6">
            {activeTab !== 'suppliers' && (
              <SlidingSelector
                options={SWITCHER_TAB_OPTIONS}
                activeKey={activeTab}
                onSelectionChange={handleTabChange}
                variant="tabs"
                size="md"
                shape="rounded"
                collapsible={true}
                defaultExpanded={false}
                expandOnHover={true}
                onExpandedChange={setIsTabSelectorExpanded}
                autoCollapseDelay={150}
                layoutId="item-master-tabs"
                animationPreset="smooth"
              />
            )}
          </div>

          <PageTitle
            title={
              activeTab === 'suppliers' ? 'Daftar Supplier' : 'Item Master'
            }
          />
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
                  : activeTab === 'suppliers'
                    ? supplierSearchBarProps
                    : entitySearchBarProps
              }
              search={
                activeTab === 'items'
                  ? itemSearch
                  : activeTab === 'suppliers'
                    ? supplierSearch
                    : entitySearch
              }
              placeholder={
                activeTab === 'items'
                  ? 'Cari item...'
                  : activeTab === 'suppliers'
                    ? 'Cari supplier...'
                    : `${entityCurrentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`
              }
              onAdd={
                activeTab === 'items'
                  ? () => handleAddItem(undefined, itemSearch)
                  : activeTab === 'suppliers'
                    ? () => setIsAddSupplierModalOpen(true)
                    : entityManager.openAddModal
              }
              items={
                activeTab === 'items'
                  ? (itemsManagement.data as ItemDataType[])
                  : undefined
              }
              onItemSelect={
                activeTab === 'items' ? handleItemSelect : undefined
              }
              gridApi={unifiedGridApi}
              exportFilename={
                activeTab === 'items'
                  ? 'daftar-item'
                  : activeTab === 'suppliers'
                    ? 'daftar-supplier'
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

        {/* Unified EntityGrid */}
        <div>
          <EntityGrid
            activeTab={activeTab}
            itemsData={itemsManagement.data as ItemDataType[]}
            suppliersData={suppliersForDisplay}
            entityData={entityData.data}
            isLoading={
              activeTab === 'items'
                ? itemsManagement.isLoading
                : activeTab === 'suppliers'
                  ? suppliersQuery.isLoading
                  : entityData.isLoading
            }
            isError={
              activeTab === 'items'
                ? itemsManagement.isError
                : activeTab === 'suppliers'
                  ? suppliersQuery.isError
                  : entityData.isError
            }
            error={
              activeTab === 'items'
                ? itemsManagement.queryError
                : activeTab === 'suppliers'
                  ? suppliersQuery.error
                  : entityData.error
            }
            search={
              activeTab === 'items'
                ? itemSearch
                : activeTab === 'suppliers'
                  ? supplierSearch
                  : entitySearch
            }
            itemColumnDefs={itemColumnDefs}
            entityConfig={entityCurrentConfig}
            entityColumnDefs={entityColumnDefs}
            supplierColumnDefs={supplierColumnDefs}
            onRowClick={unifiedRowClickHandler}
            onGridReady={unifiedGridReadyHandler}
            isExternalFilterPresent={
              activeTab === 'items'
                ? itemIsExternalFilterPresent
                : activeTab === 'suppliers'
                  ? supplierIsExternalFilterPresent
                  : entityIsExternalFilterPresent
            }
            doesExternalFilterPass={
              activeTab === 'items'
                ? itemDoesExternalFilterPass
                : activeTab === 'suppliers'
                  ? supplierDoesExternalFilterPass
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
          initialItemData={editingItemData}
          initialSearchQuery={currentSearchQueryForModal}
          isClosing={isItemModalClosing}
          setIsClosing={setIsItemModalClosing}
        />
      )}

      {/* Entity Management Modal - only render for entity tabs */}
      {activeTab !== 'items' &&
        activeTab !== 'suppliers' &&
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

      {/* Supplier Management Modals */}
      <IdentityDataModal
        title="Tambah Supplier Baru"
        data={{}}
        fields={supplierFields}
        isOpen={activeTab === 'suppliers' && isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onSave={async data => {
          await supplierMutations.createSupplier.mutateAsync({
            name: String(data.name || ''),
            address: String(data.address || '') || null,
            phone: String(data.phone || '') || null,
            email: String(data.email || '') || null,
            contact_person: String(data.contact_person || '') || null,
            image_url: null,
          });
          setIsAddSupplierModalOpen(false);
        }}
        mode="add"
        initialNameFromSearch={
          supplierSearch.startsWith('#') ? '' : supplierSearch
        }
      />

      <IdentityDataModal
        title="Edit Supplier"
        data={
          (editingSupplier as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={supplierFields}
        isOpen={activeTab === 'suppliers' && isEditSupplierModalOpen}
        onClose={() => {
          setIsEditSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={async data => {
          if (!editingSupplier?.id) return;
          await supplierMutations.updateSupplier.mutateAsync({
            id: editingSupplier.id,
            data: {
              name: String(data.name || ''),
              address: String(data.address || '') || null,
              phone: String(data.phone || '') || null,
              email: String(data.email || '') || null,
              contact_person: String(data.contact_person || '') || null,
            },
          });
          setIsEditSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onDeleteRequest={
          editingSupplier
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus supplier "${editingSupplier.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await supplierMutations.deleteSupplier.mutateAsync(
                      editingSupplier.id
                    );
                    setIsEditSupplierModalOpen(false);
                    setEditingSupplier(null);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={editingSupplier?.image_url || undefined}
      />
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;
