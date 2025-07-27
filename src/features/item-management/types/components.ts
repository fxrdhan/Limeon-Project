import type { ReactNode } from "react";
import type { z } from "zod";
import type { Item } from "@/types/database";
import type { ColDef, GridReadyEvent, IRowNode } from "ag-grid-community";
import type { ItemFormData, UnitConversionFormData } from "./forms";
import type { UnitData, DropdownOption, UnitOption, VersionData, MutationState } from "./entities";

// Modal Component Props
export interface ItemManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  initialSearchQuery?: string;
  isClosing: boolean;
  setIsClosing: (value: boolean) => void;
  refetchItems?: () => void;
}

export interface ItemModalTemplateProps {
  isOpen: boolean;
  isClosing: boolean;
  onBackdropClick: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: {
    header: ReactNode;
    basicInfo: ReactNode;
    categoryForm?: ReactNode;
    settingsForm: ReactNode;
    pricingForm: ReactNode;
    unitConversionManager: ReactNode;
    modals: ReactNode;
  };
  formAction: {
    onCancel: () => void;
    onDelete?: () => void;
    isSaving: boolean;
    isDeleting: boolean;
    isEditMode: boolean;
    isDisabled: boolean;
  };
}

export interface EntityModalTemplateProps {
  children: ReactNode;
}

export interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  selectedVersion?: VersionData;
  currentData: {
    name: string;
    description: string;
  };
}

export interface EntityModalContentProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
  isLoading: boolean;
  isDeleting: boolean;
}

export interface ItemFormModalsProps {
  categoryModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
    mutation: MutationState;
  };
  typeModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
    mutation: MutationState;
  };
  unitModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
    mutation: MutationState;
  };
  currentSearchTerm?: string;
}

// Form Component Props
export interface ItemBasicInfoFormProps {
  formData: {
    code: string;
    name: string;
    manufacturer: string;
    barcode: string;
    is_medicine: boolean;
    category_id: string;
    type_id: string;
    unit_id: string;
    rack: string;
    description: string;
  };
  categories: DropdownOption[];
  types: DropdownOption[];
  units: DropdownOption[];
  loading: boolean;
  onCodeRegenerate: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFieldChange: (field: string, value: boolean | string) => void;
  onDropdownChange: (field: string, value: string) => void;
  onAddNewCategory: (searchTerm?: string) => void;
  onAddNewType: (searchTerm?: string) => void;
  onAddNewUnit: (searchTerm?: string) => void;
}

export interface ItemSettingsFormProps {
  formData: {
    is_active: boolean;
    is_medicine: boolean;
    has_expiry_date: boolean;
    min_stock: number;
  };
  minStockEditing: {
    isEditing: boolean;
    value: string;
  };
  onFieldChange: (field: string, value: boolean) => void;
  onStartEditMinStock: () => void;
  onStopEditMinStock: () => void;
  onMinStockChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMinStockKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface ItemPricingFormProps {
  formData: {
    base_price: number;
    sell_price: number;
  };
  displayBasePrice: string;
  displaySellPrice: string;
  baseUnit: string;
  marginEditing: {
    isEditing: boolean;
    percentage: string;
  };
  calculatedMargin: number | null;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSellPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMarginChange: (percentage: string) => void;
  onStartEditMargin: () => void;
  onStopEditMargin: () => void;
  onMarginInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMarginKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface ItemUnitConversionManagerProps {
  formData: ItemFormData;
  units: UnitData[];
  onChange: (field: keyof ItemFormData, value: unknown) => void;
  onUnitModalOpen: (searchTerm: string) => void;
}

// UI Component Props
export interface ItemFormHeaderProps {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  isDeleting?: boolean;
  hasUnsavedChanges: boolean;
}

export interface ItemDataTableProps {
  items: Item[];
  columnDefs: ColDef[];
  columnsToAutoSize: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown;
  search: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onRowClick: (item: Item) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onGridReady: (params: GridReadyEvent) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (node: IRowNode) => boolean;
}

export interface FefoTooltipProps {
  tooltipText?: string;
}

// History Component Props
export interface HistoryButtonProps {
  entityTable: string;
  entityId: string;
  entityName: string;
  className?: string;
}

export interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityTable: string;
  entityId: string;
  entityName: string;
}

export interface VersionDiffProps {
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  changedFields: string[];
}

// Form Input Component Props
export interface ItemCodeFieldProps {
  code: string;
  onRegenerate: () => void;
}

export interface PriceInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tabIndex?: number;
  validationSchema?: z.ZodSchema;
  required?: boolean;
  min?: string;
  className?: string;
}

export interface MarginEditorProps {
  marginPercentage: number;
  profitPercentage: number;
  onMarginChange: (margin: number) => void;
}

export interface MinStockEditorProps {
  minStock: number;
  onChange: (value: number) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export interface EntityFormFieldsProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface UnitConversionInputProps {
  data: UnitConversionFormData;
  units: UnitOption[];
  onDataChange: (data: UnitConversionFormData) => void;
  onUnitModalOpen: (searchTerm: string) => void;
}

export interface DiffTextProps {
  oldText: string;
  newText: string;
  inline?: boolean;
}