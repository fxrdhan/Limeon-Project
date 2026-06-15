import type {
  EntityConfig,
  EntityData,
} from '@/features/item-management/application/hooks/collections/useEntityManager';
import type { MasterDataType } from '@/features/item-management/shared/types';
import type { Item as ItemDataType } from '@/types/database';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
} from '@/types';
import type { ColDef, ColGroupDef } from 'ag-grid-community';

export type ItemMasterActiveViewFlags = {
  isItemTab: boolean;
  isSupplierTab: boolean;
  isCustomerTab: boolean;
  isPatientTab: boolean;
  isDoctorTab: boolean;
  isItemEntityTab: boolean;
  isOtherMasterTab: boolean;
};

export type ItemMasterOtherMasterDataConfig = {
  entityName: string;
  searchPlaceholder: string;
  exportFilename: string;
  noDataMessage: string;
  searchNoDataMessage: string;
};

export type ItemMasterActiveViewConfig = {
  entityCurrentConfig: EntityConfig | null;
  otherMasterDataConfig: ItemMasterOtherMasterDataConfig | null;
};

export type ItemMasterMasterDataRow =
  | EntityData
  | CustomerType
  | PatientType
  | DoctorType;

export type ItemMasterColumnDef = ColDef | ColGroupDef;

export type ItemMasterActiveViewData = {
  itemsData: ItemDataType[];
  entityRows: EntityData[];
  customers: CustomerType[];
  patients: PatientType[];
  doctors: DoctorType[];
};

export type ItemMasterActiveViewColumns = {
  entityColumnDefs: ItemMasterColumnDef[];
  customerColumnDefs: ItemMasterColumnDef[];
  patientColumnDefs: ItemMasterColumnDef[];
  doctorColumnDefs: ItemMasterColumnDef[];
};

export type ItemMasterActiveViewPagination = {
  itemItemsPerPage: number;
  entityItemsPerPage: number;
  customerItemsPerPage: number;
  patientItemsPerPage: number;
  doctorItemsPerPage: number;
};

export type ItemMasterActiveViewStatus = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export type ItemMasterActiveViewStatusMap = {
  items: ItemMasterActiveViewStatus;
  suppliers: ItemMasterActiveViewStatus;
  customers: ItemMasterActiveViewStatus;
  patients: ItemMasterActiveViewStatus;
  doctors: ItemMasterActiveViewStatus;
  entity: ItemMasterActiveViewStatus;
};

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

export const getItemMasterRows = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    'isItemEntityTab' | 'isCustomerTab' | 'isPatientTab' | 'isDoctorTab'
  >,
  data: ItemMasterActiveViewData
): ItemMasterMasterDataRow[] => {
  if (flags.isItemEntityTab) return data.entityRows;
  if (flags.isCustomerTab) return data.customers;
  if (flags.isPatientTab) return data.patients;
  if (flags.isDoctorTab) return data.doctors;
  return [];
};

export const getItemMasterColumnDefs = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    'isItemEntityTab' | 'isCustomerTab' | 'isPatientTab' | 'isDoctorTab'
  >,
  columns: ItemMasterActiveViewColumns
): ItemMasterColumnDef[] => {
  if (flags.isItemEntityTab) return columns.entityColumnDefs;
  if (flags.isCustomerTab) return columns.customerColumnDefs;
  if (flags.isPatientTab) return columns.patientColumnDefs;
  if (flags.isDoctorTab) return columns.doctorColumnDefs;
  return [];
};

export const getItemMasterDataConfig = (
  flags: Pick<ItemMasterActiveViewFlags, 'isItemEntityTab'>,
  config: ItemMasterActiveViewConfig
) => {
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
};

export const getItemMasterActiveItemsPerPage = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    | 'isItemTab'
    | 'isItemEntityTab'
    | 'isSupplierTab'
    | 'isCustomerTab'
    | 'isPatientTab'
    | 'isDoctorTab'
  >,
  pagination: ItemMasterActiveViewPagination
) => {
  if (flags.isItemTab) return pagination.itemItemsPerPage;
  if (flags.isItemEntityTab) return pagination.entityItemsPerPage;
  if (flags.isSupplierTab) return 25;
  if (flags.isCustomerTab) return pagination.customerItemsPerPage;
  if (flags.isPatientTab) return pagination.patientItemsPerPage;
  if (flags.isDoctorTab) return pagination.doctorItemsPerPage;
  return 25;
};

export const getItemMasterActivePlaceholder = (
  flags: Pick<ItemMasterActiveViewFlags, 'isItemTab' | 'isSupplierTab'>,
  config: ItemMasterActiveViewConfig
) =>
  flags.isItemTab
    ? 'Cari item...'
    : flags.isSupplierTab
      ? 'Cari supplier...'
      : (config.otherMasterDataConfig?.searchPlaceholder ??
        `${config.entityCurrentConfig?.searchPlaceholder || 'Cari'} atau ketik # untuk pencarian kolom spesifik`);

export const getItemMasterActiveAddTooltipLabel = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    'isItemTab' | 'isSupplierTab' | 'isOtherMasterTab'
  >,
  config: ItemMasterActiveViewConfig
) =>
  flags.isItemTab
    ? 'Tambah Item Baru'
    : flags.isSupplierTab
      ? 'Tambah Supplier Baru'
      : flags.isOtherMasterTab && config.otherMasterDataConfig
        ? `Tambah ${config.otherMasterDataConfig.entityName} Baru`
        : (config.entityCurrentConfig?.addButtonText ?? 'Tambah Data Baru');

export const getItemMasterActiveExportTooltipLabel = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    'isItemTab' | 'isSupplierTab' | 'isOtherMasterTab'
  >,
  config: ItemMasterActiveViewConfig
) =>
  flags.isItemTab
    ? 'Export Data Item'
    : flags.isSupplierTab
      ? 'Export Data Supplier'
      : flags.isOtherMasterTab && config.otherMasterDataConfig
        ? `Export Data ${config.otherMasterDataConfig.entityName}`
        : `Export Data ${config.entityCurrentConfig?.entityName ?? 'Data'}`;

export const getItemMasterActiveExportFilename = (
  activeTab: MasterDataType,
  flags: Pick<
    ItemMasterActiveViewFlags,
    'isItemTab' | 'isSupplierTab' | 'isOtherMasterTab'
  >,
  config: ItemMasterActiveViewConfig
) =>
  flags.isItemTab
    ? 'daftar-item'
    : flags.isSupplierTab
      ? 'daftar-supplier'
      : (config.otherMasterDataConfig?.exportFilename ??
        getItemEntityExportFilename(activeTab));

export const getItemMasterActiveStatus = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    | 'isItemTab'
    | 'isSupplierTab'
    | 'isCustomerTab'
    | 'isPatientTab'
    | 'isDoctorTab'
  >,
  status: ItemMasterActiveViewStatusMap
) =>
  flags.isItemTab
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
