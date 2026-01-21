import React, { useEffect, useRef } from 'react';
import { FaTrash } from 'react-icons/fa';
import { ColDef, ColGroupDef } from 'ag-grid-community';
import Button from '@/components/button';
import { PackageConversionInput } from '../atoms';
import {
  DataGrid,
  createTextColumn,
  createCurrencyColumn,
  type DataGridRef,
} from '@/components/ag-grid';
import type {
  PackageConversion,
  PackageConversionLogicFormData,
} from '../../shared/types';
import type { ItemPackage } from '@/types/database';

const DeleteButton = React.memo(
  ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
    <Button
      variant="text-danger"
      size="sm"
      tabIndex={19}
      onClick={onClick}
      disabled={disabled}
    >
      <FaTrash />
    </Button>
  )
);

DeleteButton.displayName = 'DeleteButton';

interface LocalItemPackageConversionManagerProps {
  baseUnit: string;
  availableUnits: ItemPackage[];
  conversions: PackageConversion[];
  formData: PackageConversionLogicFormData;
  onFormDataChange: (data: PackageConversionLogicFormData) => void;
  onAddConversion: () => void;
  onRemoveConversion: (id: string) => void;
  disabled?: boolean;
}

export default function ItemPackageConversionManager({
  baseUnit,
  availableUnits,
  conversions,
  formData,
  onFormDataChange,
  onAddConversion,
  onRemoveConversion,
  disabled = false,
}: LocalItemPackageConversionManagerProps) {
  const gridRef = useRef<DataGridRef>(null);
  const filteredAvailableUnits = availableUnits
    .filter(unit => unit.name !== baseUnit)
    .filter(unit => !conversions.some(uc => uc.unit.name === unit.name));

  const filteredConversions = conversions.filter(
    (uc, index, self) =>
      index === self.findIndex(u => u.unit.name === uc.unit.name) && uc.unit
  );

  useEffect(() => {
    if (filteredConversions.length === 0) return;
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed()) return;
    requestAnimationFrame(() => {
      if (!api.isDestroyed()) {
        api.autoSizeAllColumns();
      }
    });
  }, [filteredConversions.length]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-white px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Konversi Kemasan
        </h2>
      </div>
      <div className="p-4 md:p-5 flex flex-col gap-4">
        <div className="w-full">
          <PackageConversionInput
            baseUnit={baseUnit}
            availableUnits={filteredAvailableUnits}
            formData={formData}
            onFormDataChange={onFormDataChange}
            onAddConversion={onAddConversion}
            tabIndex={16}
            disabled={disabled}
          />
        </div>
        {filteredConversions.length > 0 ? (
          <div className="w-full flex flex-col">
            <div className="overflow-hidden" style={{ height: '130px' }}>
              <DataGrid
                ref={gridRef}
                disableFiltering={true}
                rowData={filteredConversions}
                columnDefs={
                  [
                    createTextColumn({
                      field: 'unit.name',
                      headerName: 'Turunan',
                      minWidth: 100,
                      flex: 1,
                    }),
                    createTextColumn({
                      field: 'conversion_rate',
                      headerName: 'Konversi',
                      minWidth: 140,
                      flex: 2,
                      cellStyle: { textAlign: 'center' },
                    }),
                    createCurrencyColumn({
                      field: 'base_price',
                      headerName: 'H. Pokok',
                      minWidth: 100,
                      flex: 1,
                    }),
                    createCurrencyColumn({
                      field: 'sell_price',
                      headerName: 'H. Jual',
                      minWidth: 100,
                      flex: 1,
                    }),
                    {
                      field: 'actions',
                      headerName: '',
                      minWidth: 80,
                      maxWidth: 80,
                      sortable: false,
                      resizable: false,
                      cellStyle: { textAlign: 'center' },
                      cellRenderer: (params: { data?: { id: string } }) =>
                        params.data ? (
                          <DeleteButton
                            onClick={() => onRemoveConversion(params.data!.id)}
                            disabled={disabled}
                          />
                        ) : null,
                    },
                  ] as (ColDef | ColGroupDef)[]
                }
                domLayout="normal"
                overlayNoRowsTemplate="<span class='text-slate-500'>Belum ada data konversi</span>"
                rowClass=""
                suppressMovableColumns={true}
                cellSelection={false}
                rowSelection={undefined}
                sizeColumnsToFit={true}
                className="ag-theme-quartz h-full"
                style={{ height: '100%' }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
