import { createElement } from 'react';
import { TbFilter, TbLetterCase, TbNumber12Small } from 'react-icons/tb';
import type { BaseSelectorConfig, FilterOperator, SearchColumn } from './types';
import type { JoinOperator } from './operators';

export type ActiveSelectorItem = SearchColumn | FilterOperator | JoinOperator;

const getColumnSelectorIcon = (column: SearchColumn) => {
  switch (column.type) {
    case 'number':
    case 'currency':
      return createElement(TbNumber12Small, { className: 'w-5 h-5' });
    case 'date':
      return createElement(TbFilter, { className: 'w-4 h-4' });
    default:
      return createElement(TbLetterCase, { className: 'w-4 h-4' });
  }
};

const getColumnSelectorActiveColor = (column: SearchColumn) => {
  switch (column.type) {
    case 'number':
    case 'currency':
      return 'text-blue-500';
    case 'date':
      return 'text-purple-500';
    default:
      return 'text-purple-500';
  }
};

export const columnSelectorConfig: BaseSelectorConfig<SearchColumn> = {
  headerText: 'Pilih kolom',
  footerSingular: 'kolom',
  maxHeight: '320px',
  noResultsText: "'{searchTerm}' tidak ditemukan",
  getItemKey: column => column.field,
  getItemLabel: column => column.headerName,
  getItemIcon: getColumnSelectorIcon,
  getItemActiveColor: getColumnSelectorActiveColor,
  getSearchFields: column => [
    { key: 'headerName', value: column.headerName, boost: 1000 },
  ],
};

export const operatorSelectorConfig: BaseSelectorConfig<FilterOperator> = {
  headerText: 'Pilih operator filter',
  footerSingular: 'operator',
  maxHeight: '320px',
  noResultsText: "'{searchTerm}' tidak ditemukan",
  getItemKey: operator => operator.value,
  getItemLabel: operator => operator.label,
  getItemIcon: operator => operator.icon,
  getItemActiveColor: operator => operator.activeColor || 'text-slate-900',
  getSearchFields: operator => [
    { key: 'label', value: operator.label, boost: 1000 },
  ],
  theme: 'blue',
};

export const joinSelectorConfig: BaseSelectorConfig<JoinOperator> = {
  headerText: 'Pilih operator join',
  footerSingular: 'operator',
  maxHeight: '200px',
  noResultsText: "'{searchTerm}' tidak ditemukan",
  getItemKey: operator => operator.value,
  getItemLabel: operator => operator.label,
  getItemIcon: operator => operator.icon,
  getItemActiveColor: operator => operator.activeColor || 'text-slate-900',
  getSearchFields: operator => [
    { key: 'label', value: operator.label, boost: 1000 },
  ],
  theme: 'orange',
};
