import type { ReactNode } from 'react';
import type {
  ItemCategory,
  ItemTypeEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
  ItemUnitEntity,
} from './EntityTypes';
import type { UsePackageConversionReturn } from '@/types/hooks';
import type { ItemFormData } from './FormTypes';
import type { PackageConversion, VersionData } from './ItemTypes';

// Context State Interfaces (Updated to match actual implementation)
export interface ItemFormState {
  formData: Partial<ItemFormData>;
  categories: ItemCategory[];
  types: ItemTypeEntity[];
  packages: ItemPackage[];
  units: ItemUnitEntity[];
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
  resetKey: number;
  viewingVersionNumber: number | null;
  isViewingOldVersion: boolean;
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

export interface ItemRealtimeState {
  smartFormSync?: {
    handleRealtimeUpdate: (updates: Record<string, unknown>) => {
      appliedImmediately: Record<string, unknown>;
      pendingConflicts: string[];
    };
    getFieldHandlers: (fieldName: string) => {
      onFocus: () => void;
      onBlur: () => void;
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    };
    hasPendingUpdate: (fieldName: string) => boolean;
    applyAllPendingUpdates: () => Record<string, unknown>;
    registerActiveField: (fieldName: string) => void;
    unregisterActiveField: (fieldName: string) => void;
  };
}

// Context Action Interfaces (Updated to match actual implementation)
export interface ItemFormActions {
  updateFormData: (data: Partial<ItemFormData>) => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
  setInitialPackageConversions: (conversions: PackageConversion[]) => void;
}

export interface ItemUIActions {
  handleBackdropClick: () => void;
  handleClose: () => void;
  handleReset?: () => void;
  setIsClosing: (value: boolean) => void;
  handleVersionSelect?: (
    version: number,
    entityData: Record<string, unknown>
  ) => void;
  handleClearVersionView: () => void;
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
  realtime?: ItemRealtimeState;
  history?: {
    // Pre-fetched history data for seamless UX
    data: Array<{
      id: string;
      version_number: number;
      action_type: 'INSERT' | 'UPDATE' | 'DELETE';
      changed_at: string;
      entity_data: Record<string, unknown>;
      changed_fields?: Record<string, { from: unknown; to: unknown }>;
    }> | null;
    isLoading: boolean;
    error: string | null;
  };

  // Actions
  formActions: ItemFormActions;
  uiActions: ItemUIActions;
  modalActions: ItemModalActions;
  businessActions: ItemBusinessActions;
}

// Shorter alias
export type ItemContextValue = ItemManagementContextValue;

// Provider Props
export interface ItemManagementProviderProps {
  children: ReactNode;
  value: ItemManagementContextValue;
}

// Shorter alias
export type ItemProviderProps = ItemManagementProviderProps;

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
    // Pre-fetched history data for seamless UX
    data: Array<{
      id: string;
      version_number: number;
      action_type: 'INSERT' | 'UPDATE' | 'DELETE';
      changed_at: string;
      entity_data: Record<string, unknown>;
      changed_fields?: Record<string, { from: unknown; to: unknown }>;
    }> | null;
    isLoading: boolean;
    error: string | null;
  };
  comparison: {
    isOpen: boolean;
    isClosing: boolean;
    selectedVersion?: VersionData;
    // Dual comparison support
    isDualMode: boolean;
    versionA?: VersionData;
    versionB?: VersionData;
    isFlipped: boolean;
  };
  // Realtime sync state (optional - only present in edit mode)
  realtime?: {
    smartFormSync?: {
      handleRealtimeUpdate: (updates: Record<string, unknown>) => {
        appliedImmediately: Record<string, unknown>;
        pendingConflicts: string[];
      };
      getFieldHandlers: (fieldName: string) => {
        onFocus: () => void;
        onBlur: () => void;
        onChange: () => void;
      };
      hasPendingUpdate: (fieldName: string) => boolean;
      applyAllPendingUpdates: () => Record<string, unknown>;
      registerActiveField: (fieldName: string) => void;
      unregisterActiveField: (fieldName: string) => void;
    };
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
