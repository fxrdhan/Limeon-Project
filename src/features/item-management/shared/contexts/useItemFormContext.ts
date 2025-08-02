import { useContext } from 'react';
import { ItemManagementContext } from './ItemFormContext';

export const useItemManagement = () => {
  const context = useContext(ItemManagementContext);
  if (!context) {
    throw new Error(
      'useItemManagement must be used within ItemManagementProvider'
    );
  }
  return context;
};

// Specialized hooks for focused access (performance optimization)
export const useItemForm = () => {
  const { form, formActions } = useItemManagement();
  return { ...form, ...formActions };
};

export const useItemUI = () => {
  const { ui, uiActions } = useItemManagement();
  return { ...ui, ...uiActions };
};

export const useItemModal = () => {
  const { modal, modalActions } = useItemManagement();
  return { ...modal, ...modalActions };
};

export const useItemPrice = () => {
  const { price } = useItemManagement();
  return price;
};

export const useItemActions = () => {
  const { action, businessActions } = useItemManagement();
  return { ...action, ...businessActions };
};
