import React from 'react';
import {
  useItemForm,
  useItemModal,
  useItemPrice,
  useItemUI,
} from '../../shared/contexts/useItemFormContext';
import { useItemPriceCalculations } from '../../application/hooks/utils/useItemPriceCalculator';
import { useUnitConversionLogic } from '../../application/hooks/utils/useUnitConversionLogic';
import { useInlineEditor } from '@/hooks/useInlineEditor';

// Child components
import { ItemFormHeader } from './';
import ItemBasicInfoForm from './ItemBasicInfoForm';
import ItemSettingsForm from './ItemSettingsForm';
import ItemPricingForm from './ItemPricingForm';
import ItemUnitConversionManager from './ItemUnitConversionForm';

// Header Section
// eslint-disable-next-line react-refresh/only-export-components
const FormHeader: React.FC<{ onReset?: () => void; onClose: () => void }> = ({
  onReset,
  onClose,
}) => {
  const {
    isEditMode,
    formattedUpdateAt,
    isClosing,
    handleHistoryClick,
    mode,
    goBackToForm,
  } = useItemUI();
  const { formData } = useItemForm();

  const isHistoryMode = mode === 'history';

  return (
    <ItemFormHeader
      isEditMode={isEditMode}
      formattedUpdateAt={formattedUpdateAt}
      isClosing={isClosing}
      onReset={onReset}
      onClose={onClose}
      onHistoryClick={handleHistoryClick}
      isHistoryMode={isHistoryMode}
      onBackToForm={goBackToForm}
      itemName={formData.name}
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
    units,
    dosages,
    manufacturers,
    loading,
    handleChange,
    updateFormData,
  } = useItemForm();

  const { resetKey } = useItemUI();
  const { unitConversionHook } = useItemPrice();

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
  }));
  const transformedTypes = types.map(type => ({
    id: type.id,
    name: type.name,
  }));
  const transformedUnits = units.map(unit => ({
    id: unit.id,
    name: unit.name,
  }));
  const transformedDosages = dosages.map(dosage => ({
    id: dosage.id,
    name: dosage.name,
  }));
  const transformedManufacturers = manufacturers.map(manufacturer => ({
    id: manufacturer.id,
    name: manufacturer.name,
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
    }
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'category_id') {
      updateFormData({ category_id: value });
    } else if (field === 'type_id') {
      updateFormData({ type_id: value });
    } else if (field === 'unit_id') {
      updateFormData({ unit_id: value });
      // Also update baseUnit for unit conversion synchronization
      const selectedUnit = units.find(unit => unit.id === value);
      if (selectedUnit) {
        unitConversionHook.setBaseUnit(selectedUnit.name);
      }
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
        unit_id: formData.unit_id || '',
        dosage_id: formData.dosage_id || '',
        description: formData.description || '',
      }}
      categories={transformedCategories}
      types={transformedTypes}
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
  const { unitConversionHook, displayBasePrice, displaySellPrice } =
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
      baseUnit={unitConversionHook.baseUnit}
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

// Unit Conversion Section
// eslint-disable-next-line react-refresh/only-export-components
const UnitConversionSection: React.FC = () => {
  const { unitConversionHook } = useItemPrice();
  const { resetKey } = useItemUI();

  const unitConversionLogic = useUnitConversionLogic({
    conversions: unitConversionHook.conversions,
    availableUnits: unitConversionHook.availableUnits,
    formData: unitConversionHook.unitConversionFormData,
    addUnitConversion: unitConversionHook.addUnitConversion,
    setFormData: unitConversionHook.setUnitConversionFormData,
    baseUnit: unitConversionHook.baseUnit,
  });

  const handleAddConversion = () => {
    const result = unitConversionLogic.validateAndAddConversion();
    if (!result.success && result.error) {
      // Show validation errors to user - unit selection is now handled by dropdown validation
      if (result.error !== 'Silakan pilih satuan!') {
        alert(result.error);
      }
    }
  };

  return (
    <ItemUnitConversionManager
      key={resetKey} // Force re-mount on reset to clear validation and input states
      baseUnit={unitConversionHook.baseUnit}
      availableUnits={unitConversionHook.availableUnits}
      conversions={unitConversionHook.conversions}
      formData={unitConversionHook.unitConversionFormData}
      onFormDataChange={unitConversionHook.setUnitConversionFormData}
      onAddConversion={handleAddConversion}
      onRemoveConversion={unitConversionHook.removeUnitConversion}
    />
  );
};

// Compound component export
export const ItemFormSections = {
  Header: FormHeader,
  BasicInfo: BasicInfoSection,
  Settings: SettingsSection,
  Pricing: PricingSection,
  UnitConversion: UnitConversionSection,
};
