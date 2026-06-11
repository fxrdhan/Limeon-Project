import type { SearchColumn } from '@/types/search';
import {
  customerSearchColumns,
  doctorSearchColumns,
  patientSearchColumns,
  supplierSearchColumns,
} from './identityColumns';
import {
  itemCategoriesSearchColumns,
  itemDosagesSearchColumns,
  itemManufacturersSearchColumns,
  itemPackagesSearchColumns,
  itemSearchColumns,
  itemTypesSearchColumns,
  itemUnitsSearchColumns,
} from './itemColumns';

export const orderSearchColumns = (
  columns: SearchColumn[],
  columnOrder?: string[]
): SearchColumn[] => {
  if (!columnOrder || columnOrder.length === 0) {
    return columns;
  }

  const columnMap: Record<string, SearchColumn> = {};
  columns.forEach(column => {
    columnMap[column.field] = column;
  });

  const orderedColumns: SearchColumn[] = [];
  columnOrder.forEach(field => {
    const column = columnMap[field];
    if (column) {
      orderedColumns.push(column);
    }
  });

  columns.forEach(column => {
    if (!columnOrder.includes(column.field)) {
      orderedColumns.push(column);
    }
  });

  return orderedColumns;
};

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
    case 'customers':
      return customerSearchColumns;
    case 'suppliers':
      return supplierSearchColumns;
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

export const getOrderedSearchColumnsByEntity = (
  entityType: string,
  columnOrder?: string[]
): SearchColumn[] => {
  const baseColumns = getSearchColumnsByEntity(entityType);
  return orderSearchColumns(baseColumns, columnOrder);
};
