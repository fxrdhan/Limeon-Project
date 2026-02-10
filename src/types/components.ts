import React from 'react';
import { z } from 'zod';
import { Category, Item } from './database';

// Component props and UI-related types
export interface DropdownOption {
  id: string;
  name: string;
  code?: string;
  description?: string;
  updated_at?: string | null;
}

export interface HoverDetailData {
  id: string;
  code?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string | null;
}

export type DropdownMode = 'input' | 'text';
export type DropdownPortalWidth = 'auto' | 'content' | string | number;
export type DropdownPosition = 'auto' | 'top' | 'bottom' | 'left';
export type DropdownAlign = 'left' | 'right';

// Base dropdown props for single selection
export interface DropdownProps {
  mode?: DropdownMode;
  options: DropdownOption[];
  value: string;
  tabIndex?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  onAddNew?: (searchTerm?: string) => void;
  withRadio?: boolean;
  searchList?: boolean;
  autoScrollOnOpen?: boolean;
  validate?: boolean;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  hoverToOpen?: boolean;
  // Portal width control
  portalWidth?: DropdownPortalWidth;
  // Position control
  position?: DropdownPosition;
  // Alignment control
  align?: DropdownAlign;
  // Hover detail functionality
  enableHoverDetail?: boolean;
  hoverDetailDelay?: number;
  onFetchHoverDetail?: (optionId: string) => Promise<HoverDetailData | null>;
}

// Extended dropdown props for checkbox mode (multiple selection)
export interface CheckboxDropdownProps extends Omit<
  DropdownProps,
  'value' | 'onChange' | 'withRadio'
> {
  value: string[];
  onChange: (value: string[]) => void;
  withCheckbox: true;
}

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  animate?: boolean;
}

// Button component types with enhanced type safety
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'text'
  | 'danger'
  | 'text-danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

// Extended button props with all available features
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state with spinner */
  isLoading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Enable glow effect on hover/focus */
  withGlow?: boolean;
  /** Show underline for text variants */
  withUnderline?: boolean;
}

// Type guards for runtime type checking
export const isButtonVariant = (value: string): value is ButtonVariant => {
  return ['primary', 'secondary', 'text', 'danger', 'text-danger'].includes(
    value
  );
};

export const isButtonSize = (value: string): value is ButtonSize => {
  return ['sm', 'md', 'lg'].includes(value);
};

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  value?: string;
  validate?: boolean;
  validationSchema?: z.ZodSchema;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  onValidationChange?: (isValid: boolean, error: string | null) => void;
  type?: 'text' | 'currency' | 'number' | 'email' | 'password' | 'tel' | 'url';
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
  searchState?: 'idle' | 'typing' | 'found' | 'not-found';
  resultsCount?: number;
}

export interface TableProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  maxHeight?: string;
  stickyHeader?: boolean;
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  colSpan?: number;
  rowSpan?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

export interface ImageUploaderProps {
  id: string;
  onImageUpload: (file: File) => Promise<void> | void;
  onImageDelete?: () => Promise<void> | void;
  children: React.ReactNode;
  hasImage?: boolean; // Explicit prop to indicate if image exists
  maxSizeMB?: number;
  validTypes?: string[];
  className?: string;
  disabled?: boolean;
  tabIndex?: number;
  loadingIcon?: React.ReactNode;
  defaultIcon?: React.ReactNode;
  shape?: 'rounded' | 'rounded-sm' | 'square' | 'full';
  interaction?: 'menu' | 'direct';
}

export interface DescriptiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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
  expandOnClick?: boolean;
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

export interface PageTitleProps {
  title: string;
}

export interface ItemSearchBarProps {
  searchItem: string;
  onSearchItemChange: (value: string) => void;
  items: Item[];
  selectedItem: Item | null;
  onSelectItem: (item: Item | null) => void;
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
  isClosing: boolean;
  setIsClosing: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: {
    id?: string;
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  onFieldAutosave?: (
    id: string,
    updates: Record<string, unknown>
  ) => Promise<void>;
  initialData?: Category | null;
  onDelete?: (categoryId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  entityName: string;
  initialNameFromSearch?: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'date';
  options?: { id: string; name: string }[];
  isRadioDropdown?: boolean;
  editable?: boolean;
}

export interface GenericIdentityModalProps {
  title: string;
  data: Record<string, string | number | boolean | null>;
  fields: FieldConfig[];
  isOpen: boolean;
  onClose: () => void;
  onSave?: (
    data: Record<string, string | number | boolean | null>
  ) => Promise<void>;
  onFieldSave?: (key: string, value: unknown) => Promise<void>;
  onImageSave?: (data: {
    entityId?: string;
    file: File;
  }) => Promise<string | void>;
  onImageDelete?: (entityId: string) => Promise<void>;
  imageUrl?: string;
  defaultImageUrl?: string;
  imagePlaceholder?: string;
  imageUploadText?: string;
  imageNotAvailableText?: string;
  imageFormatHint?: string;
  onDeleteRequest?: (
    data: Record<string, string | number | boolean | null>
  ) => void;
  deleteButtonLabel?: string;
  mode?: 'edit' | 'add';
  initialNameFromSearch?: string;
  imageAspectRatio?: 'default' | 'square';
  showImageUploader?: boolean;
  useInlineFieldActions?: boolean;
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
