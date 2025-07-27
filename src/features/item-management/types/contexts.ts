import type { ReactNode } from "react";
import type { Category, MedicineType, Unit } from "@/types/database";
import type { UseUnitConversionReturn } from "@/types/hooks";
import type { ItemFormData } from "./forms";
import type { VersionData } from "./entities";

// Context State Interfaces (Updated to match actual implementation)
export interface ItemFormState {
  formData: Partial<ItemFormData>;
  categories: Category[];
  types: MedicineType[];
  units: Unit[];
  loading: boolean;
  isDirty: () => boolean;
}

export interface ItemUIState {
  isOpen: boolean;
  isClosing: boolean;
  isEditMode: boolean;
  formattedUpdateAt?: string;
  mode: 'add' | 'edit' | 'history';
}

export interface ItemModalState {
  isAddEditModalOpen: boolean;
  isAddTypeModalOpen: boolean;
  isAddUnitModalOpen: boolean;
  currentSearchTermForModal: string;
}

export interface ItemPriceState {
  unitConversionHook: UseUnitConversionReturn;
  displayBasePrice: string;
  displaySellPrice: string;
}

export interface ItemActionState {
  saving: boolean;
  finalDisabledState: boolean;
  deleteItemMutation: { isPending: boolean };
  addCategoryMutation: { isPending: boolean };
  addTypeMutation: { isPending: boolean };
  addUnitMutation: { isPending: boolean };
}

// Context Action Interfaces (Updated to match actual implementation)
export interface ItemFormActions {
  updateFormData: (data: Partial<ItemFormData>) => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
  regenerateItemCode: () => void;
}

export interface ItemUIActions {
  handleBackdropClick: () => void;
  handleClose: () => void;
  handleReset?: () => void;
  setIsClosing: (value: boolean) => void;
  handleHistoryClick?: () => void;
  setMode: (mode: 'add' | 'edit' | 'history') => void;
  goBackToForm: () => void;
}

export interface ItemModalActions {
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

export interface ItemBusinessActions {
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

// Provider Props
export interface ItemManagementProviderProps {
  children: ReactNode;
  value: ItemManagementContextValue;
}

// Entity Modal Context Types
export type ModalMode = 'add' | 'edit' | 'history' | 'version-detail';

export interface EntityModalContextValue {
  // State
  form: {
    name: string;
    description: string;
    isDirty: boolean;
    isValid: boolean;
  };
  ui: {
    isOpen: boolean;
    isEditMode: boolean;
    entityName: string;
    formattedUpdateAt: string;
    mode: ModalMode;
  };
  action: {
    isLoading: boolean;
    isDeleting: boolean;
  };
  history: {
    entityTable: string;
    entityId: string;
    selectedVersion?: VersionData;
  };
  comparison: {
    isOpen: boolean;
    selectedVersion?: VersionData;
  };

  // Actions
  formActions: {
    setName: (name: string) => void;
    setDescription: (description: string) => void;
    handleSubmit: () => Promise<void>;
    handleDelete: () => void;
    resetForm: () => void;
  };
  uiActions: {
    handleClose: () => void;
    handleBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    setMode: (mode: ModalMode) => void;
    openHistory: (entityTable: string, entityId: string) => void;
    closeHistory: () => void;
    selectVersion: (version: VersionData) => void;
    openVersionDetail: (version: VersionData) => void;
    openComparison: (version: VersionData) => void;
    closeComparison: () => void;
    goBack: () => void;
  };
}