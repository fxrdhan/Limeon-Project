import React, { createContext, ReactNode, useMemo } from "react";
import type { ItemFormData } from "../types";
import type {
  Category,
  MedicineType,
  Unit,
  UseUnitConversionReturn,
} from "@/types";

// Consolidated state interfaces
interface ItemFormState {
  formData: Partial<ItemFormData>;
  categories: Category[];
  types: MedicineType[];
  units: Unit[];
  loading: boolean;
  isDirty: () => boolean;
}

interface ItemUIState {
  isOpen: boolean;
  isClosing: boolean;
  isEditMode: boolean;
  formattedUpdateAt?: string;
}

interface ItemModalState {
  isAddEditModalOpen: boolean;
  isAddTypeModalOpen: boolean;
  isAddUnitModalOpen: boolean;
  currentSearchTermForModal: string;
}

interface ItemPriceState {
  unitConversionHook: UseUnitConversionReturn;
  displayBasePrice: string;
  displaySellPrice: string;
}

interface ItemActionState {
  saving: boolean;
  finalDisabledState: boolean;
  deleteItemMutation: { isPending: boolean };
  addCategoryMutation: { isPending: boolean };
  addTypeMutation: { isPending: boolean };
  addUnitMutation: { isPending: boolean };
}

// Action handlers
interface ItemFormActions {
  updateFormData: (data: Partial<ItemFormData>) => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
  regenerateItemCode: () => void;
}

interface ItemUIActions {
  handleBackdropClick: () => void;
  handleClose: () => void;
  handleReset?: () => void;
  setIsClosing: (value: boolean) => void;
}

interface ItemModalActions {
  setIsAddEditModalOpen: (open: boolean) => void;
  setIsAddTypeModalOpen: (open: boolean) => void;
  setIsAddUnitModalOpen: (open: boolean) => void;
  closeModalAndClearSearch: (
    setter:
      | ((open: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>,
  ) => void;
  handleAddNewCategory: () => void;
  handleAddNewType: () => void;
  handleAddNewUnit: () => void;
}

interface ItemBusinessActions {
  handleCancel: (
    setter?: ((value: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>,
  ) => void;
  handleDeleteItem: () => void;
  handleSaveCategory: (data: {
    name: string;
    description: string;
  }) => Promise<void>;
  handleSaveType: (data: {
    name: string;
    description: string;
  }) => Promise<void>;
  handleSaveUnit: (data: {
    name: string;
    description: string;
  }) => Promise<void>;
}

// Consolidated context interface
export interface ItemManagementContextValue {
  // State
  form: ItemFormState;
  ui: ItemUIState;
  modal: ItemModalState;
  price: ItemPriceState;
  action: ItemActionState;

  // Actions
  formActions: ItemFormActions;
  uiActions: ItemUIActions;
  modalActions: ItemModalActions;
  businessActions: ItemBusinessActions;
}
// eslint-disable-next-line react-refresh/only-export-components
export const ItemManagementContext = createContext<
  ItemManagementContextValue | undefined
>(undefined);

interface ItemManagementProviderProps {
  children: ReactNode;
  value: ItemManagementContextValue;
}

export const ItemManagementProvider: React.FC<ItemManagementProviderProps> = ({
  children,
  value,
}) => {
  // Memoize context value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => value, [value]);

  return (
    <ItemManagementContext.Provider value={memoizedValue}>
      {children}
    </ItemManagementContext.Provider>
  );
};
