import type { ItemFormData, UnitConversionLogicFormData } from "./forms";
import type { EntityData, UnitData, UnitConversion } from "./entities";
import type { ChangeEvent, RefObject } from "react";

// Hook Parameter Interfaces
export interface UseItemManagementProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

export type AddItemPageHandlersProps = UseItemManagementProps;

export interface UseAddItemFormStateProps {
  initialSearchQuery?: string;
}

export interface UseUnitConversionLogicProps {
  conversions: UnitConversion[];
  availableUnits: UnitData[];
  formData: UnitConversionLogicFormData;
  addUnitConversion: (conversion: Omit<UnitConversion, "id"> & { basePrice?: number; sellPrice?: number }) => void;
  setFormData: (data: UnitConversionLogicFormData) => void;
}

export interface UseItemFormValidationProps {
  formData: ValidationFormData;
  isDirtyFn?: () => boolean;
  isEditMode: boolean;
  operationsPending: boolean;
}

export interface UseItemPriceCalculationsProps {
  formData: ItemFormData;
  setFormData: (data: ItemFormData) => void;
}

export interface UseAddItemMutationsProps {
  onClose: () => void;
  refetchItems?: () => void;
}

export interface UseItemCodeGenerationProps {
  isEditMode: boolean;
  itemId?: string;
  formData: ItemFormData;
  initialFormData: ItemFormData | null;
  categories: Array<{ id: string; name: string }>;
  types: Array<{ id: string; name: string }>;
  units: UnitData[];
  updateFormData: (data: Partial<ItemFormData>) => void;
}

export interface UseEntityModalLogicProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { id?: string; name: string; description: string }) => Promise<void>;
  onDelete?: (id: string) => void;
  initialData?: EntityData | null;
  initialNameFromSearch?: string;
  entityName: string;
  isLoading?: boolean;
  isDeleting?: boolean;
}

// Event Handlers Hook Types
export interface AddItemFormType {
  handleSelectChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  units: Array<{ id: string; name: string }>;
  unitConversionHook: { setBaseUnit: (unit: string) => void };
  setMarginPercentage: (value: string) => void;
  formData: { base_price: number; min_stock: number; is_medicine: boolean };
  updateFormData: (data: Record<string, unknown>) => void;
  calculateSellPriceFromMargin: (margin: number) => number;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  calculateProfitPercentage: () => number | null;
  setEditingMargin: (editing: boolean) => void;
  marginPercentage: string;
  setMinStockValue: (value: string) => void;
  setEditingMinStock: (editing: boolean) => void;
  minStockValue: string;
  handleCancel: (closingStateSetter?: ((value: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>) => void;
}

export interface AddItemEventHandlersProps {
  addItemForm: AddItemFormType;
  marginInputRef: RefObject<HTMLInputElement | null>;
  minStockInputRef: RefObject<HTMLInputElement | null>;
  expiryCheckboxRef?: RefObject<HTMLLabelElement | null>;
}

// Entity History Hook Types
export interface EntityHistoryItem {
  id: string;
  entity_table: string;
  entity_id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  changed_at: string;
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
  change_description?: string;
}

// Form validation Hook Types (for backward compatibility)
export interface ValidationFormData {
  name: string;
  category_id: string;
  type_id: string;
  unit_id: string;
  base_price: number;
  sell_price: number;
}