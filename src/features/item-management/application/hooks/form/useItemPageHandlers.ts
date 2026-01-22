import { useEffect } from 'react';
import { useAddItemForm } from '../core/useItemCrud';
import type { ItemTypeEntity } from '../../../shared/types';
import type { UseItemManagementProps } from '../../../shared/types';

interface AddItemPageHandlersProps extends UseItemManagementProps {
  expiryCheckboxRef?: React.RefObject<HTMLLabelElement | null>;
}
import { useItemQueries } from '../core/useItemQueries';
import { useAddItemEventHandlers } from '../ui/useEventHandlers';
import { useAddItemUIState } from '../ui/useUIState';
import { useAddItemRefs } from '../ui/useRefs';

export const useAddItemPageHandlers = ({
  itemId,
  initialItemData,
  initialSearchQuery,
  onClose,
  expiryCheckboxRef,
  refetchItems,
}: AddItemPageHandlersProps) => {
  const addItemForm = useAddItemForm({
    itemId,
    initialItemData,
    initialSearchQuery,
    onClose,
    refetchItems,
  });
  const { descriptionRef, marginInputRef, minStockInputRef } = useAddItemRefs();
  const {
    isClosing,
    setIsClosing,
    showDescription,
    setShowDescription,
    isDescriptionHovered,
    setIsDescriptionHovered,
    showFefoTooltip,
    setShowFefoTooltip,
  } = useAddItemUIState();
  const {
    categoriesData,
    typesData,
    packagesData,
    unitsData,
    dosagesData,
    manufacturersData,
  } = useItemQueries();

  const {
    handleSelectChange,
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
    handleActualCancel,
  } = useAddItemEventHandlers({
    addItemForm,
    marginInputRef,
    minStockInputRef,
    expiryCheckboxRef,
  });

  useEffect(() => {
    if (categoriesData) addItemForm.setCategories(categoriesData);
  }, [categoriesData, addItemForm.setCategories, addItemForm]);

  useEffect(() => {
    if (typesData) addItemForm.setTypes(typesData as ItemTypeEntity[]);
  }, [typesData, addItemForm.setTypes, addItemForm]);

  useEffect(() => {
    if (packagesData) {
      addItemForm.setPackages(packagesData);
    }
  }, [packagesData, addItemForm.setPackages, addItemForm]);

  useEffect(() => {
    if (unitsData) {
      addItemForm.setUnits(unitsData);
    }
  }, [unitsData, addItemForm.setUnits, addItemForm]);

  useEffect(() => {
    if (dosagesData) {
      addItemForm.setDosages(dosagesData);
    }
  }, [dosagesData, addItemForm.setDosages, addItemForm]);

  useEffect(() => {
    if (manufacturersData) {
      addItemForm.setManufacturers(manufacturersData);
    }
  }, [manufacturersData, addItemForm.setManufacturers, addItemForm]);

  return {
    ...addItemForm,
    id: itemId,
    descriptionRef,
    marginInputRef,
    minStockInputRef,
    showDescription,
    setShowDescription,
    isDescriptionHovered,
    setIsDescriptionHovered,
    showFefoTooltip,
    setShowFefoTooltip,
    handleSelectChange,
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
    resetForm: addItemForm.resetForm,
    currentSearchTermForModal: addItemForm.currentSearchTermForModal,
    handleAddNewCategory: addItemForm.handleAddNewCategory,
    handleAddNewType: addItemForm.handleAddNewType,
    handleAddNewUnit: addItemForm.handleAddNewUnit,
    closeModalAndClearSearch: addItemForm.closeModalAndClearSearch,
    handleCancel: (
      closingStateSetter?:
        | ((value: boolean) => void)
        | React.Dispatch<React.SetStateAction<boolean>>
    ) => handleActualCancel(closingStateSetter || setIsClosing),
    isClosing,
    setIsClosing,
    // Explicit dosage-related properties
    dosages: addItemForm.dosages,
    isAddDosageModalOpen: addItemForm.isAddDosageModalOpen,
    setIsAddDosageModalOpen: addItemForm.setIsAddDosageModalOpen,
    handleAddNewDosage: addItemForm.handleAddNewDosage,
    handleSaveDosage: addItemForm.handleSaveDosage,
    addDosageMutation: addItemForm.addDosageMutation,
    // Explicit manufacturer-related properties
    manufacturers: addItemForm.manufacturers,
    isAddManufacturerModalOpen: addItemForm.isAddManufacturerModalOpen,
    setIsAddManufacturerModalOpen: addItemForm.setIsAddManufacturerModalOpen,
    handleAddNewManufacturer: addItemForm.handleAddNewManufacturer,
    handleSaveManufacturer: addItemForm.handleSaveManufacturer,
    addManufacturerMutation: addItemForm.addManufacturerMutation,
  };
};
