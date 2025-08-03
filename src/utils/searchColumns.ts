import { SearchColumn } from '@/types/search';

/**
 * Doctor search columns configuration
 */
export const doctorSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Dokter',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama lengkap dokter',
  },
  {
    field: 'gender',
    headerName: 'Jenis Kelamin',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan jenis kelamin (L/P)',
  },
  {
    field: 'specialization',
    headerName: 'Spesialisasi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan bidang spesialisasi dokter',
  },
  {
    field: 'license_number',
    headerName: 'Nomor Lisensi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor lisensi praktik',
  },
  {
    field: 'experience_years',
    headerName: 'Pengalaman',
    searchable: true,
    type: 'number',
    description: 'Cari berdasarkan tahun pengalaman',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
];

/**
 * Item search columns configuration
 */
export const itemSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Item',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama item',
  },
  {
    field: 'manufacturer',
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
    field: 'unit.name',
    headerName: 'Kemasan',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kemasan utama',
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

/**
 * Patient search columns configuration
 */
export const patientSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Pasien',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama lengkap pasien',
  },
  {
    field: 'gender',
    headerName: 'Jenis Kelamin',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan jenis kelamin (L/P)',
  },
  {
    field: 'birth_date',
    headerName: 'Tanggal Lahir',
    searchable: true,
    type: 'date',
    description: 'Cari berdasarkan tanggal lahir',
  },
  {
    field: 'address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat tempat tinggal',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
];

/**
 * Supplier search columns configuration
 */
export const supplierSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Supplier',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama perusahaan supplier',
  },
  {
    field: 'address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat supplier',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
  {
    field: 'contact_person',
    headerName: 'Kontak Person',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama kontak person',
  },
];

/**
 * Item Master search columns configuration (for categories, types, and units)
 */
export const itemMasterSearchColumns: SearchColumn[] = [
  {
    field: 'kode',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode',
  },
  {
    field: 'name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama',
  },
  {
    field: 'description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi',
  },
];

/**
 * Get search columns by entity type
 */
export const getSearchColumnsByEntity = (
  entityType: string
): SearchColumn[] => {
  switch (entityType) {
    case 'doctors':
      return doctorSearchColumns;
    case 'items':
      return itemSearchColumns;
    case 'patients':
      return patientSearchColumns;
    case 'suppliers':
      return supplierSearchColumns;
    case 'item_categories':
    case 'item_types':
    case 'item_packages':
      return itemMasterSearchColumns;
    default:
      return [];
  }
};
