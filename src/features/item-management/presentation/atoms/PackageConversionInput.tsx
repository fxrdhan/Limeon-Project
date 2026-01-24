import React from 'react';
import { TbArrowBack } from 'react-icons/tb';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import Input from '@/components/input';
import type { PackageConversionLogicFormData } from '../../shared/types';
import type { ItemPackage } from '@/types/database';

interface LocalPackageConversionInputProps {
  baseUnit: string;
  availableUnits: ItemPackage[];
  formData: PackageConversionLogicFormData;
  onFormDataChange: (data: PackageConversionLogicFormData) => void;
  onAddConversion: () => void;
  tabIndex?: number;
  disabled?: boolean;
}

export default function PackageConversionInput({
  baseUnit,
  availableUnits,
  formData,
  onFormDataChange,
  onAddConversion,
  tabIndex = 16,
  disabled = false,
}: LocalPackageConversionInputProps) {
  const handleUnitChange = (unitId: string) => {
    const selectedUnit = availableUnits.find(u => u.id === unitId);
    if (selectedUnit) {
      onFormDataChange({
        ...formData,
        unit: selectedUnit.name,
      });
    }
  };

  const handleConversionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    onFormDataChange({
      ...formData,
      conversion_rate: parseFloat(value) || 0,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddConversion();
    }
  };

  const isAddButtonActive =
    formData.unit && formData.conversion_rate > 0 && baseUnit && !disabled;

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Tambah Konversi Kemasan</h3>
      <p className="text-sm text-gray-600 mb-2">
        1 {baseUnit || 'Kemasan Dasar'} setara berapa kemasan turunan?
      </p>
      <div className="flex flex-row gap-4 mb-3">
        <FormField label="Kemasan Turunan" className="flex-1" required={true}>
          <Dropdown
            name="package_conversion"
            tabIndex={tabIndex}
            value={availableUnits.find(u => u.name === formData.unit)?.id || ''}
            onChange={handleUnitChange}
            options={availableUnits.map(unit => ({
              id: unit.id,
              name: unit.name,
            }))}
            placeholder="-- Pilih Kemasan --"
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
            formData.unit
              ? `1 ${baseUnit || 'Kemasan Dasar'} = ? ${formData.unit}`
              : 'Nilai Konversi'
          }
          className="flex-1"
        >
          <div className="relative w-full">
            <Input
              name="conversion_rate"
              tabIndex={tabIndex + 1}
              value={
                formData.conversion_rate > 0
                  ? formData.conversion_rate.toString()
                  : ''
              }
              onChange={handleConversionChange}
              type="number"
              min={formData.unit ? '1' : undefined}
              className="w-full pr-10"
              onKeyDown={handleKeyDown}
              readOnly={disabled}
            />
            <button
              type="button"
              tabIndex={tabIndex + 2}
              className={`absolute inset-y-0 right-0 flex items-center pr-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} font-bold tracking-widest transition-colors duration-300 focus:outline-hidden ${
                isAddButtonActive ? 'text-primary' : 'text-gray-300'
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
              aria-label="Tambah konversi kemasan"
            >
              <TbArrowBack size={24} />
            </button>
          </div>
        </FormField>
      </div>
    </div>
  );
}
