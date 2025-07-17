import React from "react";
import { Category, Item } from "./database";

// Component props and UI-related types
export interface DropdownOption {
  id: string;
  name: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  tabIndex?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  name: string;
  required?: boolean;
  onAddNew?: (searchTerm?: string) => void;
  withRadio?: boolean;
  searchList?: boolean;
}

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: React.ReactNode;
  animate?: boolean;
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "text"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  value?: string;
}

export interface LoadingProps {
  className?: string;
  message?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemsCount: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  enableFloating?: boolean;
}

export interface TableSearchProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  searchState?: "idle" | "typing" | "found" | "not-found";
  resultsCount?: number;
}

export interface TableProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  maxHeight?: string;
  stickyHeader?: boolean;
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

export interface ImageUploaderProps {
  id: string;
  onImageUpload: (file: File) => Promise<void> | void;
  onImageDelete?: () => Promise<void> | void;
  children: React.ReactNode;
  maxSizeMB?: number;
  validTypes?: string[];
  className?: string;
  disabled?: boolean;
  loadingIcon?: React.ReactNode;
  defaultIcon?: React.ReactNode;
  shape?: "rounded" | "rounded-sm" | "square" | "full";
}

export interface DescriptiveTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  name: string;
  placeholder?: string;
  rows?: number;
  containerClassName?: string;
  textareaClassName?: string;
  labelClassName?: string;
  showInitially?: boolean;
  tabIndex?: number;
}

export interface CheckboxProps {
  id?: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  tabIndex?: number;
}

export type CustomDateValueType = Date | null;

export interface DatepickerProps {
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
}

export interface PageTitleProps {
  title: string;
}

export interface ItemSearchBarProps {
  searchItem: string;
  setSearchItem: (value: string) => void;
  filteredItems: Item[];
  selectedItem: Item | null;
  setSelectedItem: (item: Item | null) => void;
  onOpenAddItemPortal: () => void;
  isAddItemButtonDisabled?: boolean;
}

export interface ItemSearchBarRef {
  focus: () => void;
}

export interface AddItemPortalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  initialSearchQuery?: string;
  refetchItems?: () => void;
}

export interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: {
    id?: string;
    name: string;
    description: string;
  }) => Promise<void>;
  initialData?: Category | null;
  onDelete?: (categoryId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  entityName?: string;
  initialNameFromSearch?: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "date";
  options?: { id: string; name: string }[];
  isRadioDropdown?: boolean;
  editable?: boolean;
}

export interface GenericDetailModalProps {
  title: string;
  data: Record<string, string | number | boolean | null>;
  fields: FieldConfig[];
  isOpen: boolean;
  onClose: () => void;
  onSave?: (
    data: Record<string, string | number | boolean | null>,
  ) => Promise<void>;
  onFieldSave?: (key: string, value: unknown) => Promise<void>;
  onImageSave?: (data: { entityId?: string; file: File }) => Promise<void>;
  onImageDelete?: (entityId: string) => Promise<void>;
  imageUrl?: string;
  defaultImageUrl?: string;
  imagePlaceholder?: string;
  imageUploadText?: string;
  imageNotAvailableText?: string;
  imageFormatHint?: string;
  onDeleteRequest?: (
    data: Record<string, string | number | boolean | null>,
  ) => void;
  deleteButtonLabel?: string;
  mode?: "edit" | "add";
  initialNameFromSearch?: string;
  imageAspectRatio?: "default" | "square";
}

// CardName component types
export type CardItem = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export interface CardNameField {
  key: string;
  label: string;
  type?: string;
  render?: (value: unknown, item: CardItem) => React.ReactNode;
  useBlankImage?: boolean;
}

export interface CardNameImageConfig {
  imageKey: string;
  blankImage?: string;
  isRounded?: boolean;
  altText: string;
}

export interface CardNameProps {
  item: CardItem;
  index: number;
  debouncedSearch: string;
  onClick: (item: CardItem) => void;
  fields: CardNameField[];
  imageConfig?: CardNameImageConfig;
}