import React from 'react';
import toast from 'react-hot-toast';
import {
  useItemForm,
  useItemModal,
  useItemPrice,
  useItemUI,
} from '../../shared/contexts/useItemFormContext';
import { useItemPriceCalculations } from '../../application/hooks/utils/useItemPriceCalculator';
import { usePackageConversionLogic } from '../../application/hooks/utils/useConversionLogic';
import { useInlineEditor } from '@/hooks/forms/useInlineEditor';

// Child components
import { ItemFormHeader } from '../molecules';
import ItemBasicInfoForm from '../organisms/ItemBasicInfoForm';
import ItemSettingsForm from '../organisms/ItemSettingsForm';
import ItemPricingForm from '../organisms/ItemPricingForm';
import ItemPackageConversionManager from '../organisms/ItemPackageConversionForm';

// Header Section
// eslint-disable-next-line react-refresh/only-export-components
const FormHeader: React.FC<{
  onReset?: () => void;
  onClose: () => void;
  onHistoryClick?: () => void;
  isHistoryPanelOpen?: boolean;
}> = ({ onReset, onClose, onHistoryClick, isHistoryPanelOpen }) => {
  const { isEditMode, formattedUpdateAt, isClosing } = useItemUI();

  return (
    <ItemFormHeader
      isEditMode={isEditMode}
      formattedUpdateAt={formattedUpdateAt}
      isClosing={isClosing}
      onReset={onReset}
      onClose={onClose}
      onHistoryClick={onHistoryClick}
      isHistoryPanelOpen={isHistoryPanelOpen}
    />
  );
};

// Basic Info Section
// eslint-disable-next-line react-refresh/only-export-components
const BasicInfoSection: React.FC = () => {
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

  const { resetKey } = useItemUI();
  const { packageConversionHook } = useItemPrice();

  const {
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,
  } = useItemModal();

  // Transform database types to DropdownOption format
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
  const transformedUnits = units.map(unit => ({
    id: unit.id,
    name: unit.name,
    code: unit.code,
    description: unit.description,
    updated_at: unit.updated_at,
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
    description: manufacturer.address, // Use address field as description for hover detail
    updated_at: manufacturer.updated_at,
  }));

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'is_active') {
      updateFormData({ is_active: value as boolean });
    } else if (field === 'has_expiry_date') {
      updateFormData({ has_expiry_date: value as boolean });
    } else if (field === 'code') {
      updateFormData({ code: value as string });
    }
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'category_id') {
      updateFormData({ category_id: value });
    } else if (field === 'type_id') {
      updateFormData({ type_id: value });
    } else if (field === 'package_id') {
      updateFormData({ package_id: value });
      // Also update baseUnit for unit conversion synchronization
      const selectedPackage = packages.find(pkg => pkg.id === value);
      if (selectedPackage) {
        packageConversionHook.setBaseUnit(selectedPackage.name);
      }
    } else if (field === 'unit_id') {
      updateFormData({ unit_id: value });
    } else if (field === 'dosage_id') {
      updateFormData({ dosage_id: value });
    } else if (field === 'manufacturer_id') {
      updateFormData({ manufacturer_id: value });
    }
  };

  return (
    <ItemBasicInfoForm
      key={resetKey} // Force re-mount on reset to clear validation
      formData={{
        code: formData.code || '',
        name: formData.name || '',
        manufacturer_id: formData.manufacturer_id || '',
        barcode: formData.barcode || '',
        is_medicine: formData.is_medicine || false,
        category_id: formData.category_id || '',
        type_id: formData.type_id || '',
        package_id: formData.package_id || '',
        dosage_id: formData.dosage_id || '',
        description: formData.description || '',
        quantity: formData.quantity || 0,
        unit_id: formData.unit_id || '',
      }}
      categories={transformedCategories}
      types={transformedTypes}
      packages={transformedPackages}
      units={transformedUnits}
      dosages={transformedDosages}
      manufacturers={transformedManufacturers}
      loading={loading}
      onChange={handleChange}
      onFieldChange={handleFieldChange}
      onDropdownChange={handleDropdownChange}
      onAddNewCategory={handleAddNewCategory}
      onAddNewType={handleAddNewType}
      onAddNewUnit={handleAddNewUnit}
      onAddNewDosage={handleAddNewDosage}
      onAddNewManufacturer={handleAddNewManufacturer}
    />
  );
};

// Settings Section
// eslint-disable-next-line react-refresh/only-export-components
const SettingsSection: React.FC = () => {
  const { formData, updateFormData } = useItemForm();

  const minStockEditor = useInlineEditor({
    initialValue: (formData.min_stock || 0).toString(),
    onSave: value => {
      updateFormData({ min_stock: parseInt(value.toString()) || 0 });
    },
  });

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'is_active') {
      updateFormData({ is_active: value as boolean });
    } else if (field === 'has_expiry_date') {
      updateFormData({ has_expiry_date: value as boolean });
    } else if (field === 'min_stock') {
      updateFormData({ min_stock: parseInt(value as string) || 0 });
    }
  };

  return (
    <ItemSettingsForm
      formData={{
        is_active: formData.is_active ?? true,
        is_medicine: formData.is_medicine || false,
        has_expiry_date: formData.has_expiry_date || false,
        min_stock: formData.min_stock || 0,
      }}
      minStockEditing={{
        isEditing: minStockEditor.isEditing,
        value: minStockEditor.value,
      }}
      onFieldChange={handleFieldChange}
      onStartEditMinStock={minStockEditor.startEditing}
      onStopEditMinStock={minStockEditor.stopEditing}
      onMinStockChange={minStockEditor.handleChange}
      onMinStockKeyDown={minStockEditor.handleKeyDown}
    />
  );
};

// Pricing Section
// eslint-disable-next-line react-refresh/only-export-components
const PricingSection: React.FC = () => {
  const { formData, updateFormData, handleChange } = useItemForm();
  const { packageConversionHook, displayBasePrice, displaySellPrice } =
    useItemPrice();

  const { resetKey } = useItemUI();

  const { calculateProfitPercentage: calcMargin } = useItemPriceCalculations({
    basePrice: formData.base_price || 0,
    sellPrice: formData.sell_price || 0,
  });

  const marginEditor = useInlineEditor({
    initialValue: (calcMargin || 0).toString(),
    onSave: value => {
      const basePrice = formData.base_price || 0;
      const marginPercentage = parseFloat(value.toString()) || 0;
      const newSellPrice = basePrice + (basePrice * marginPercentage) / 100;
      updateFormData({ sell_price: newSellPrice });
    },
  });

  const handleSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract numeric value from currency format (e.g., "Rp 123" -> "123")
    const cleanValue = e.target.value
      .replace(/^Rp\s*/, '')
      .replace(/[^0-9]/g, '');
    const value = parseFloat(cleanValue) || 0;
    updateFormData({ sell_price: value });
    marginEditor.setValue((calcMargin || 0).toString());
  };

  return (
    <ItemPricingForm
      key={resetKey} // Force re-mount on reset to clear validation
      formData={{
        base_price: formData.base_price || 0,
        sell_price: formData.sell_price || 0,
      }}
      displayBasePrice={displayBasePrice}
      displaySellPrice={displaySellPrice}
      baseUnit={packageConversionHook.baseUnit}
      marginEditing={{
        isEditing: marginEditor.isEditing,
        percentage: marginEditor.value,
      }}
      calculatedMargin={calcMargin || 0}
      onBasePriceChange={handleChange}
      onSellPriceChange={handleSellPriceChange}
      onMarginChange={marginEditor.setValue}
      onStartEditMargin={marginEditor.startEditing}
      onStopEditMargin={marginEditor.stopEditing}
      onMarginInputChange={marginEditor.handleChange}
      onMarginKeyDown={marginEditor.handleKeyDown}
    />
  );
};

// Package Conversion Section
// eslint-disable-next-line react-refresh/only-export-components
const PackageConversionSection: React.FC = () => {
  const { packageConversionHook } = useItemPrice();
  const { resetKey } = useItemUI();

  const packageConversionLogic = usePackageConversionLogic({
    conversions: packageConversionHook.conversions,
    availableUnits: packageConversionHook.availableUnits,
    formData: packageConversionHook.packageConversionFormData,
    addPackageConversion: packageConversionHook.addPackageConversion,
    setFormData: packageConversionHook.setPackageConversionFormData,
    baseUnit: packageConversionHook.baseUnit,
  });

  const handleAddConversion = () => {
    const result = packageConversionLogic.validateAndAddConversion();
    if (!result.success && result.error) {
      // Show validation errors to user - unit selection is now handled by dropdown validation
      if (result.error !== 'Silakan pilih kemasan!') {
        toast.error(result.error);
      }
    }
  };

  return (
    <ItemPackageConversionManager
      key={resetKey} // Force re-mount on reset to clear validation and input states
      baseUnit={packageConversionHook.baseUnit}
      availableUnits={packageConversionHook.availableUnits}
      conversions={packageConversionHook.conversions}
      formData={packageConversionHook.packageConversionFormData}
      onFormDataChange={packageConversionHook.setPackageConversionFormData}
      onAddConversion={handleAddConversion}
      onRemoveConversion={packageConversionHook.removePackageConversion}
    />
  );
};

// Compound component export
export const ItemFormSections = {
  Header: FormHeader,
  BasicInfo: BasicInfoSection,
  Settings: SettingsSection,
  Pricing: PricingSection,
  PackageConversion: PackageConversionSection,
};
