import type { MasterDataType } from './types';

export const MASTER_DATA_TAB_PATHS: Record<MasterDataType, string> = {
  items: '/master-data/item-master/items',
  categories: '/master-data/item-master/categories',
  types: '/master-data/item-master/types',
  packages: '/master-data/item-master/packages',
  dosages: '/master-data/item-master/dosages',
  manufacturers: '/master-data/item-master/manufacturers',
  units: '/master-data/item-master/units',
  suppliers: '/master-data/suppliers',
  customers: '/master-data/customers',
  patients: '/master-data/patients',
  doctors: '/master-data/doctors',
};

export const MASTER_DATA_TAB_BY_URL_SEGMENT: Record<string, MasterDataType> = {
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

export const MASTER_DATA_UNIFIED_GRID_ROUTE_PREFIXES = [
  '/master-data/item-master',
  MASTER_DATA_TAB_PATHS.suppliers,
  MASTER_DATA_TAB_PATHS.customers,
  MASTER_DATA_TAB_PATHS.patients,
  MASTER_DATA_TAB_PATHS.doctors,
] as const;

export const getMasterDataPathForTab = (tab: MasterDataType): string => {
  return MASTER_DATA_TAB_PATHS[tab];
};

export const getMasterDataTabFromUrlSegment = (
  segment: string
): MasterDataType | undefined => {
  return MASTER_DATA_TAB_BY_URL_SEGMENT[segment];
};
