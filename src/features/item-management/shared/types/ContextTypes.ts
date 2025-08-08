import type { ReactNode } from 'react';
import type {
  ItemCategory,
  ItemTypeEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
} from '../../domain/entities';
import type { UsePackageConversionReturn } from '@/types/hooks';
import type { ItemFormData } from './FormTypes';
import type { VersionData } from './ItemTypes';

// Context State Interfaces (Updated to match actual implementation)
export interface ItemFormState {
  formData: Partial<ItemFormData>;
  categories: ItemCategory[];
  types: ItemTypeEntity[];
  units: ItemPackage[];
  dosages: ItemDosageEntity[];
  manufacturers: ItemManufacturerEntity[];
  loading: boolean;
  isDirty: () => boolean;
}

export interface ItemUIState {
  isOpen: boolean;
  isClosing: boolean;
  isEditMode: boolean;
  formattedUpdateAt?: string;
  mode: 'add' | 'edit' | 'history';
  resetKey: number;
}

export interface ItemModalState {
  isAddEditModalOpen: boolean;
  isAddTypeModalOpen: boolean;
  isAddUnitModalOpen: boolean;
  isAddDosageModalOpen: boolean;
  isAddManufacturerModalOpen: boolean;
  currentSearchTermForModal: string;
}

export interface ItemPriceState {
  packageConversionHook: UsePackageConversionReturn;
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
  addDosageMutation: { isPending: boolean };
  addManufacturerMutation: { isPending: boolean };
}

// Context Action Interfaces (Updated to match actual implementation)
export interface ItemFormActions {
  updateFormData: (data: Partial<ItemFormData>) => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
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
  setIsAddDosageModalOpen: (open: boolean) => void;
  setIsAddManufacturerModalOpen: (open: boolean) => void;
  closeModalAndClearSearch: (
    setter:
      | ((open: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>
  ) => void;
  handleAddNewCategory: () => void;
  handleAddNewType: () => void;
  handleAddNewUnit: () => void;
  handleAddNewDosage: () => void;
  handleAddNewManufacturer: () => void;
}

export interface ItemBusinessActions {
  handleCancel: (
    setter?:
      | ((value: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>
  ) => void;
  handleDeleteItem: () => void;
  handleSaveCategory: (data: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  handleSaveType: (data: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  handleSaveUnit: (data: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  handleSaveDosage: (data: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  handleSaveManufacturer: (data: {
    code?: string;
    name: string;
    address?: string;
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
export type ModalMode = 'add' | 'edit' | 'history';

export interface EntityModalContextValue {
  // State
  form: {
    code?: string;
    name: string;
    description: string;
    address?: string;
    isDirty: boolean;
    isValid: boolean;
  };
  ui: {
    isOpen: boolean;
    isClosing: boolean;
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
    // Dual comparison support
    isDualMode: boolean;
    versionA?: VersionData;
    versionB?: VersionData;
    isFlipped: boolean;
  };

  // Actions
  formActions: {
    setCode?: (code: string) => void;
    setName: (name: string) => void;
    setDescription: (description: string) => void;
    setAddress?: (address: string) => void;
    handleSubmit: () => Promise<void>;
    handleDelete: () => void;
    resetForm: () => void;
  };
  uiActions: {
    handleClose: () => void;
    handleBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    setIsClosing: (isClosing: boolean) => void;
    setMode: (mode: ModalMode) => void;
    openHistory: (entityTable: string, entityId: string) => void;
    closeHistory: () => void;
    selectVersion: (version: VersionData) => void;
    openComparison: (version: VersionData) => void;
    closeComparison: () => void;
    openDualComparison: (versionA: VersionData, versionB: VersionData) => void;
    flipVersions: () => void;
    goBack: () => void;
  };
}
