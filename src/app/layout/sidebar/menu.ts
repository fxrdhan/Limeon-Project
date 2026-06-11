import {
  TbBox,
  TbBuildingHospital,
  TbChartBar,
  TbDatabase,
  TbHome,
  TbSettings,
  TbShoppingBag,
  TbShoppingCart,
} from 'react-icons/tb';
import { MASTER_DATA_TAB_PATHS } from '@/features/item-management/public/masterDataNavigation';
import { ITEM_MASTER_PATH } from './constants';
import type { MenuGroup, MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    path: '/',
    icon: TbHome,
  },
  {
    key: 'masterData',
    name: 'Master Data',
    path: '/master-data',
    icon: TbDatabase,
    children: [
      { name: 'Item Master', path: ITEM_MASTER_PATH },
      { name: 'Supplier', path: MASTER_DATA_TAB_PATHS.suppliers },
      { name: 'Pelanggan', path: MASTER_DATA_TAB_PATHS.customers },
      { name: 'Pasien', path: MASTER_DATA_TAB_PATHS.patients },
      { name: 'Dokter', path: MASTER_DATA_TAB_PATHS.doctors },
    ],
  },
  {
    key: 'inventory',
    name: 'Persediaan',
    path: '/inventory',
    icon: TbBox,
    children: [
      { name: 'Stok Obat', path: '/inventory/stock' },
      { name: 'Stok Opname', path: '/inventory/stock-opname' },
      { name: 'Obat Kadaluarsa', path: '/inventory/expired' },
    ],
  },
  {
    key: 'purchases',
    name: 'Pembelian',
    path: '/purchases',
    icon: TbShoppingCart,
    children: [
      { name: 'Daftar Pesanan Beli', path: '/purchases/orders' },
      { name: 'Daftar Pembelian', path: '/purchases' },
      { name: 'Riwayat Harga Beli', path: '/purchases/price-history' },
    ],
  },
  {
    key: 'sales',
    name: 'Penjualan',
    path: '/sales',
    icon: TbShoppingBag,
    children: [
      { name: 'Daftar Penjualan', path: '/sales' },
      { name: 'Tambah Penjualan', path: '/sales/create' },
    ],
  },
  {
    key: 'clinic',
    name: 'Klinik',
    path: '/clinic',
    icon: TbBuildingHospital,
    children: [
      { name: 'Daftar Pasien', path: '/clinic/patients' },
      { name: 'Antrian', path: '/clinic/queue' },
      { name: 'Rekam Medis', path: '/clinic/medical-records' },
    ],
  },
  {
    key: 'reports',
    name: 'Laporan',
    path: '/reports',
    icon: TbChartBar,
    children: [
      { name: 'Penjualan', path: '/reports/sales' },
      { name: 'Pembelian', path: '/reports/purchases' },
      { name: 'Stok', path: '/reports/stock' },
    ],
  },
  {
    key: 'settings',
    name: 'Pengaturan',
    path: '/settings',
    icon: TbSettings,
    children: [
      { name: 'Profil', path: '/settings/profile' },
      { name: 'Pengguna', path: '/settings/users' },
      { name: 'Aplikasi', path: '/settings/app' },
    ],
  },
];

export const MENU_GROUPS: MenuGroup[] = MENU_ITEMS.filter(
  (item): item is MenuGroup => Boolean(item.children)
);
