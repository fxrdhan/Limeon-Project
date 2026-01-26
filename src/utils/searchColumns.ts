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
 * Customer search columns configuration
 */
export const customerSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Pelanggan',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama pelanggan',
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
    field: 'address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat pelanggan',
  },
];

/**
 * Item Categories search columns configuration
 */
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

/**
 * Item Types search columns configuration
 */
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

/**
 * Item Packages search columns configuration
 */
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

/**
 * Item Dosages search columns configuration
 */
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

/**
 * Item Manufacturers search columns configuration
 */
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

/**
 * Item Units search columns configuration
 */
export const itemUnitsSearchColumns: SearchColumn[] = [
  {
    field: 'units.code',
    headerName: 'Kode',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kode satuan',
  },
  {
    field: 'units.name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama satuan',
  },
  {
    field: 'units.description',
    headerName: 'Deskripsi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan deskripsi satuan',
  },
];

/**
 * Order search columns based on user's column ordering preference
 */
export const orderSearchColumns = (
  columns: SearchColumn[],
  columnOrder?: string[]
): SearchColumn[] => {
  if (!columnOrder || columnOrder.length === 0) {
    return columns;
  }

  // Create a map of columns for quick lookup
  const columnMap: Record<string, SearchColumn> = {};
  columns.forEach(column => {
    columnMap[column.field] = column;
  });

  // Create ordered array based on column order
  const orderedColumns: SearchColumn[] = [];

  // Add columns in the specified order
  columnOrder.forEach(field => {
    const column = columnMap[field];
    if (column) {
      orderedColumns.push(column);
    }
  });

  // Add any columns that aren't in the ordering (fallback)
  columns.forEach(column => {
    if (!columnOrder.includes(column.field)) {
      orderedColumns.push(column);
    }
  });

  return orderedColumns;
};

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
    // Item master data - match activeTab values
    case 'categories':
    case 'item_categories':
      return itemCategoriesSearchColumns;
    case 'types':
    case 'item_types':
      return itemTypesSearchColumns;
    case 'packages':
    case 'item_packages':
      return itemPackagesSearchColumns;
    case 'dosages':
    case 'item_dosages':
      return itemDosagesSearchColumns;
    case 'manufacturers':
    case 'item_manufacturers':
      return itemManufacturersSearchColumns;
    case 'units':
    case 'item_units':
      return itemUnitsSearchColumns;
    default:
      return [];
  }
};

/**
 * Get ordered search columns by entity type
 */
export const getOrderedSearchColumnsByEntity = (
  entityType: string,
  columnOrder?: string[]
): SearchColumn[] => {
  const baseColumns = getSearchColumnsByEntity(entityType);
  return orderSearchColumns(baseColumns, columnOrder);
};
