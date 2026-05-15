import type { SlidingSelectorOption } from '@/components/shared/sliding-selector';
import type {
  MasterDataType,
  OtherMasterDataTab,
} from '@/features/item-management/shared/types';
export {
  getMasterDataPathForTab,
  getMasterDataTabFromUrlSegment,
} from '@/features/item-management/shared/masterDataNavigation';

export const ITEM_MASTER_TAB_OPTIONS: SlidingSelectorOption<MasterDataType>[] =
  [
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
      defaultLabel: 'Satuan Ukur',
      activeLabel: 'Satuan Ukur',
    },
    {
      key: 'suppliers',
      value: 'suppliers',
      defaultLabel: 'Supplier',
      activeLabel: 'Daftar Supplier',
    },
  ];

export const ITEM_MASTER_SWITCHER_TAB_OPTIONS = ITEM_MASTER_TAB_OPTIONS.filter(
  option => option.value !== 'suppliers'
);

export const OTHER_MASTER_DATA_CONFIG: Record<
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
