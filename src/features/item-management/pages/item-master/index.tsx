import { createTextColumn } from '@/components/ag-grid';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Components
import { Card } from '@/components/card';
import IdentityDataModal from '@/components/IdentityDataModal';
import PageTitle from '@/components/page-title';
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
import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';
import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import { restoreConfirmedPattern } from '@/components/search-bar/utils/patternRestoration';
import { buildAdvancedFilterModel } from '@/utils/advancedFilterBuilder';
import { useConfirmDialog } from '@/components/dialog-box';
import {
  getOrderedSearchColumnsByEntity,
  getSearchColumnsByEntity,
} from '@/utils/searchColumns';
import { deriveSearchPatternFromGridState } from './utils/advancedFilterToSearchPattern';
import SupplierModals from './components/SupplierModals';
import { useSupplierTab } from './hooks/useSupplierTab';
import { useCustomerLevels } from '@/features/item-management/application/hooks/data/useCustomerLevels';

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
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  FieldConfig,
  Patient as PatientType,
  Supplier as SupplierType,
} from '@/types';
import { FilterSearch } from '@/types/search';

import { fuzzyMatch } from '@/utils/search';

type MasterDataType =
  | 'items'
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units'
  | 'suppliers'
  | 'customers'
  | 'patients'
  | 'doctors';

const ITEM_MASTER_TABS = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
] as const;

type ItemMasterTab = (typeof ITEM_MASTER_TABS)[number];

const isItemMasterTab = (tab: MasterDataType): tab is ItemMasterTab =>
  ITEM_MASTER_TABS.includes(tab as ItemMasterTab);

const OTHER_MASTER_DATA_TABS = ['customers', 'patients', 'doctors'] as const;

type OtherMasterDataTab = (typeof OTHER_MASTER_DATA_TABS)[number];

const isOtherMasterDataTab = (tab: MasterDataType): tab is OtherMasterDataTab =>
  OTHER_MASTER_DATA_TABS.includes(tab as OtherMasterDataTab);

/* c8 ignore next */
const isItemMasterEntityTab = (tab: MasterDataType): tab is EntityType =>
  tab !== 'items' && isItemMasterTab(tab);

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
  customers: 'customers',
  patients: 'patients',
  doctors: 'doctors',
};

const OTHER_MASTER_DATA_CONFIG: Record<
  OtherMasterDataTab,
  {
    title: string;
    entityName: string;
    searchPlaceholder: string;
    exportFilename: string;
    noDataMessage: string;
    searchNoDataMessage: string;
  }
> = {
  customers: {
    title: 'Daftar Pelanggan',
    entityName: 'Pelanggan',
    searchPlaceholder:
      'Cari pelanggan atau ketik # untuk pencarian kolom spesifik',
    exportFilename: 'daftar-pelanggan',
    noDataMessage: 'Tidak ada data pelanggan yang ditemukan',
    searchNoDataMessage: 'Tidak ada pelanggan dengan kata kunci',
  },
  patients: {
    title: 'Daftar Pasien',
    entityName: 'Pasien',
    searchPlaceholder:
      'Cari pasien atau ketik # untuk pencarian kolom spesifik',
    exportFilename: 'daftar-pasien',
    noDataMessage: 'Tidak ada data pasien yang ditemukan',
    searchNoDataMessage: 'Tidak ada pasien dengan kata kunci',
  },
  doctors: {
    title: 'Daftar Dokter',
    entityName: 'Dokter',
    searchPlaceholder:
      'Cari dokter atau ketik # untuk pencarian kolom spesifik',
    exportFilename: 'daftar-dokter',
    noDataMessage: 'Tidak ada data dokter yang ditemukan',
    searchNoDataMessage: 'Tidak ada dokter dengan kata kunci',
  },
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
  if (!isItemMasterTab(tab)) return;
  try {
    sessionStorage.setItem(LAST_TAB_SESSION_KEY, tab);
  } catch (error) {
    console.warn('Failed to save last tab to session storage:', error);
  }
};

const getLastTabFromSession = (): MasterDataType => {
  try {
    const savedTab = sessionStorage.getItem(LAST_TAB_SESSION_KEY);
    if (savedTab && isItemMasterTab(savedTab as MasterDataType)) {
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
    const normalizedPath = pathname.replace(/\/+$/, '');
    if (normalizedPath === '/master-data/item-master') {
      return getLastTabFromSession();
    }
    const pathSegments = normalizedPath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return URL_TO_TAB_MAP[lastSegment] || 'items';
  }, []);

  // Use getDerivedStateFromProps to sync activeTab with URL changes
  const activeTab = useMemo(
    () => getTabFromPath(location.pathname),
    [getTabFromPath, location.pathname]
  );

  const isItemTab = activeTab === 'items';
  const isSupplierTab = activeTab === 'suppliers';
  const isCustomerTab = activeTab === 'customers';
  const isPatientTab = activeTab === 'patients';
  const isDoctorTab = activeTab === 'doctors';
  const isItemEntityTab = isItemMasterEntityTab(activeTab);
  const isOtherMasterTab = isOtherMasterDataTab(activeTab);
  const otherMasterDataConfig = isOtherMasterTab
    ? OTHER_MASTER_DATA_CONFIG[activeTab]
    : null;

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

  const {
    suppliersQuery,
    supplierMutations,
    supplierFields,
    supplierColumnDefs,
    suppliersData,
    isAddSupplierModalOpen,
    isEditSupplierModalOpen,
    editingSupplier,
    openAddSupplierModal,
    closeAddSupplierModal,
    openEditSupplierModal,
    closeEditSupplierModal,
  } = useSupplierTab();

  const {
    isAddModalOpen: isAddCustomerModalOpen,
    setIsAddModalOpen: setIsAddCustomerModalOpen,
    isEditModalOpen: isEditCustomerModalOpen,
    setIsEditModalOpen: setIsEditCustomerModalOpen,
    editingItem: editingCustomer,
    data: customersData,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    queryError: customersQueryError,
    itemsPerPage: customerItemsPerPage,
    handleEdit: handleCustomerEdit,
    handleModalSubmit: handleCustomerModalSubmit,
    handleFieldAutosave: handleCustomerFieldAutosave,
    handleDelete: handleCustomerDelete,
    debouncedSearch: customerDebouncedSearch,
    handleKeyDown: handleCustomerKeyDown,
    setSearch: setCustomerDataSearch,
  } = useMasterDataManagement('customers', 'Pelanggan');

  const {
    isAddModalOpen: isAddPatientModalOpen,
    setIsAddModalOpen: setIsAddPatientModalOpen,
    isEditModalOpen: isEditPatientModalOpen,
    setIsEditModalOpen: setIsEditPatientModalOpen,
    editingItem: editingPatient,
    data: patientsData,
    isLoading: isPatientsLoading,
    isError: isPatientsError,
    queryError: patientsQueryError,
    itemsPerPage: patientItemsPerPage,
    handleEdit: handlePatientEdit,
    handleModalSubmit: handlePatientModalSubmit,
    handleFieldAutosave: handlePatientFieldAutosave,
    handleDelete: handlePatientDelete,
    debouncedSearch: patientDebouncedSearch,
    handleKeyDown: handlePatientKeyDown,
    setSearch: setPatientDataSearch,
  } = useMasterDataManagement('patients', 'Pasien');

  const {
    isAddModalOpen: isAddDoctorModalOpen,
    setIsAddModalOpen: setIsAddDoctorModalOpen,
    isEditModalOpen: isEditDoctorModalOpen,
    setIsEditModalOpen: setIsEditDoctorModalOpen,
    editingItem: editingDoctor,
    data: doctorsData,
    isLoading: isDoctorsLoading,
    isError: isDoctorsError,
    queryError: doctorsQueryError,
    itemsPerPage: doctorItemsPerPage,
    handleEdit: handleDoctorEdit,
    handleModalSubmit: handleDoctorModalSubmit,
    handleFieldAutosave: handleDoctorFieldAutosave,
    handleDelete: handleDoctorDelete,
    debouncedSearch: doctorDebouncedSearch,
    handleKeyDown: handleDoctorKeyDown,
    setSearch: setDoctorDataSearch,
  } = useMasterDataManagement('doctors', 'Dokter');

  const { levels: customerLevels } = useCustomerLevels();
  const customersDataTyped = customersData as CustomerType[];
  const patientsDataTyped = patientsData as PatientType[];
  const doctorsDataTyped = doctorsData as DoctorType[];

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
    activeEntityType: isItemEntityTab
      ? (activeTab as EntityType)
      : 'categories',
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
  });

  // Memoize entity options to prevent unnecessary re-renders
  const entityManagementOptions = useMemo(
    () => ({
      entityType: isItemEntityTab ? (activeTab as EntityType) : 'categories',
      search: entityManager.search,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: isItemEntityTab,
    }),
    [
      activeTab,
      entityManager.search,
      entityManager.itemsPerPage,
      isItemEntityTab,
    ]
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
      /* c8 ignore next 5 */
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      /* c8 ignore next */
      pendingTabRef.current = null;
    }
  }, [location.pathname, activeTab, getTabFromPath]);

  // Entity column visibility management
  const entityCurrentConfig = useMemo(
    () =>
      isItemEntityTab
        ? entityManager.entityConfigs[activeTab as EntityType]
        : null,
    [activeTab, entityManager.entityConfigs, isItemEntityTab]
  );

  const customerLevelOptions = useMemo(
    () =>
      customerLevels.map(level => ({
        id: level.id,
        name: level.level_name,
      })),
    [customerLevels]
  );

  const customerLevelById = useMemo(() => {
    return new Map(customerLevels.map(level => [level.id, level.level_name]));
  }, [customerLevels]);

  const defaultCustomerLevelId = customerLevels[0]?.id ?? null;

  const toCustomerPayload = useCallback(
    (data: Record<string, string | number | boolean | null>) => ({
      name: String(data.name || ''),
      customer_level_id: String(
        data.customer_level_id || defaultCustomerLevelId || ''
      ),
      phone: data.phone ? String(data.phone) : null,
      email: data.email ? String(data.email) : null,
      address: data.address ? String(data.address) : null,
    }),
    [defaultCustomerLevelId]
  );

  const toPatientPayload = useCallback(
    (data: Record<string, string | number | boolean | null>) => ({
      name: String(data.name || ''),
      gender: data.gender ? String(data.gender) : null,
      birth_date: data.birth_date ? String(data.birth_date) : null,
      address: data.address ? String(data.address) : null,
      phone: data.phone ? String(data.phone) : null,
      email: data.email ? String(data.email) : null,
      image_url: data.image_url ? String(data.image_url) : null,
    }),
    []
  );

  const toDoctorPayload = useCallback(
    (data: Record<string, string | number | boolean | null>) => {
      const rawExperienceYears = data.experience_years;
      const hasExperienceYears =
        rawExperienceYears !== null &&
        rawExperienceYears !== undefined &&
        String(rawExperienceYears).trim() !== '';
      const parsedExperienceYears = hasExperienceYears
        ? Number(rawExperienceYears)
        : null;

      return {
        name: String(data.name || ''),
        gender: data.gender ? String(data.gender) : null,
        specialization: data.specialization
          ? String(data.specialization)
          : null,
        license_number: data.license_number
          ? String(data.license_number)
          : null,
        experience_years:
          parsedExperienceYears !== null &&
          Number.isFinite(parsedExperienceYears)
            ? parsedExperienceYears
            : null,
        qualification: data.education ? String(data.education) : null,
        phone: data.phone ? String(data.phone) : null,
        email: data.email ? String(data.email) : null,
        image_url: data.image_url ? String(data.image_url) : null,
      };
    },
    []
  );

  const customerFields: FieldConfig[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nama Pelanggan',
        type: 'text',
      },
      {
        key: 'customer_level_id',
        label: 'Level Pelanggan',
        options: customerLevelOptions,
        isRadioDropdown: true,
      },
      {
        key: 'phone',
        label: 'Telepon',
        type: 'tel',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
      },
      {
        key: 'address',
        label: 'Alamat',
        type: 'textarea',
      },
    ],
    [customerLevelOptions]
  );

  const patientFields: FieldConfig[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nama Pasien',
        type: 'text',
      },
      {
        key: 'gender',
        label: 'Jenis Kelamin',
        type: 'text',
        options: [
          { id: 'L', name: 'Laki-laki' },
          { id: 'P', name: 'Perempuan' },
        ],
        isRadioDropdown: true,
      },
      {
        key: 'birth_date',
        label: 'Tanggal Lahir',
        type: 'date',
      },
      {
        key: 'address',
        label: 'Alamat',
        type: 'textarea',
      },
      {
        key: 'phone',
        label: 'Telepon',
        type: 'tel',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
      },
    ],
    []
  );

  const doctorFields: FieldConfig[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nama Dokter',
        type: 'text',
      },
      {
        key: 'gender',
        label: 'Jenis Kelamin',
        type: 'text',
        options: [
          { id: 'L', name: 'Laki-laki' },
          { id: 'P', name: 'Perempuan' },
        ],
        isRadioDropdown: true,
      },
      {
        key: 'specialization',
        label: 'Spesialisasi',
        type: 'text',
      },
      {
        key: 'license_number',
        label: 'Nomor Lisensi',
        type: 'text',
      },
      {
        key: 'experience_years',
        label: 'Tahun Pengalaman',
        type: 'text',
      },
      {
        key: 'education',
        label: 'Pendidikan',
        type: 'textarea',
      },
      {
        key: 'phone',
        label: 'Telepon',
        type: 'tel',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
      },
    ],
    []
  );

  const customerColumnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Pelanggan',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'customer_level_id',
        headerName: 'Level',
        minWidth: 140,
        valueGetter: params =>
          customerLevelById.get(params.data.customer_level_id) || '-',
      }),
      createTextColumn({
        field: 'phone',
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data.phone || '-',
      }),
      createTextColumn({
        field: 'email',
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data.email || '-',
      }),
      createTextColumn({
        field: 'address',
        headerName: 'Alamat',
        minWidth: 180,
        flex: 1,
        valueGetter: params => params.data.address || '-',
      }),
    ];

    return columns;
  }, [customerLevelById]);

  const patientColumnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Pasien',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'gender',
        headerName: 'Jenis Kelamin',
        minWidth: 120,
        valueGetter: params => params.data.gender || '-',
      }),
      createTextColumn({
        field: 'birth_date',
        headerName: 'Tanggal Lahir',
        minWidth: 120,
        valueGetter: params => {
          const value = params.data.birth_date;
          return value && typeof value === 'string'
            ? new Date(value).toLocaleDateString('id-ID')
            : '-';
        },
      }),
      createTextColumn({
        field: 'address',
        headerName: 'Alamat',
        minWidth: 150,
        flex: 1,
        valueGetter: params => params.data.address || '-',
      }),
      createTextColumn({
        field: 'phone',
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data.phone || '-',
      }),
      createTextColumn({
        field: 'email',
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data.email || '-',
      }),
    ];

    return columns;
  }, []);

  const doctorColumnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Dokter',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'gender',
        headerName: 'Jenis Kelamin',
        minWidth: 120,
        valueGetter: params => {
          const value = params.data.gender;
          return value === 'L'
            ? 'Laki-laki'
            : value === 'P'
              ? 'Perempuan'
              : value || '-';
        },
      }),
      createTextColumn({
        field: 'specialization',
        headerName: 'Spesialisasi',
        minWidth: 150,
        valueGetter: params => params.data.specialization || '-',
      }),
      createTextColumn({
        field: 'license_number',
        headerName: 'Nomor Lisensi',
        minWidth: 120,
        valueGetter: params => params.data.license_number || '-',
      }),
      createTextColumn({
        field: 'experience_years',
        headerName: 'Pengalaman',
        minWidth: 100,
        valueGetter: params => {
          const years = params.data.experience_years;
          return years ? `${years} tahun` : '-';
        },
      }),
      createTextColumn({
        field: 'phone',
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data.phone || '-',
      }),
      createTextColumn({
        field: 'email',
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data.email || '-',
      }),
    ];

    return columns;
  }, []);

  // Entity column definitions with unique field IDs per table
  const entityColumnDefs: ColDef[] = useMemo(() => {
    if (!isItemEntityTab || !entityCurrentConfig) return [];

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
  }, [activeTab, entityCurrentConfig, isItemEntityTab]);

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
    if (!isItemEntityTab) return [];

    const allColumns = getSearchColumnsByEntity(activeTab);

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
  }, [activeTab, isItemEntityTab, visibleColumns]);

  const supplierSearchColumns = useMemo(() => {
    if (!isSupplierTab) return [];

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
  }, [isSupplierTab, visibleColumns]);

  const customerSearchColumns = useMemo(() => {
    if (!isCustomerTab) return [];

    const allColumns = getSearchColumnsByEntity('customers');
    if (visibleColumns.length === 0) return allColumns;

    return [...allColumns].sort((a, b) => {
      const indexA = visibleColumns.indexOf(a.field);
      const indexB = visibleColumns.indexOf(b.field);
      const safeA = indexA === -1 ? visibleColumns.length : indexA;
      const safeB = indexB === -1 ? visibleColumns.length : indexB;
      return safeA - safeB;
    });
  }, [isCustomerTab, visibleColumns]);

  const patientSearchColumns = useMemo(() => {
    if (!isPatientTab) return [];

    const allColumns = getSearchColumnsByEntity('patients');
    if (visibleColumns.length === 0) return allColumns;

    return [...allColumns].sort((a, b) => {
      const indexA = visibleColumns.indexOf(a.field);
      const indexB = visibleColumns.indexOf(b.field);
      const safeA = indexA === -1 ? visibleColumns.length : indexA;
      const safeB = indexB === -1 ? visibleColumns.length : indexB;
      return safeA - safeB;
    });
  }, [isPatientTab, visibleColumns]);

  const doctorSearchColumns = useMemo(() => {
    if (!isDoctorTab) return [];

    const allColumns = getSearchColumnsByEntity('doctors');
    if (visibleColumns.length === 0) return allColumns;

    return [...allColumns].sort((a, b) => {
      const indexA = visibleColumns.indexOf(a.field);
      const indexB = visibleColumns.indexOf(b.field);
      const safeA = indexA === -1 ? visibleColumns.length : indexA;
      const safeB = indexB === -1 ? visibleColumns.length : indexB;
      return safeA - safeB;
    });
  }, [isDoctorTab, visibleColumns]);

  const handleSupplierFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      // 🔒 Block grid filter changes during tab switching
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (!isSupplierTab) {
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
    [activeTab, isSupplierTab, unifiedGridApi]
  );

  // Entity filter search handler
  const handleEntityFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      // 🔒 Block grid filter changes during tab switching
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (!isItemEntityTab) {
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
    [activeTab, isItemEntityTab, unifiedGridApi]
  );

  const handleMasterDataFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (!isOtherMasterTab) {
        return;
      }

      if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
        return;
      }

      const advancedFilterModel = buildAdvancedFilterModel(filterSearch);
      unifiedGridApi.setAdvancedFilterModel(advancedFilterModel);

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
    [activeTab, isOtherMasterTab, unifiedGridApi]
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

  const {
    search: customerSearch,
    setSearch: setCustomerSearch,
    onGridReady: customerOnGridReady,
    isExternalFilterPresent: customerIsExternalFilterPresent,
    doesExternalFilterPass: customerDoesExternalFilterPass,
    searchBarProps: customerSearchBarProps,
    clearSearchUIOnly: clearCustomerSearchUIOnly,
  } = useUnifiedSearch({
    columns: customerSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: customersDataTyped,
    onSearch: setCustomerDataSearch,
    onClear: () => setCustomerDataSearch(''),
    onFilterSearch: handleMasterDataFilterSearch,
  });

  const {
    search: patientSearch,
    setSearch: setPatientSearch,
    onGridReady: patientOnGridReady,
    isExternalFilterPresent: patientIsExternalFilterPresent,
    doesExternalFilterPass: patientDoesExternalFilterPass,
    searchBarProps: patientSearchBarProps,
    clearSearchUIOnly: clearPatientSearchUIOnly,
  } = useUnifiedSearch({
    columns: patientSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: patientsDataTyped,
    onSearch: setPatientDataSearch,
    onClear: () => setPatientDataSearch(''),
    onFilterSearch: handleMasterDataFilterSearch,
  });

  const {
    search: doctorSearch,
    setSearch: setDoctorSearch,
    onGridReady: doctorOnGridReady,
    isExternalFilterPresent: doctorIsExternalFilterPresent,
    doesExternalFilterPass: doctorDoesExternalFilterPass,
    searchBarProps: doctorSearchBarProps,
    clearSearchUIOnly: clearDoctorSearchUIOnly,
  } = useUnifiedSearch({
    columns: doctorSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: doctorsDataTyped,
    onSearch: setDoctorDataSearch,
    onClear: () => setDoctorDataSearch(''),
    onFilterSearch: handleMasterDataFilterSearch,
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

  const masterDataRows = useMemo(() => {
    if (isItemEntityTab) return entityData.data;
    if (isCustomerTab) return customersDataTyped;
    if (isPatientTab) return patientsDataTyped;
    if (isDoctorTab) return doctorsDataTyped;
    return [];
  }, [
    customersDataTyped,
    doctorsDataTyped,
    entityData.data,
    isCustomerTab,
    isDoctorTab,
    isItemEntityTab,
    isPatientTab,
    patientsDataTyped,
  ]);

  const masterDataColumnDefs = useMemo(() => {
    if (isItemEntityTab) return entityColumnDefs;
    if (isCustomerTab) return customerColumnDefs;
    if (isPatientTab) return patientColumnDefs;
    if (isDoctorTab) return doctorColumnDefs;
    return [];
  }, [
    customerColumnDefs,
    doctorColumnDefs,
    entityColumnDefs,
    isCustomerTab,
    isDoctorTab,
    isItemEntityTab,
    isPatientTab,
    patientColumnDefs,
  ]);

  const masterDataConfig = useMemo(() => {
    if (isItemEntityTab) return entityCurrentConfig;
    if (otherMasterDataConfig) {
      return {
        entityName: otherMasterDataConfig.entityName,
        nameColumnHeader: 'Nama',
        searchPlaceholder: otherMasterDataConfig.searchPlaceholder,
        noDataMessage: otherMasterDataConfig.noDataMessage,
        searchNoDataMessage: otherMasterDataConfig.searchNoDataMessage,
      };
    }
    return null;
  }, [entityCurrentConfig, isItemEntityTab, otherMasterDataConfig]);

  const activeItemsPerPage = useMemo(() => {
    if (isItemTab) return itemsManagement.itemsPerPage;
    if (isCustomerTab) return customerItemsPerPage;
    if (isPatientTab) return patientItemsPerPage;
    if (isDoctorTab) return doctorItemsPerPage;
    return itemsManagement.itemsPerPage;
  }, [
    customerItemsPerPage,
    doctorItemsPerPage,
    isCustomerTab,
    isDoctorTab,
    isItemTab,
    isPatientTab,
    itemsManagement.itemsPerPage,
    patientItemsPerPage,
  ]);

  // Restore SearchBar badge UI per tab (session-scoped)
  // Priority: explicit saved pattern → derive from grid_state_{tab}.advancedFilterModel
  useEffect(() => {
    const setSearch =
      activeTab === 'items'
        ? setItemSearch
        : activeTab === 'suppliers'
          ? setSupplierSearch
          : activeTab === 'customers'
            ? setCustomerSearch
            : activeTab === 'patients'
              ? setPatientSearch
              : activeTab === 'doctors'
                ? setDoctorSearch
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
  }, [
    activeTab,
    setCustomerSearch,
    setDoctorSearch,
    setEntitySearch,
    setItemSearch,
    setPatientSearch,
    setSupplierSearch,
  ]);

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
        entityManager.isEditModalOpen ||
        isAddCustomerModalOpen ||
        isEditCustomerModalOpen ||
        isAddPatientModalOpen ||
        isEditPatientModalOpen ||
        isAddDoctorModalOpen ||
        isEditDoctorModalOpen;
      const activeDialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (isAnyModalOpen || activeDialog) return;

      // Check if user is already typing in an input/textarea/select
      const target = e.target as HTMLElement;
      /* c8 ignore next 3 */
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
    isAddCustomerModalOpen,
    isEditCustomerModalOpen,
    isAddPatientModalOpen,
    isEditPatientModalOpen,
    isAddDoctorModalOpen,
    isEditDoctorModalOpen,
  ]);

  // Auto-focus SearchBar on initial mount and tab (sub-page) changes.
  // We intentionally prefer focusing our SearchBar over AG Grid internals.
  useEffect(() => {
    if (isTabSelectorExpanded) return;

    const isAnyModalOpen =
      isAddItemModalOpen ||
      entityManager.isAddModalOpen ||
      entityManager.isEditModalOpen ||
      isAddCustomerModalOpen ||
      isEditCustomerModalOpen ||
      isAddPatientModalOpen ||
      isEditPatientModalOpen ||
      isAddDoctorModalOpen ||
      isEditDoctorModalOpen;
    if (isAnyModalOpen) return;

    let cancelled = false;
    let attempts = 0;

    const focusSearch = (): boolean => {
      if (
        isAddItemModalOpen ||
        entityManager.isAddModalOpen ||
        entityManager.isEditModalOpen ||
        isAddCustomerModalOpen ||
        isEditCustomerModalOpen ||
        isAddPatientModalOpen ||
        isEditPatientModalOpen ||
        isAddDoctorModalOpen ||
        isEditDoctorModalOpen
      ) {
        /* c8 ignore next */
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
    isAddCustomerModalOpen,
    isEditCustomerModalOpen,
    isAddPatientModalOpen,
    isEditPatientModalOpen,
    isAddDoctorModalOpen,
    isEditDoctorModalOpen,
    isTabSelectorExpanded,
  ]);

  // Keep focus on SearchBar when clicking non-input UI.
  // This makes the page feel "type-to-search" by default.
  useEffect(() => {
    if (isTabSelectorExpanded) return;

    const isAnyModalOpen =
      isAddItemModalOpen ||
      entityManager.isAddModalOpen ||
      entityManager.isEditModalOpen ||
      isAddCustomerModalOpen ||
      isEditCustomerModalOpen ||
      isAddPatientModalOpen ||
      isEditPatientModalOpen ||
      isAddDoctorModalOpen ||
      isEditDoctorModalOpen;

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
    isAddCustomerModalOpen,
    isEditCustomerModalOpen,
    isAddPatientModalOpen,
    isEditPatientModalOpen,
    isAddDoctorModalOpen,
    isEditDoctorModalOpen,
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
      entityManager.isEditModalOpen ||
      isAddCustomerModalOpen ||
      isEditCustomerModalOpen ||
      isAddPatientModalOpen ||
      isEditPatientModalOpen ||
      isAddDoctorModalOpen ||
      isEditDoctorModalOpen;

    const prev = wasAnyModalOpenRef.current;
    wasAnyModalOpenRef.current = isAnyModalOpen;

    if (!prev || isAnyModalOpen) return;

    let cancelled = false;
    let attempts = 0;

    const tryFocus = () => {
      /* c8 ignore next */
      if (cancelled) return;

      // Wait until all dialogs are actually removed from DOM (exit animations).
      /* c8 ignore start */
      const dialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (dialog && attempts < 20) {
        attempts += 1;
        setTimeout(tryFocus, 50);
        return;
      }

      input.focus();
      /* c8 ignore end */
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
    isAddCustomerModalOpen,
    isEditCustomerModalOpen,
    isAddPatientModalOpen,
    isEditPatientModalOpen,
    isAddDoctorModalOpen,
    isEditDoctorModalOpen,
    isTabSelectorExpanded,
  ]);

  // Navigation logic extracted for reuse
  const performNavigation = useCallback(
    (targetTab: MasterDataType) => {
      navigate(
        targetTab === 'suppliers'
          ? '/master-data/suppliers'
          : targetTab === 'customers'
            ? '/master-data/customers'
            : targetTab === 'patients'
              ? '/master-data/patients'
              : targetTab === 'doctors'
                ? '/master-data/doctors'
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
        /* c8 ignore next */
        clearSupplierSearchUIOnly();
      } else if (activeTab === 'customers') {
        /* c8 ignore next */
        clearCustomerSearchUIOnly();
      } else if (activeTab === 'patients') {
        /* c8 ignore next */
        clearPatientSearchUIOnly();
      } else if (activeTab === 'doctors') {
        /* c8 ignore next */
        clearDoctorSearchUIOnly();
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

      if (isAddCustomerModalOpen) {
        setIsAddCustomerModalOpen(false);
      }
      if (isEditCustomerModalOpen) {
        setIsEditCustomerModalOpen(false);
      }
      if (isAddPatientModalOpen) {
        setIsAddPatientModalOpen(false);
      }
      if (isEditPatientModalOpen) {
        setIsEditPatientModalOpen(false);
      }
      if (isAddDoctorModalOpen) {
        setIsAddDoctorModalOpen(false);
      }
      if (isEditDoctorModalOpen) {
        setIsEditDoctorModalOpen(false);
      }
    },
    [
      navigate,
      activeTab,
      isTabSelectorExpanded,
      isAddItemModalOpen,
      isAddCustomerModalOpen,
      isEditCustomerModalOpen,
      isAddPatientModalOpen,
      isEditPatientModalOpen,
      isAddDoctorModalOpen,
      isEditDoctorModalOpen,
      closeAddItemModal,
      setIsAddCustomerModalOpen,
      setIsEditCustomerModalOpen,
      setIsAddPatientModalOpen,
      setIsEditPatientModalOpen,
      setIsAddDoctorModalOpen,
      setIsEditDoctorModalOpen,
      clearItemSearchUIOnly,
      clearEntitySearchUIOnly,
      clearCustomerSearchUIOnly,
      clearDoctorSearchUIOnly,
      clearPatientSearchUIOnly,
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
    (
      data:
        | ItemDataType
        | EntityData
        | SupplierType
        | CustomerType
        | PatientType
        | DoctorType
    ) => {
      if (activeTab === 'items') {
        // Convert back to base Item type for editing
        const baseItem = data as ItemDataType;
        handleItemEdit(baseItem);
      } else if (activeTab === 'suppliers') {
        openEditSupplierModal(data as SupplierType);
      } else if (activeTab === 'customers') {
        handleCustomerEdit(data as CustomerType);
      } else if (activeTab === 'patients') {
        handlePatientEdit(data as PatientType);
      } else if (activeTab === 'doctors') {
        handleDoctorEdit(data as DoctorType);
      } else {
        entityManager.openEditModal(data as EntityData);
      }
    },
    [
      activeTab,
      handleCustomerEdit,
      handleDoctorEdit,
      handleItemEdit,
      handlePatientEdit,
      entityManager,
      openEditSupplierModal,
    ]
  );

  const unifiedGridReadyHandler = useCallback(
    (params: GridReadyEvent) => {
      if (activeTab === 'items') {
        enhancedItemOnGridReady(params);
      } else if (activeTab === 'suppliers') {
        supplierOnGridReady(params);
      } else if (activeTab === 'customers') {
        customerOnGridReady(params);
      } else if (activeTab === 'patients') {
        patientOnGridReady(params);
      } else if (activeTab === 'doctors') {
        doctorOnGridReady(params);
      } else {
        entityOnGridReady(params);
      }
    },
    [
      activeTab,
      customerOnGridReady,
      doctorOnGridReady,
      enhancedItemOnGridReady,
      entityOnGridReady,
      patientOnGridReady,
      supplierOnGridReady,
    ]
  );

  const showTabSelector = isItemMasterTab(activeTab);
  const pageTitle =
    activeTab === 'suppliers'
      ? 'Daftar Supplier'
      : (otherMasterDataConfig?.title ?? 'Item Master');

  const activeSearchBarProps = isItemTab
    ? itemSearchBarProps
    : isSupplierTab
      ? supplierSearchBarProps
      : isCustomerTab
        ? customerSearchBarProps
        : isPatientTab
          ? patientSearchBarProps
          : isDoctorTab
            ? doctorSearchBarProps
            : entitySearchBarProps;

  const activeSearchValue = isItemTab
    ? itemSearch
    : isSupplierTab
      ? supplierSearch
      : isCustomerTab
        ? customerSearch
        : isPatientTab
          ? patientSearch
          : isDoctorTab
            ? doctorSearch
            : entitySearch;

  const activePlaceholder = isItemTab
    ? 'Cari item...'
    : isSupplierTab
      ? 'Cari supplier...'
      : (otherMasterDataConfig?.searchPlaceholder ??
        `${entityCurrentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`);

  const activeOnAdd = isItemTab
    ? () => handleAddItem(undefined, itemSearch)
    : isSupplierTab
      ? openAddSupplierModal
      : isCustomerTab
        ? () => setIsAddCustomerModalOpen(true)
        : isPatientTab
          ? () => setIsAddPatientModalOpen(true)
          : isDoctorTab
            ? () => setIsAddDoctorModalOpen(true)
            : entityManager.openAddModal;

  const activeOnKeyDown = isCustomerTab
    ? handleCustomerKeyDown
    : isPatientTab
      ? handlePatientKeyDown
      : isDoctorTab
        ? handleDoctorKeyDown
        : undefined;

  const activeExportFilename = isItemTab
    ? 'daftar-item'
    : isSupplierTab
      ? 'daftar-supplier'
      : (otherMasterDataConfig?.exportFilename ??
        (activeTab === 'categories'
          ? 'kategori-item'
          : activeTab === 'types'
            ? 'jenis-item'
            : activeTab === 'packages'
              ? 'kemasan-item'
              : activeTab === 'dosages'
                ? 'sediaan-item'
                : activeTab === 'manufacturers'
                  ? 'produsen-item'
                  : 'satuan-item'));

  const activeIsLoading = isItemTab
    ? itemsManagement.isLoading
    : isSupplierTab
      ? suppliersQuery.isLoading
      : isCustomerTab
        ? isCustomersLoading
        : isPatientTab
          ? isPatientsLoading
          : isDoctorTab
            ? isDoctorsLoading
            : entityData.isLoading;

  const activeIsError = isItemTab
    ? itemsManagement.isError
    : isSupplierTab
      ? suppliersQuery.isError
      : isCustomerTab
        ? isCustomersError
        : isPatientTab
          ? isPatientsError
          : isDoctorTab
            ? isDoctorsError
            : entityData.isError;

  const activeError = isItemTab
    ? itemsManagement.queryError
    : isSupplierTab
      ? suppliersQuery.error
      : isCustomerTab
        ? customersQueryError
        : isPatientTab
          ? patientsQueryError
          : isDoctorTab
            ? doctorsQueryError
            : entityData.error;

  const activeIsExternalFilterPresent = isItemTab
    ? itemIsExternalFilterPresent
    : isSupplierTab
      ? supplierIsExternalFilterPresent
      : isCustomerTab
        ? customerIsExternalFilterPresent
        : isPatientTab
          ? patientIsExternalFilterPresent
          : isDoctorTab
            ? doctorIsExternalFilterPresent
            : entityIsExternalFilterPresent;

  const activeDoesExternalFilterPass = isItemTab
    ? itemDoesExternalFilterPass
    : isSupplierTab
      ? supplierDoesExternalFilterPass
      : isCustomerTab
        ? customerDoesExternalFilterPass
        : isPatientTab
          ? patientDoesExternalFilterPass
          : isDoctorTab
            ? doctorDoesExternalFilterPass
            : entityDoesExternalFilterPass;

  const activeItemsSelection = isItemTab
    ? (itemsManagement.data as ItemDataType[])
    : undefined;

  const activeOnItemSelect = isItemTab ? handleItemSelect : undefined;

  const enableTabShortcuts = isItemMasterTab(activeTab);

  // Removed unified column handlers - now handled by live save in EntityGrid

  // No need for mouse handlers - handled by SlidingSelector

  // Unified rendering - keep tabs always mounted for smooth animation
  return (
    <>
      <Card>
        <div className="relative flex items-center justify-center mb-0 pt-0">
          <div className="absolute left-0 pb-4 pt-6">
            {showTabSelector && (
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

          <PageTitle title={pageTitle} />
        </div>

        {/* Unified SearchToolbar */}
        <div className="flex items-center pt-8">
          <div className="grow">
            <SearchToolbar
              searchInputRef={
                searchInputRef as React.RefObject<HTMLInputElement>
              }
              searchBarProps={activeSearchBarProps}
              search={activeSearchValue}
              placeholder={activePlaceholder}
              onAdd={activeOnAdd}
              onKeyDown={activeOnKeyDown}
              items={activeItemsSelection}
              onItemSelect={activeOnItemSelect}
              gridApi={unifiedGridApi}
              exportFilename={activeExportFilename}
              onTabNext={enableTabShortcuts ? handleTabNext : undefined}
              onTabPrevious={enableTabShortcuts ? handleTabPrevious : undefined}
            />
          </div>
        </div>

        {/* Unified EntityGrid */}
        <div>
          <EntityGrid
            activeTab={activeTab}
            itemsData={itemsManagement.data as ItemDataType[]}
            suppliersData={suppliersForDisplay}
            entityData={masterDataRows}
            isLoading={activeIsLoading}
            isError={activeIsError}
            error={activeError}
            search={activeSearchValue}
            itemColumnDefs={itemColumnDefs}
            entityConfig={masterDataConfig}
            entityColumnDefs={masterDataColumnDefs}
            supplierColumnDefs={supplierColumnDefs}
            onRowClick={unifiedRowClickHandler}
            onGridReady={unifiedGridReadyHandler}
            isExternalFilterPresent={activeIsExternalFilterPresent}
            doesExternalFilterPass={activeDoesExternalFilterPass}
            onGridApiReady={handleUnifiedGridApiReady}
            itemsPerPage={activeItemsPerPage}
            isRowGroupingEnabled={
              activeTab === 'items' ? isRowGroupingEnabled : false
            }
            defaultExpanded={activeTab === 'items' ? defaultExpanded : 1}
            showGroupPanel={activeTab === 'items' ? showGroupPanel : true}
          />
        </div>
      </Card>

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
      {isItemEntityTab &&
        (entityManager.isAddModalOpen || entityManager.isEditModalOpen) && (
          <EntityModal
            isOpen={true}
            onClose={
              entityManager.isEditModalOpen
                ? entityManager.closeEditModal
                : entityManager.closeAddModal
            }
            onSubmit={entityManager.handleSubmit}
            onFieldAutosave={entityManager.handleFieldAutosave}
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

      <SupplierModals
        isActive={activeTab === 'suppliers'}
        supplierFields={supplierFields}
        supplierSearch={supplierSearch}
        isAddSupplierModalOpen={isAddSupplierModalOpen}
        isEditSupplierModalOpen={isEditSupplierModalOpen}
        editingSupplier={editingSupplier}
        supplierMutations={supplierMutations}
        openConfirmDialog={openConfirmDialog}
        closeAddSupplierModal={closeAddSupplierModal}
        closeEditSupplierModal={closeEditSupplierModal}
      />

      {/* Customer Modals */}
      <IdentityDataModal
        title="Tambah Pelanggan Baru"
        data={{ customer_level_id: defaultCustomerLevelId }}
        fields={customerFields}
        isOpen={isCustomerTab && isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSave={async data => {
          await handleCustomerModalSubmit({
            data: toCustomerPayload(data),
          });
        }}
        mode="add"
        initialNameFromSearch={customerDebouncedSearch}
        showImageUploader={false}
        useInlineFieldActions={false}
      />

      <IdentityDataModal
        title="Edit Pelanggan"
        data={
          (editingCustomer as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={customerFields}
        isOpen={isCustomerTab && isEditCustomerModalOpen}
        onClose={() => setIsEditCustomerModalOpen(false)}
        onSave={async data => {
          await handleCustomerModalSubmit({
            id: editingCustomer?.id,
            data: toCustomerPayload(data),
          });
        }}
        onFieldSave={async (key, value) => {
          await handleCustomerFieldAutosave(editingCustomer?.id, key, value);
        }}
        onDeleteRequest={
          editingCustomer
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus pelanggan "${editingCustomer.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await handleCustomerDelete(editingCustomer.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        showImageUploader={false}
        useInlineFieldActions={false}
      />

      {/* Patient Modals */}
      <IdentityDataModal
        title="Tambah Pasien Baru"
        data={{}}
        fields={patientFields}
        isOpen={isPatientTab && isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onSave={async data => {
          await handlePatientModalSubmit({
            data: toPatientPayload(data),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={patientDebouncedSearch}
        useInlineFieldActions={false}
      />

      <IdentityDataModal
        title="Edit Pasien"
        data={
          (editingPatient as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={patientFields}
        isOpen={isPatientTab && isEditPatientModalOpen}
        onClose={() => setIsEditPatientModalOpen(false)}
        onSave={async data => {
          await handlePatientModalSubmit({
            data: toPatientPayload(data),
            id: editingPatient?.id,
          });
        }}
        onFieldSave={async (key, value) => {
          await handlePatientFieldAutosave(editingPatient?.id, key, value);
        }}
        onDeleteRequest={
          editingPatient
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus pasien "${editingPatient.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await handlePatientDelete(editingPatient.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={(editingPatient as PatientType)?.image_url || undefined}
        useInlineFieldActions={false}
      />

      {/* Doctor Modals */}
      <IdentityDataModal
        title="Tambah Dokter Baru"
        data={{}}
        fields={doctorFields}
        isOpen={isDoctorTab && isAddDoctorModalOpen}
        onClose={() => setIsAddDoctorModalOpen(false)}
        onSave={async data => {
          await handleDoctorModalSubmit({
            data: toDoctorPayload(data),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={doctorDebouncedSearch}
        useInlineFieldActions={false}
      />

      <IdentityDataModal
        title="Edit Dokter"
        data={
          (editingDoctor as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={doctorFields}
        isOpen={isDoctorTab && isEditDoctorModalOpen}
        onClose={() => setIsEditDoctorModalOpen(false)}
        onSave={async data => {
          await handleDoctorModalSubmit({
            data: toDoctorPayload(data),
            id: editingDoctor?.id,
          });
        }}
        onFieldSave={async (key, value) => {
          await handleDoctorFieldAutosave(editingDoctor?.id, key, value);
        }}
        onDeleteRequest={
          editingDoctor
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus dokter "${editingDoctor.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await handleDoctorDelete(editingDoctor.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={(editingDoctor as DoctorType)?.image_url || undefined}
        useInlineFieldActions={false}
      />
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;
