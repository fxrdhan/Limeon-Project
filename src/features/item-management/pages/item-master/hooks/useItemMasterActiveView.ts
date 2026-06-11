import type { MasterDataType } from '@/features/item-management/shared/types';
import type {
  EntityConfig,
  EntityData,
} from '@/features/item-management/application/hooks/collections/useEntityManager';
import type { Item as ItemDataType } from '@/types/database';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
} from '@/types';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import { useCallback, useMemo, type KeyboardEvent } from 'react';

type OtherMasterDataConfig = {
  entityName: string;
  searchPlaceholder: string;
  exportFilename: string;
  noDataMessage: string;
  searchNoDataMessage: string;
};

type MasterDataRow = EntityData | CustomerType | PatientType | DoctorType;

type ColumnDef = ColDef | ColGroupDef;

interface UseItemMasterActiveViewParams {
  activeTab: MasterDataType;
  flags: {
    isItemTab: boolean;
    isSupplierTab: boolean;
    isCustomerTab: boolean;
    isPatientTab: boolean;
    isDoctorTab: boolean;
    isItemEntityTab: boolean;
    isOtherMasterTab: boolean;
  };
  config: {
    entityCurrentConfig: EntityConfig | null;
    otherMasterDataConfig: OtherMasterDataConfig | null;
  };
  data: {
    itemsData: ItemDataType[];
    entityRows: EntityData[];
    customers: CustomerType[];
    patients: PatientType[];
    doctors: DoctorType[];
  };
  columns: {
    entityColumnDefs: ColumnDef[];
    customerColumnDefs: ColumnDef[];
    patientColumnDefs: ColumnDef[];
    doctorColumnDefs: ColumnDef[];
  };
  pagination: {
    itemItemsPerPage: number;
    entityItemsPerPage: number;
    customerItemsPerPage: number;
    patientItemsPerPage: number;
    doctorItemsPerPage: number;
  };
  status: {
    items: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };
    suppliers: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };
    customers: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };
    patients: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };
    doctors: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };
    entity: {
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };
  };
  toolbar: {
    activeSearchValue: string;
    handleAddItem: (itemId?: string, searchQuery?: string) => void;
    openAddSupplierModal: () => void;
    openAddEntityModal: () => void;
    openAddCustomerModal: () => void;
    openAddPatientModal: () => void;
    openAddDoctorModal: () => void;
    handleCustomerKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    handlePatientKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    handleDoctorKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    handleItemSelect: (item: { id: string }) => void;
  };
}

const ITEM_ENTITY_EXPORT_FILENAMES: Partial<Record<MasterDataType, string>> = {
  categories: 'kategori-item',
  types: 'jenis-item',
  packages: 'kemasan-item',
  dosages: 'sediaan-item',
  manufacturers: 'produsen-item',
  units: 'satuan-item',
};

const getItemEntityExportFilename = (activeTab: MasterDataType) =>
  ITEM_ENTITY_EXPORT_FILENAMES[activeTab] ?? 'satuan-item';

export const useItemMasterActiveView = ({
  activeTab,
  flags,
  config,
  data,
  columns,
  pagination,
  status,
  toolbar,
}: UseItemMasterActiveViewParams) => {
  const masterDataRows = useMemo<MasterDataRow[]>(() => {
    if (flags.isItemEntityTab) return data.entityRows;
    if (flags.isCustomerTab) return data.customers;
    if (flags.isPatientTab) return data.patients;
    if (flags.isDoctorTab) return data.doctors;
    return [];
  }, [
    data.customers,
    data.doctors,
    data.entityRows,
    data.patients,
    flags.isCustomerTab,
    flags.isDoctorTab,
    flags.isItemEntityTab,
    flags.isPatientTab,
  ]);

  const masterDataColumnDefs = useMemo<ColumnDef[]>(() => {
    if (flags.isItemEntityTab) return columns.entityColumnDefs;
    if (flags.isCustomerTab) return columns.customerColumnDefs;
    if (flags.isPatientTab) return columns.patientColumnDefs;
    if (flags.isDoctorTab) return columns.doctorColumnDefs;
    return [];
  }, [
    columns.customerColumnDefs,
    columns.doctorColumnDefs,
    columns.entityColumnDefs,
    columns.patientColumnDefs,
    flags.isCustomerTab,
    flags.isDoctorTab,
    flags.isItemEntityTab,
    flags.isPatientTab,
  ]);

  const masterDataConfig = useMemo(() => {
    if (flags.isItemEntityTab) return config.entityCurrentConfig;
    if (config.otherMasterDataConfig) {
      return {
        entityName: config.otherMasterDataConfig.entityName,
        nameColumnHeader: 'Nama',
        searchPlaceholder: config.otherMasterDataConfig.searchPlaceholder,
        noDataMessage: config.otherMasterDataConfig.noDataMessage,
        searchNoDataMessage: config.otherMasterDataConfig.searchNoDataMessage,
      };
    }
    return null;
  }, [
    config.entityCurrentConfig,
    config.otherMasterDataConfig,
    flags.isItemEntityTab,
  ]);

  const activeItemsPerPage = useMemo(() => {
    if (flags.isItemTab) return pagination.itemItemsPerPage;
    if (flags.isItemEntityTab) return pagination.entityItemsPerPage;
    if (flags.isSupplierTab) return 25;
    if (flags.isCustomerTab) return pagination.customerItemsPerPage;
    if (flags.isPatientTab) return pagination.patientItemsPerPage;
    if (flags.isDoctorTab) return pagination.doctorItemsPerPage;
    return 25;
  }, [
    flags.isCustomerTab,
    flags.isDoctorTab,
    flags.isItemEntityTab,
    flags.isItemTab,
    flags.isPatientTab,
    flags.isSupplierTab,
    pagination.customerItemsPerPage,
    pagination.doctorItemsPerPage,
    pagination.entityItemsPerPage,
    pagination.itemItemsPerPage,
    pagination.patientItemsPerPage,
  ]);

  const activePlaceholder = flags.isItemTab
    ? 'Cari item...'
    : flags.isSupplierTab
      ? 'Cari supplier...'
      : (config.otherMasterDataConfig?.searchPlaceholder ??
        `${config.entityCurrentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`);

  const activeOnAdd = useCallback(() => {
    if (flags.isItemTab) {
      toolbar.handleAddItem(undefined, toolbar.activeSearchValue);
      return;
    }
    if (flags.isSupplierTab) {
      toolbar.openAddSupplierModal();
      return;
    }
    if (flags.isCustomerTab) {
      toolbar.openAddCustomerModal();
      return;
    }
    if (flags.isPatientTab) {
      toolbar.openAddPatientModal();
      return;
    }
    if (flags.isDoctorTab) {
      toolbar.openAddDoctorModal();
      return;
    }
    toolbar.openAddEntityModal();
  }, [
    flags.isCustomerTab,
    flags.isDoctorTab,
    flags.isItemTab,
    flags.isPatientTab,
    flags.isSupplierTab,
    toolbar,
  ]);

  const activeOnKeyDown = flags.isCustomerTab
    ? toolbar.handleCustomerKeyDown
    : flags.isPatientTab
      ? toolbar.handlePatientKeyDown
      : flags.isDoctorTab
        ? toolbar.handleDoctorKeyDown
        : undefined;

  const activeAddTooltipLabel = flags.isItemTab
    ? 'Tambah Item Baru'
    : flags.isSupplierTab
      ? 'Tambah Supplier Baru'
      : flags.isOtherMasterTab && config.otherMasterDataConfig
        ? `Tambah ${config.otherMasterDataConfig.entityName} Baru`
        : (config.entityCurrentConfig?.addButtonText ?? 'Tambah Data Baru');

  const activeExportTooltipLabel = flags.isItemTab
    ? 'Export Data Item'
    : flags.isSupplierTab
      ? 'Export Data Supplier'
      : flags.isOtherMasterTab && config.otherMasterDataConfig
        ? `Export Data ${config.otherMasterDataConfig.entityName}`
        : `Export Data ${config.entityCurrentConfig?.entityName ?? 'Data'}`;

  const activeExportFilename = flags.isItemTab
    ? 'daftar-item'
    : flags.isSupplierTab
      ? 'daftar-supplier'
      : (config.otherMasterDataConfig?.exportFilename ??
        getItemEntityExportFilename(activeTab));

  const activeStatus = flags.isItemTab
    ? status.items
    : flags.isSupplierTab
      ? status.suppliers
      : flags.isCustomerTab
        ? status.customers
        : flags.isPatientTab
          ? status.patients
          : flags.isDoctorTab
            ? status.doctors
            : status.entity;

  const activeItemsSelection = flags.isItemTab ? data.itemsData : undefined;
  const activeOnItemSelect = flags.isItemTab
    ? toolbar.handleItemSelect
    : undefined;

  return {
    masterDataRows,
    masterDataColumnDefs,
    masterDataConfig,
    activeItemsPerPage,
    activePlaceholder,
    activeOnAdd,
    activeOnKeyDown,
    activeAddTooltipLabel,
    activeExportTooltipLabel,
    activeExportFilename,
    activeIsLoading: activeStatus.isLoading,
    activeIsError: activeStatus.isError,
    activeError: activeStatus.error,
    activeItemsSelection,
    activeOnItemSelect,
  };
};
