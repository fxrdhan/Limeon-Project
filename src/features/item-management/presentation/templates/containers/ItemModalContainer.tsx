import React from "react";
import { useItemModal, useItemActions } from "../../../shared/contexts/useItemFormContext";
import ItemFormModals from "../item/ItemFormModals";

const ItemModalContainer: React.FC = () => {
  const {
    isAddEditModalOpen,
    isAddTypeModalOpen,
    isAddUnitModalOpen,
    isAddDosageModalOpen,
    currentSearchTermForModal,
    setIsAddEditModalOpen,
    setIsAddTypeModalOpen,
    setIsAddUnitModalOpen,
    setIsAddDosageModalOpen,
    closeModalAndClearSearch,
  } = useItemModal();

  const {
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleSaveDosage,
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
  } = useItemActions();

  return (
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
      dosageModal={{
        isOpen: isAddDosageModalOpen,
        onClose: () => closeModalAndClearSearch(setIsAddDosageModalOpen),
        onSubmit: handleSaveDosage,
        mutation: addDosageMutation,
      }}
      currentSearchTerm={currentSearchTermForModal}
    />
  );
};

export default ItemModalContainer;