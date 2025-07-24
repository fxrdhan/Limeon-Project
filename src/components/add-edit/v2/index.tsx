import React, { useRef, useEffect } from "react";
import type { AddItemPortalProps } from "@/types";
import { useAddItemPageHandlers } from "@/hooks/addItemPage";
import { useItemFormValidation } from "@/hooks/useItemFormValidation";
import { useItemPriceCalculations } from "@/hooks/useItemPriceCalculations";

// Atomic Design Components
import ItemModalTemplate from "@/components/templates/ItemModalTemplate";
import ItemFormHeader from "@/components/molecules/ItemFormHeader";
import ItemBasicInfoForm from "@/components/organisms/ItemBasicInfoForm";
import ItemSettingsForm from "@/components/organisms/ItemSettingsForm";
import ItemPricingForm from "@/components/organisms/ItemPricingForm";
import ItemUnitConversionManager from "@/components/organisms/ItemUnitConversionManager";
import ItemFormModals from "@/components/organisms/ItemFormModals";

const AddItemPortal: React.FC<AddItemPortalProps> = ({
  isOpen,
  onClose,
  itemId,
  initialSearchQuery,
  isClosing,
  setIsClosing,
  refetchItems,
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const expiryCheckboxRef = useRef<HTMLLabelElement>(null);

  const handlers = useAddItemPageHandlers({
    itemId,
    initialSearchQuery,
    onClose,
    expiryCheckboxRef,
    refetchItems,
  });

  const {
    formData,
    displayBasePrice,
    displaySellPrice,
    categories,
    types,
    units,
    saving,
    loading,
    isEditMode,
    handleChange,
    handleSubmit,
    updateFormData,
    unitConversionHook,
    isAddEditModalOpen,
    setIsAddEditModalOpen,
    isAddTypeModalOpen,
    setIsAddTypeModalOpen,
    isAddUnitModalOpen,
    setIsAddUnitModalOpen,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    editingMargin,
    marginPercentage,
    editingMinStock,
    minStockValue,
    handleDeleteItem,
    handleCancel,
    formattedUpdateAt,
    addCategoryMutation,
    addUnitMutation,
    addTypeMutation,
    setMarginPercentage,
    handleDropdownChange,
    handleMarginChange,
    handleSellPriceChange,
    startEditingMargin,
    stopEditingMargin,
    handleMarginKeyDown,
    startEditingMinStock,
    stopEditingMinStock,
    handleMinStockChange,
    handleMinStockKeyDown,
    deleteItemMutation,
    resetForm,
    currentSearchTermForModal,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    closeModalAndClearSearch,
    isDirty,
    regenerateItemCode,
  } = handlers;

  // Price calculations
  const { calculateProfitPercentage: calcMargin } = useItemPriceCalculations({
    basePrice: formData.base_price,
    sellPrice: formData.sell_price,
  });

  // Form validation
  const { finalDisabledState } = useItemFormValidation({
    formData,
    isDirtyFn: isDirty,
    isEditMode,
    operationsPending:
      addTypeMutation.isPending ||
      addUnitMutation.isPending ||
      addCategoryMutation.isPending ||
      deleteItemMutation.isPending,
  });

  // Handle modal closing animation
  useEffect(() => {
    if (isClosing) {
      onClose();
    }
  }, [isClosing, onClose]);

  useEffect(() => {
    if (isOpen) {
      const focusInput = () => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      };

      const timer = setTimeout(focusInput, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isEditMode, formData.name, loading]);

  // Remove loading card to prevent flashing during data fetch
  // The modal will show with empty fields momentarily then populate

  const handleReset = () => {
    resetForm();
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const handleBackdropClick = () => {
    if (!isClosing) {
      setIsClosing(true);
    }
  };

  const handleClose = () => {
    if (!isClosing) {
      setIsClosing(true);
    }
  };

  const handleAddConversion = () => {
    if (!unitConversionHook.unitConversionFormData.unit) {
      return;
    }
    
    if (unitConversionHook.unitConversionFormData.conversion <= 0) {
      alert("Nilai konversi harus lebih dari 0!");
      return;
    }

    const existingUnit = unitConversionHook.conversions.find(
      (uc) => uc.unit.name === unitConversionHook.unitConversionFormData.unit,
    );
    if (existingUnit) {
      alert("Satuan tersebut sudah ada dalam daftar!");
      return;
    }

    const selectedUnit = unitConversionHook.availableUnits.find(
      (u) => u.name === unitConversionHook.unitConversionFormData.unit,
    );
    if (!selectedUnit) {
      alert("Satuan tidak valid!");
      return;
    }

    unitConversionHook.addUnitConversion({
      unit: selectedUnit,
      unit_name: selectedUnit.name,
      to_unit_id: selectedUnit.id,
      conversion: unitConversionHook.unitConversionFormData.conversion,
      basePrice: 0,
      sellPrice: 0,
      conversion_rate: unitConversionHook.unitConversionFormData.conversion,
    });

    unitConversionHook.setUnitConversionFormData({
      unit: "",
      conversion: 0,
    });
  };

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === "is_medicine" && value === false) {
      updateFormData({ 
        [field]: value,
        has_expiry_date: false 
      });
    } else {
      updateFormData({ [field]: value });
    }
  };

  return (
    <ItemModalTemplate
      isOpen={isOpen}
      isClosing={isClosing}
      onBackdropClick={handleBackdropClick}
      onSubmit={handleSubmit}
      children={{
        header: (
          <ItemFormHeader
            isEditMode={isEditMode}
            formattedUpdateAt={formattedUpdateAt}
            isClosing={isClosing}
            onReset={!isEditMode ? handleReset : undefined}
            onClose={handleClose}
          />
        ),
        basicInfo: (
          <ItemBasicInfoForm
            ref={nameInputRef}
            formData={{
              code: formData.code,
              name: formData.name,
              manufacturer: formData.manufacturer,
              barcode: formData.barcode,
              is_medicine: formData.is_medicine,
              category_id: formData.category_id,
              type_id: formData.type_id,
              unit_id: formData.unit_id,
              rack: formData.rack,
              description: formData.description,
            }}
            categories={categories}
            types={types}
            units={units}
            loading={loading}
            onCodeRegenerate={regenerateItemCode}
            onChange={handleChange}
            onFieldChange={handleFieldChange}
            onDropdownChange={handleDropdownChange}
            onAddNewCategory={handleAddNewCategory}
            onAddNewType={handleAddNewType}
            onAddNewUnit={handleAddNewUnit}
          />
        ),
        categoryForm: null,
        settingsForm: (
          <ItemSettingsForm
            ref={expiryCheckboxRef}
            formData={{
              is_active: formData.is_active,
              is_medicine: formData.is_medicine,
              has_expiry_date: formData.has_expiry_date,
              min_stock: formData.min_stock,
            }}
            minStockEditing={{
              isEditing: editingMinStock,
              value: minStockValue,
            }}
            onFieldChange={handleFieldChange}
            onStartEditMinStock={startEditingMinStock}
            onStopEditMinStock={stopEditingMinStock}
            onMinStockChange={handleMinStockChange}
            onMinStockKeyDown={handleMinStockKeyDown}
          />
        ),
        pricingForm: (
          <ItemPricingForm
            formData={{
              base_price: formData.base_price,
              sell_price: formData.sell_price,
            }}
            displayBasePrice={displayBasePrice}
            displaySellPrice={displaySellPrice}
            baseUnit={unitConversionHook.baseUnit}
            marginEditing={{
              isEditing: editingMargin,
              percentage: marginPercentage,
            }}
            calculatedMargin={calcMargin}
            onBasePriceChange={handleChange}
            onSellPriceChange={handleSellPriceChange}
            onMarginChange={setMarginPercentage}
            onStartEditMargin={startEditingMargin}
            onStopEditMargin={stopEditingMargin}
            onMarginInputChange={handleMarginChange}
            onMarginKeyDown={handleMarginKeyDown}
          />
        ),
        unitConversionManager: (
          <ItemUnitConversionManager
            baseUnit={unitConversionHook.baseUnit}
            availableUnits={unitConversionHook.availableUnits}
            conversions={unitConversionHook.conversions}
            formData={unitConversionHook.unitConversionFormData}
            onFormDataChange={unitConversionHook.setUnitConversionFormData}
            onAddConversion={handleAddConversion}
            onRemoveConversion={unitConversionHook.removeUnitConversion}
          />
        ),
        modals: (
          <ItemFormModals
            categoryModal={{
              isOpen: isAddEditModalOpen,
              onClose: () => closeModalAndClearSearch(setIsAddEditModalOpen),
              onSubmit: handleSaveCategory,
              mutation: addCategoryMutation,
            }}
            typeModal={{
              isOpen: isAddTypeModalOpen,
              onClose: () => closeModalAndClearSearch(setIsAddTypeModalOpen),
              onSubmit: handleSaveType,
              mutation: addTypeMutation,
            }}
            unitModal={{
              isOpen: isAddUnitModalOpen,
              onClose: () => closeModalAndClearSearch(setIsAddUnitModalOpen),
              onSubmit: handleSaveUnit,
              mutation: addUnitMutation,
            }}
            currentSearchTerm={currentSearchTermForModal}
          />
        ),
      }}
      formAction={{
        onCancel: () => handleCancel(setIsClosing),
        onDelete: isEditMode ? handleDeleteItem : undefined,
        isSaving: saving,
        isDeleting: deleteItemMutation?.isPending || false,
        isEditMode,
        isDisabled: finalDisabledState,
      }}
    />
  );
};

export default AddItemPortal;