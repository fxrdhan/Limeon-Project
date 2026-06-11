import React from 'react';
import { formatItemDisplayName } from '@/lib/item-display';
import { parseDisplayNameToMeasurement } from '@/lib/item-measurement-parser';
import {
  useItemForm,
  useItemModal,
  useItemPrice,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import ItemBasicInfoForm from '../../organisms/ItemBasicInfoForm';
import type { BasicInfoRequiredProps } from './types';

const BasicInfoRequiredSection: React.FC<BasicInfoRequiredProps> = () => {
  const {
    formData,
    categories,
    types,
    packages,
    units,
    dosages,
    manufacturers,
    loading,
    handleChange,
    updateFormData,
  } = useItemForm();

  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const { packageConversionHook } = useItemPrice();

  const {
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,
    isAddEditModalOpen,
    isAddTypeModalOpen,
    isAddUnitModalOpen,
    isAddDosageModalOpen,
    isAddManufacturerModalOpen,
    persistedDropdownName,
    setPersistedDropdownName,
  } = useItemModal();
  const isAnyChildEntityModalOpen =
    isAddEditModalOpen ||
    isAddTypeModalOpen ||
    isAddUnitModalOpen ||
    isAddDosageModalOpen ||
    isAddManufacturerModalOpen;

  const transformedCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    code: cat.code,
    description: cat.description,
    updated_at: cat.updated_at,
  }));
  const transformedTypes = types.map(type => ({
    id: type.id,
    name: type.name,
    code: type.code,
    description: type.description,
    updated_at: type.updated_at,
  }));
  const transformedPackages = packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    code: pkg.code,
    description: pkg.description,
    updated_at: pkg.updated_at,
  }));
  const transformedDosages = dosages.map(dosage => ({
    id: dosage.id,
    name: dosage.name,
    code: dosage.code,
    description: dosage.description,
    updated_at: dosage.updated_at,
  }));
  const transformedManufacturers = manufacturers.map(manufacturer => ({
    id: manufacturer.id,
    name: manufacturer.name,
    code: manufacturer.code,
    description: manufacturer.address,
    updated_at: manufacturer.updated_at,
  }));

  const displayName = formatItemDisplayName({
    name: formData.name || '',
    measurement_value: formData.quantity || null,
    measurement_unit: units.find(unit => unit.id === formData.unit_id) || null,
    measurement_denominator_value:
      formData.measurement_denominator_value ?? null,
    measurement_denominator_unit:
      units.find(
        unit => unit.id === formData.measurement_denominator_unit_id
      ) || null,
  });

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'code') {
      updateFormData({ code: value as string });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.target.name === 'name') {
      const parsed = parseDisplayNameToMeasurement(e.target.value, units);
      updateFormData({
        name: parsed.name,
        quantity: parsed.measurementValue ?? 0,
        unit_id: parsed.measurementUnitId,
        measurement_denominator_value:
          parsed.measurementDenominatorValue ?? null,
        measurement_denominator_unit_id: parsed.measurementDenominatorUnitId,
      });
      return;
    }

    handleChange(e);
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'category_id') {
      updateFormData({ category_id: value });
    } else if (field === 'type_id') {
      updateFormData({ type_id: value });
    } else if (field === 'package_id') {
      updateFormData({
        package_id: value,
        base_inventory_unit_id: formData.base_inventory_unit_id || value,
      });
      const selectedPackage = packages.find(pkg => pkg.id === value);
      if (selectedPackage) {
        packageConversionHook.setBaseUnit(selectedPackage.name);
        if (!formData.base_inventory_unit_id) {
          packageConversionHook.setBaseInventoryUnitId(selectedPackage.id);
          packageConversionHook.setBaseUnitKind('packaging');
        }
      }
    } else if (field === 'dosage_id') {
      updateFormData({ dosage_id: value });
    } else if (field === 'manufacturer_id') {
      updateFormData({ manufacturer_id: value });
    }
  };

  return (
    <ItemBasicInfoForm
      key={resetKey}
      isEditMode={isEditMode}
      formData={{
        code: formData.code || '',
        display_name: displayName,
        name: formData.name || '',
        manufacturer_id: formData.manufacturer_id || '',
        is_medicine: formData.is_medicine || false,
        category_id: formData.category_id || '',
        type_id: formData.type_id || '',
        package_id: formData.package_id || '',
        dosage_id: formData.dosage_id || '',
      }}
      categories={transformedCategories}
      types={transformedTypes}
      packages={transformedPackages}
      dosages={transformedDosages}
      manufacturers={transformedManufacturers}
      loading={loading}
      disabled={isViewingOldVersion}
      onDisplayNameChange={value => {
        const syntheticEvent = {
          target: { name: 'name', value },
        } as React.ChangeEvent<HTMLInputElement>;
        handleInputChange(syntheticEvent);
      }}
      onFieldChange={handleFieldChange}
      onDropdownChange={handleDropdownChange}
      persistedDropdownName={persistedDropdownName || null}
      freezePersistedDropdown={isAnyChildEntityModalOpen}
      onPersistedDropdownClear={() => setPersistedDropdownName?.(null)}
      onAddNewCategory={searchTerm => {
        setPersistedDropdownName?.('category_id');
        handleAddNewCategory(searchTerm);
      }}
      onAddNewType={searchTerm => {
        setPersistedDropdownName?.('type_id');
        handleAddNewType(searchTerm);
      }}
      onAddNewUnit={searchTerm => {
        setPersistedDropdownName?.('package_id');
        handleAddNewUnit(searchTerm);
      }}
      onAddNewDosage={searchTerm => {
        setPersistedDropdownName?.('dosage_id');
        handleAddNewDosage(searchTerm);
      }}
      onAddNewManufacturer={searchTerm => {
        setPersistedDropdownName?.('manufacturer_id');
        handleAddNewManufacturer(searchTerm);
      }}
    />
  );
};

export default BasicInfoRequiredSection;
