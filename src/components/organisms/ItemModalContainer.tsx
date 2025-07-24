import React from "react";
import { useItemModal, useItemActions } from "@/contexts/ItemManagementContext.hooks";
import ItemFormModals from "@/components/organisms/ItemFormModals";

const ItemModalContainer: React.FC = () => {
  const {
    isAddEditModalOpen,
    isAddTypeModalOpen,
    isAddUnitModalOpen,
    currentSearchTermForModal,
    setIsAddEditModalOpen,
    setIsAddTypeModalOpen,
    setIsAddUnitModalOpen,
    closeModalAndClearSearch,
  } = useItemModal();

  const {
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
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
      currentSearchTerm={currentSearchTermForModal}
    />
  );
};

export default ItemModalContainer;