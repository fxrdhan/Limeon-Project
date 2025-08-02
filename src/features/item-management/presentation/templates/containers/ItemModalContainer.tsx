import React from 'react';
import {
  useItemModal,
  useItemActions,
} from '../../../shared/contexts/useItemFormContext';
import ItemFormModals from '../item/ItemFormModals';

const ItemModalContainer: React.FC = () => {
  const {
    isAddEditModalOpen,
    isAddTypeModalOpen,
    isAddUnitModalOpen,
    isAddDosageModalOpen,
    isAddManufacturerModalOpen,
    currentSearchTermForModal,
    setIsAddEditModalOpen,
    setIsAddTypeModalOpen,
    setIsAddUnitModalOpen,
    setIsAddDosageModalOpen,
    setIsAddManufacturerModalOpen,
    closeModalAndClearSearch,
  } = useItemModal();

  const {
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleSaveDosage,
    handleSaveManufacturer,
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    addManufacturerMutation,
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
      manufacturerModal={{
        isOpen: isAddManufacturerModalOpen,
        onClose: () => closeModalAndClearSearch(setIsAddManufacturerModalOpen),
        onSubmit: handleSaveManufacturer,
        mutation: addManufacturerMutation,
      }}
      currentSearchTerm={currentSearchTermForModal}
    />
  );
};

export default ItemModalContainer;
