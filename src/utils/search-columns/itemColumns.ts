import type { SearchColumn } from '@/types/search';

export const itemSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Item',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama item',
  },
  {
    field: 'manufacturer.name',
    headerName: 'Produsen',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama produsen',
  },
  {
    field: 'code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode unik item',
  },
  {
    field: 'barcode',
    headerName: 'Barcode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor barcode',
  },
  {
    field: 'category.name',
    headerName: 'Kategori',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kategori item',
  },
  {
    field: 'type.name',
    headerName: 'Jenis',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan jenis item',
  },
  {
    field: 'package.name',
    headerName: 'Kemasan',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kemasan utama',
  },
  {
    field: 'dosage.name',
    headerName: 'Sediaan',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan sediaan item',
  },
  {
    field: 'package_conversions',
    headerName: 'Kemasan Turunan',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kemasan turunan',
  },
  {
    field: 'base_price',
    headerName: 'Harga Pokok',
    searchable: true,
    type: 'currency',
    description: 'Cari berdasarkan harga pokok',
  },
  {
    field: 'sell_price',
    headerName: 'Harga Jual',
    searchable: true,
    type: 'currency',
    description: 'Cari berdasarkan harga jual',
  },
  {
    field: 'stock',
    headerName: 'Stok',
    searchable: true,
    type: 'number',
    description: 'Cari berdasarkan jumlah stok',
  },
];

export const itemCategoriesSearchColumns: SearchColumn[] = [
  {
    field: 'categories.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode kategori',
  },
  {
    field: 'categories.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama kategori',
  },
  {
    field: 'categories.description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi kategori',
  },
];

export const itemTypesSearchColumns: SearchColumn[] = [
  {
    field: 'types.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode jenis',
  },
  {
    field: 'types.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama jenis',
  },
  {
    field: 'types.description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi jenis',
  },
];

export const itemPackagesSearchColumns: SearchColumn[] = [
  {
    field: 'packages.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode kemasan',
  },
  {
    field: 'packages.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama kemasan',
  },
  {
    field: 'packages.description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi kemasan',
  },
  {
    field: 'packages.nci_code',
    headerName: 'Kode NCI',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode NCI',
  },
];

export const itemDosagesSearchColumns: SearchColumn[] = [
  {
    field: 'dosages.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode sediaan',
  },
  {
    field: 'dosages.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama sediaan',
  },
  {
    field: 'dosages.description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi sediaan',
  },
  {
    field: 'dosages.nci_code',
    headerName: 'Kode NCI',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode NCI',
  },
];

export const itemManufacturersSearchColumns: SearchColumn[] = [
  {
    field: 'manufacturers.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode produsen',
  },
  {
    field: 'manufacturers.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama produsen',
  },
  {
    field: 'manufacturers.address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat produsen',
  },
];

export const itemUnitsSearchColumns: SearchColumn[] = [
  {
    field: 'units.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode satuan ukur',
  },
  {
    field: 'units.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama satuan ukur',
  },
  {
    field: 'units.description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi satuan ukur',
  },
];
