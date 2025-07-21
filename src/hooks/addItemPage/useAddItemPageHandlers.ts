import { useEffect } from "react";
import { useAddItemForm } from "@/hooks/addItem";
import { AddItemPageHandlersProps, MedicineType } from "@/types";
import { useItemQueries } from "./useItemQueries";
import { useAddItemEventHandlers } from "./useEventHandlers";
import { useAddItemUIState } from "./useUIState";
import { useAddItemRefs } from "./useRefs";

export const useAddItemPageHandlers = ({
  itemId,
  initialSearchQuery,
  onClose,
  expiryCheckboxRef,
  refetchItems,
}: AddItemPageHandlersProps) => {
  const addItemForm = useAddItemForm({ itemId, initialSearchQuery, onClose, refetchItems });
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
  const { categoriesData, typesData, unitsData } = useItemQueries();


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
    if (typesData) addItemForm.setTypes(typesData as MedicineType[]);
  }, [typesData, addItemForm.setTypes, addItemForm]);

  useEffect(() => {
    if (unitsData) {
      addItemForm.setUnits(unitsData);
    }
  }, [unitsData, addItemForm.setUnits, addItemForm]);

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
    handleCancel: (closingStateSetter?: React.Dispatch<React.SetStateAction<boolean>>) => 
      handleActualCancel(closingStateSetter || setIsClosing),
    isClosing,
    setIsClosing,
    regenerateItemCode: addItemForm.regenerateItemCode,
  };
};
