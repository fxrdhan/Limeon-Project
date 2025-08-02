import React from 'react';
import { FaTrash } from 'react-icons/fa';
import Button from '@/components/button';
import FormSection from '@/components/form-section';
import { UnitConversionInput } from '../atoms';
import {
  DataGrid,
  createTextColumn,
  createCurrencyColumn,
} from '@/components/ag-grid';
import type {
  UnitOption,
  UnitConversion,
  UnitConversionLogicFormData,
} from '../../shared/types';

const DeleteButton = React.memo(({ onClick }: { onClick: () => void }) => (
  <Button variant="danger" size="sm" tabIndex={19} onClick={onClick}>
    <FaTrash />
  </Button>
));

DeleteButton.displayName = 'DeleteButton';

interface LocalItemUnitConversionManagerProps {
  baseUnit: string;
  availableUnits: UnitOption[];
  conversions: UnitConversion[];
  formData: UnitConversionLogicFormData;
  onFormDataChange: (data: UnitConversionLogicFormData) => void;
  onAddConversion: () => void;
  onRemoveConversion: (id: string) => void;
}

export default function ItemUnitConversionManager({
  baseUnit,
  availableUnits,
  conversions,
  formData,
  onFormDataChange,
  onAddConversion,
  onRemoveConversion,
}: LocalItemUnitConversionManagerProps) {
  const filteredAvailableUnits = availableUnits
    .filter(unit => unit.name !== baseUnit)
    .filter(unit => !conversions.some(uc => uc.unit.name === unit.name));

  const filteredConversions = conversions.filter(
    (uc, index, self) =>
      index === self.findIndex(u => u.unit.name === uc.unit.name) && uc.unit
  );

  return (
    <FormSection title="Satuan dan Konversi">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 md:w-1/3 lg:w-1/4">
          <UnitConversionInput
            baseUnit={baseUnit}
            availableUnits={filteredAvailableUnits}
            formData={formData}
            onFormDataChange={onFormDataChange}
            onAddConversion={onAddConversion}
            tabIndex={16}
          />
        </div>
        <div className="md:w-2/3 lg:w-3/5 flex flex-col">
          <div className="overflow-hidden" style={{ height: '130px' }}>
            <DataGrid
              disableFiltering={true}
              rowData={filteredConversions}
              columnDefs={[
                createTextColumn({
                  field: 'unit.name',
                  headerName: 'Turunan',
                  minWidth: 100,
                  flex: 1,
                }),
                createTextColumn({
                  field: 'conversion',
                  headerName: 'Konversi',
                  minWidth: 140,
                  flex: 2,
                  cellStyle: { textAlign: 'center' },
                }),
                createCurrencyColumn({
                  field: 'basePrice',
                  headerName: 'H. Pokok',
                  minWidth: 100,
                  flex: 1,
                }),
                createCurrencyColumn({
                  field: 'sellPrice',
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
                      />
                    ) : null,
                },
              ]}
              domLayout="normal"
              overlayNoRowsTemplate="<span class='text-gray-500'>Belum ada data konversi</span>"
              rowClass=""
              animateRows={false}
              suppressMovableColumns={true}
              cellSelection={false}
              rowSelection={undefined}
              sizeColumnsToFit={true}
              className="ag-theme-quartz h-full"
              style={{ height: '100%' }}
            />
          </div>
        </div>
      </div>
    </FormSection>
  );
}
