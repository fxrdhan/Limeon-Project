import { createTextColumn } from '@/components/ag-grid/columns';
import type { ColDef } from 'ag-grid-community';

export const TEXT_ADVANCED_FILTER_COLUMN_PROPS = {
  filter: 'agTextColumnFilter',
  filterParams: {
    filterOptions: [
      'contains',
      'notContains',
      'equals',
      'notEqual',
      'startsWith',
      'endsWith',
    ],
    defaultOption: 'contains',
    suppressAndOrCondition: false,
    caseSensitive: false,
  },
  suppressHeaderFilterButton: true,
} satisfies Partial<ColDef>;

export const NUMBER_ADVANCED_FILTER_COLUMN_PROPS = {
  filter: 'agNumberColumnFilter',
  suppressHeaderFilterButton: true,
} satisfies Partial<ColDef>;

export const DATE_ADVANCED_FILTER_COLUMN_PROPS = {
  filter: 'agDateColumnFilter',
  suppressHeaderFilterButton: true,
} satisfies Partial<ColDef>;

export const createAdvancedTextColumn = (
  config: Parameters<typeof createTextColumn>[0]
): ColDef => ({
  ...createTextColumn(config),
  ...TEXT_ADVANCED_FILTER_COLUMN_PROPS,
});
