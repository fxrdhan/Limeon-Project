import type { ColDef, GridApi } from 'ag-grid-community';
import { describe, expect, it } from 'vite-plus/test';
import { processGridDataForGoogleSheets } from './googleSheetsData';

const columnDefs: ColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
  },
  {
    field: 'supplier.name',
    headerName: 'Supplier',
  },
  {
    field: 'supplierCode',
    headerName: 'Supplier Code',
    valueGetter: params => params.getValue('supplier.code'),
  },
  {
    field: 'hidden',
    headerName: 'Hidden',
    hide: true,
  },
];

const gridApi: GridApi = Object.assign(Object.create(null), {
  forEachNode: (
    callback: (node: { data?: unknown; group?: boolean }) => void
  ) => {
    callback({
      data: {
        hidden: 'secret',
        name: 'Paracetamol',
        supplier: {
          code: 'KF',
          name: 'Kimia Farma',
        },
      },
    });
    callback({
      data: {
        name: 'Grouped row',
      },
      group: true,
    });
    callback({
      data: 'malformed-row',
    });
  },
  getColumn: () => null,
  getColumnDefs: () => columnDefs,
  isDestroyed: () => false,
});

describe('processGridDataForGoogleSheets', () => {
  it('exports visible nested column values and tolerates malformed row data', async () => {
    await expect(processGridDataForGoogleSheets(gridApi)).resolves.toEqual({
      headers: ['Name', 'Supplier', 'Supplier Code'],
      processedData: [
        ['Paracetamol', 'Kimia Farma', 'KF'],
        ['', '', ''],
      ],
    });
  });
});
