import { createTextColumn } from '@/components/ag-grid/columns';
import type { MasterDataType } from '@/features/item-management/shared/types';
import type { ColDef } from 'ag-grid-community';

export interface EntityColumnConfig {
  nameColumnHeader?: string;
  hasNciCode?: boolean;
  hasAddress?: boolean;
}

const MULTI_TEXT_SET_FILTER_PROPS = {
  filter: 'agMultiColumnFilter',
  filterParams: {
    filters: [
      { filter: 'agTextColumnFilter' },
      { filter: 'agSetColumnFilter' },
    ],
  },
  suppressHeaderFilterButton: true,
} satisfies Partial<ColDef>;

const TEXT_FILTER_PROPS = {
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

export const buildEntityColumnDefs = (
  activeTab: MasterDataType,
  config: EntityColumnConfig | null
): ColDef[] => {
  if (!config) return [];

  const tablePrefix = activeTab as string;
  const columns: ColDef[] = [
    {
      ...createTextColumn({
        field: `${tablePrefix}.code`,
        headerName: 'Kode',
        valueGetter: params => params.data?.code || '-',
      }),
      ...MULTI_TEXT_SET_FILTER_PROPS,
    },
    {
      field: `${tablePrefix}.name`,
      headerName: config.nameColumnHeader || 'Nama',
      ...TEXT_FILTER_PROPS,
      cellStyle: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      tooltipField: 'name',
      valueGetter: params => params.data?.name || '-',
    },
  ];

  if (config.hasNciCode) {
    columns.push({
      ...createTextColumn({
        field: `${tablePrefix}.nci_code`,
        headerName: 'Kode NCI',
        valueGetter: params => params.data?.nci_code || '-',
      }),
      ...MULTI_TEXT_SET_FILTER_PROPS,
    });
  }

  columns.push({
    ...createTextColumn({
      field: `${tablePrefix}.${config.hasAddress ? 'address' : 'description'}`,
      headerName: config.hasAddress ? 'Alamat' : 'Deskripsi',
      flex: 1,
      valueGetter: params => {
        if (config.hasAddress) {
          return params.data?.address || '-';
        }
        return params.data?.description || '-';
      },
    }),
    ...TEXT_FILTER_PROPS,
  });

  return columns;
};
