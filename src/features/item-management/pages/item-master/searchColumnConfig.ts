import type { MasterDataType } from '@/features/item-management/shared/types';
import type { SearchColumn } from '@/types/search';
import { getSearchColumnsByEntity } from '@/utils/searchColumns';

const SUPPLIER_SEARCH_COLUMNS: SearchColumn[] = [
  {
    field: 'suppliers.name',
    headerName: 'Nama Supplier',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama supplier',
  },
  {
    field: 'suppliers.address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat supplier',
  },
  {
    field: 'suppliers.phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon supplier',
  },
  {
    field: 'suppliers.email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan email supplier',
  },
  {
    field: 'suppliers.contact_person',
    headerName: 'Kontak Person',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan kontak person supplier',
  },
];

const getVisibleColumnIndex = (field: string, visibleColumns: string[]) => {
  const exactIndex = visibleColumns.indexOf(field);
  return exactIndex === -1 ? visibleColumns.length : exactIndex;
};

const getVisibleColumnIndexByBaseField = (
  field: string,
  visibleColumns: string[]
) => {
  const baseField = field.split('.').pop() || field;
  const exactIndex = visibleColumns.indexOf(field);
  if (exactIndex !== -1) return exactIndex;

  const matchIndex = visibleColumns.findIndex(visibleColumn =>
    visibleColumn.endsWith(`.${baseField}`)
  );
  return matchIndex !== -1 ? matchIndex : visibleColumns.length;
};

const orderSearchColumns = (
  columns: SearchColumn[],
  visibleColumns: string[],
  getIndex: (field: string, visibleColumns: string[]) => number
) => {
  if (visibleColumns.length === 0) return columns;

  return [...columns].sort(
    (a, b) =>
      getIndex(a.field, visibleColumns) - getIndex(b.field, visibleColumns)
  );
};

export const getItemEntitySearchColumns = (
  tab: MasterDataType,
  visibleColumns: string[]
) =>
  orderSearchColumns(
    getSearchColumnsByEntity(tab),
    visibleColumns,
    getVisibleColumnIndexByBaseField
  );

export const getSupplierSearchColumns = (visibleColumns: string[]) =>
  orderSearchColumns(
    SUPPLIER_SEARCH_COLUMNS,
    visibleColumns,
    getVisibleColumnIndex
  );

export const getOtherMasterDataSearchColumns = (
  entity: 'customers' | 'patients' | 'doctors',
  visibleColumns: string[]
) =>
  orderSearchColumns(
    getSearchColumnsByEntity(entity),
    visibleColumns,
    getVisibleColumnIndex
  );
