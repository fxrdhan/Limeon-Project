import React from 'react';
import { TbArrowBack } from 'react-icons/tb';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import Input from '@/components/input';
import type { PackageConversionLogicFormData } from '../../shared/types';
import type { ItemInventoryUnit } from '@/types/database';
import { getInventoryUnitMetaLabel } from '@/lib/item-units';

interface LocalPackageConversionInputProps {
  baseUnit: string;
  baseUnitId: string;
  availableUnits: ItemInventoryUnit[];
  existingUnits: Array<{ id: string; name: string }>;
  formData: PackageConversionLogicFormData;
  onFormDataChange: (data: PackageConversionLogicFormData) => void;
  onAddConversion: () => void;
  tabIndex?: number;
  disabled?: boolean;
}

export default function PackageConversionInput({
  baseUnit,
  baseUnitId,
  availableUnits,
  existingUnits,
  formData,
  onFormDataChange,
  onAddConversion,
  tabIndex = 16,
  disabled = false,
}: LocalPackageConversionInputProps) {
  const handleUnitChange = (unitId: string) => {
    onFormDataChange({
      ...formData,
      inventory_unit_id: unitId,
    });
  };

  const handleParentUnitChange = (unitId: string) => {
    onFormDataChange({
      ...formData,
      parent_inventory_unit_id: unitId,
    });
  };

  const handleConversionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    onFormDataChange({
      ...formData,
      contains_quantity: parseFloat(value) || 0,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddConversion();
    }
  };

  const isAddButtonActive =
    formData.inventory_unit_id &&
    formData.parent_inventory_unit_id &&
    formData.contains_quantity > 0 &&
    baseUnit &&
    !disabled;

  const selectedUnit = availableUnits.find(
    unit => unit.id === formData.inventory_unit_id
  );
  const selectedParentUnit =
    existingUnits.find(unit => unit.id === formData.parent_inventory_unit_id) ||
    (formData.parent_inventory_unit_id === baseUnitId
      ? { id: baseUnitId, name: baseUnit }
      : null);

  const parentOptions = [
    ...(baseUnitId
      ? [
          {
            id: baseUnitId,
            name: baseUnit,
            metaLabel: 'Unit Dasar',
          },
        ]
      : []),
    ...existingUnits
      .filter(unit => unit.id !== formData.inventory_unit_id)
      .map(unit => ({
        id: unit.id,
        name: unit.name,
        metaLabel: 'Struktur',
      })),
  ];

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Tambah Struktur Unit</h3>
      <p className="text-sm text-slate-600 mb-2">
        Tentukan satuan jual dan isi unit di bawahnya.
      </p>
      <div className="grid gap-4 md:grid-cols-3 mb-3">
        <FormField label="Unit" className="flex-1" required={true}>
          <Dropdown
            name="inventory_unit_id"
            tabIndex={tabIndex}
            value={formData.inventory_unit_id}
            onChange={handleUnitChange}
            options={availableUnits.map(unit => ({
              id: unit.id,
              name: unit.name,
              metaLabel: getInventoryUnitMetaLabel(unit),
            }))}
            placeholder="-- Pilih Unit --"
            required
            validate={true}
            showValidationOnBlur={true}
            validationAutoHide={true}
            validationAutoHideDelay={3000}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Dalam" className="flex-1" required={true}>
          <Dropdown
            name="parent_inventory_unit_id"
            tabIndex={tabIndex + 1}
            value={formData.parent_inventory_unit_id}
            onChange={handleParentUnitChange}
            options={parentOptions}
            placeholder="-- Pilih Parent --"
            required
            validate={true}
            showValidationOnBlur={true}
            validationAutoHide={true}
            validationAutoHideDelay={3000}
            disabled={disabled}
          />
        </FormField>

        <FormField
          label={
            selectedUnit && selectedParentUnit
              ? `1 ${selectedUnit.name} berisi ? ${selectedParentUnit.name}`
              : 'Isi'
          }
          className="flex-1"
        >
          <div className="relative w-full">
            <Input
              name="contains_quantity"
              tabIndex={tabIndex + 2}
              value={
                formData.contains_quantity > 0
                  ? formData.contains_quantity.toString()
                  : ''
              }
              onChange={handleConversionChange}
              type="number"
              min={selectedUnit ? '1' : undefined}
              className="w-full pr-10"
              onKeyDown={handleKeyDown}
              readOnly={disabled}
            />
            <button
              type="button"
              tabIndex={tabIndex + 3}
              className={`absolute inset-y-0 right-0 flex items-center pr-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} font-bold tracking-widest transition-colors duration-300 focus:outline-hidden ${
                isAddButtonActive ? 'text-primary' : 'text-slate-300'
              }`}
              onClick={e => {
                e.preventDefault();
                if (!disabled) {
                  onAddConversion();
                }
              }}
              title={
                disabled ? undefined : 'Tekan Enter atau klik untuk menambah'
              }
              disabled={disabled}
              aria-label="Tambah struktur unit"
            >
              <TbArrowBack size={24} />
            </button>
          </div>
        </FormField>
      </div>
    </div>
  );
}
