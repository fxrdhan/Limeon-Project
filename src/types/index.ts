import { RealtimeChannel, Session } from "@supabase/supabase-js";

export interface Category {
  id: string;
  name: string;
  description?: string;
  updated_at?: string | null;
}

export interface MedicineType {
  id: string;
  name: string;
  updated_at?: string | null;
}

export interface Unit {
  id: string;
  name: string;
  description?: string;
  updated_at?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  address: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
}

export interface CompanyProfile {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  pharmacist_name: string | null;
  pharmacist_license: string | null;
}

export interface CustomerLevel {
  id: string;
  level_name: string;
  price_percentage: number;
}

export interface Item {
  id: string;
  name: string;
  code?: string;
  barcode?: string | null;
  base_price: number;
  sell_price: number;
  stock: number;
  unit_id?: string;
  base_unit?: string;
  unit_conversions: UnitConversion[];
  customer_level_discounts?: CustomerLevelDiscount[];
  category: { name: string };
  type: { name: string };
  unit: { name: string };
}

export interface CustomerLevelDiscount {
  customer_level_id: string;
  discount_percentage: number;
}

export interface Patient {
  id: string;
  name: string;
  gender?: string | null;
  birth_date?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  gender?: string | null;
  specialization?: string | null;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  experience_years?: number | null;
  qualification?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
}

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

export interface NavbarProps {
  sidebarCollapsed: boolean;
}

import { JSX } from "react";

export interface SidebarProps {
  collapsed: boolean;
  isLocked: boolean;
  toggleLock: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}
export interface MenuItem {
  name: string;
  path: string;
  icon: JSX.Element;
  children?: {
    name: string;
    path: string;
  }[];
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

export interface ConfirmDialogContextType {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant: "danger" | "primary";
  openConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;
}
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "danger" | "primary";
}

export interface FormActionProps {
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  isDisabled?: boolean;
  cancelText?: string;
  saveText?: string;
  updateText?: string;
  deleteText?: React.ReactNode;
  isEditMode?: boolean;
  cancelTabIndex?: number;
  saveTabIndex?: number;
}

export interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}
export interface FormFieldProps {
  label: string;
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

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
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

export interface TableSearchProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
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

export interface FormData {
  code: string;
  name: string;
  type_id: string;
  category_id: string;
  unit_id: string;
  rack: string;
  barcode: string;
  description: string;
  base_price: number;
  sell_price: number;
  min_stock: number;
  is_active: boolean;
  is_medicine: boolean;
  has_expiry_date: boolean;
  updated_at?: string | null;
  customer_level_discounts?: CustomerLevelDiscount[];
}

export interface PurchaseFormData {
  supplier_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  payment_status: string;
  payment_method: string;
  notes: string;
  vat_percentage: number;
  is_vat_included: boolean;
}

export interface PurchaseItem {
  item: {
    name: string;
    code: string;
  };
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  unit: string;
  vat_percentage: number;
  batch_no: string | null;
  expiry_date: string | null;
  unit_conversion_rate: number;
}

export interface UnitConversion {
  conversion_rate: number;
  unit_name: string;
  to_unit_id: string;
  id: string;
  unit: {
    id: string;
    name: string;
  };
  conversion: number;
  basePrice: number;
  sellPrice: number;
}
export interface UseUnitConversionReturn {
  conversions: UnitConversion[];
  baseUnit: string;
  setBaseUnit: React.Dispatch<React.SetStateAction<string>>;
  basePrice: number;
  setBasePrice: React.Dispatch<React.SetStateAction<number>>;
  sellPrice: number;
  setSellPrice: React.Dispatch<React.SetStateAction<number>>;
  addUnitConversion: (
    unitConversion: Omit<UnitConversion, "id"> & {
      basePrice?: number;
      sellPrice?: number;
    },
  ) => void;
  removeUnitConversion: (id: string) => void;
  unitConversionFormData: {
    unit: string;
    conversion: number;
  };
  setUnitConversionFormData: React.Dispatch<
    React.SetStateAction<{
      unit: string;
      conversion: number;
    }>
  >;
  recalculateBasePrices: () => void;
  skipNextRecalculation: () => void;
  availableUnits: UnitData[];
  resetConversions: () => void;
  setConversions: React.Dispatch<React.SetStateAction<UnitConversion[]>>;
}
export interface UnitData {
  id: string;
  name: string;
}

export interface RegularDashboardProps {
  stats: {
    totalSales: number;
    totalPurchases: number;
    totalMedicines: number;
    lowStockCount: number;
  };
  salesData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }[];
  };
  topMedicines: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  };
}
export interface TopSellingMedicine {
  name: string;
  total_quantity: number;
}

export interface ItemType {
  id: string;
  name: string;
  description: string;
}

export interface PurchaseData {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string | null;
  total: number;
  payment_status: string;
  payment_method: string;
  vat_percentage: number;
  is_vat_included: boolean;
  vat_amount: number;
  notes: string | null;
  supplier: {
    name: string;
    address: string | null;
    contact_person: string | null;
  };
  customer_name?: string;
  customer_address?: string;
  checked_by?: string;
}

export interface Subtotals {
  baseTotal: number;
  discountTotal: number;
  afterDiscountTotal: number;
  vatTotal: number;
  grandTotal: number;
}
export interface InvoiceLayoutProps {
  purchase: PurchaseData;
  items: PurchaseItem[];
  subtotals: Subtotals;
  printRef?: React.RefObject<HTMLDivElement>;
  title?: string;
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

export interface SaleFormData {
  patient_id: string;
  doctor_id: string;
  payment_method: string;
  items: {
    item_id: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

export type ProfileKey = keyof CompanyProfile;

export interface CompanyDetails {
  name?: string;
  address?: string;
  license_dak?: string;
  certificate_cdob?: string;
}
export interface InvoiceInformation {
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
}
export interface CustomerInformation {
  customer_name?: string;
  customer_address?: string;
}
export interface ProductListItem {
  sku?: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_price?: number;
  discount?: number;
  total_price?: number;
}
export interface PaymentSummary {
  total_price?: number;
  vat?: number;
  invoice_total?: number;
}
export interface AdditionalInformation {
  checked_by?: string;
}
export interface ExtractedInvoiceData {
  company_details?: CompanyDetails;
  invoice_information?: InvoiceInformation;
  customer_information?: CustomerInformation;
  product_list?: ProductListItem[] | null;
  payment_summary?: PaymentSummary;
  additional_information?: AdditionalInformation;
  rawText?: string;
  imageIdentifier?: string;
}

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  role: string;
}
export interface AuthState {
  session: Session | null;
  user: UserDetails | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfilePhoto: (file: File) => Promise<void>;
  initialize: () => Promise<void>;
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

export interface UseAddItemFormProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

export interface DBUnitConversion {
  id?: string;
  unit_name: string;
  to_unit_id?: string;
  conversion_rate: number;
  base_price?: number;
  sell_price?: number;
}

export interface DBItem {
  id: string;
  name: string;
  code?: string;
  barcode?: string | null;
  base_price: number;
  sell_price: number;
  stock: number;
  unit_conversions: string | UnitConversion[];
  category_id?: string;
  type_id?: string;
  unit_id?: string;
  item_categories?: { name: string }[] | null;
  item_types?: { name: string }[] | null;
  item_units?: { name: string }[] | null;
}

export interface RawUnitConversion {
  id?: string;
  unit_name?: string;
  conversion_rate?: number;
  conversion?: number;
  to_unit_id?: string;
  basePrice?: number;
  sellPrice?: number;
}

export interface ItemSearchBarRef {
  focus: () => void;
}

export interface UseFieldFocusOptions {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  isModalOpen?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  debouncedSearch?: string;
  currentPage?: number;
  itemsPerPage?: number;
  locationKey?: string;
}

export interface UseMasterDataManagementOptions {
  realtime?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  isCustomModalOpen?: boolean;
  locationKey?: string;
}

export interface AddItemPageHandlersProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  expiryCheckboxRef?: React.RefObject<HTMLLabelElement | null>;
  refetchItems?: () => void;
}

export interface PageTitleProps {
  title: string;
}

export type AlertType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "offline"
  | "online";

export interface AlertMessage {
  id: string;
  message: string;
  type: AlertType;
  duration?: number;
  persistent?: boolean;
  icon?: React.ReactNode;
}

export interface AlertContextType {
  alerts: AlertMessage[];
  addAlert: (
    message: string,
    type: AlertType,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  removeAlert: (id: string) => void;
}

export interface AlertItemProps extends AlertMessage {
  onClose: () => void;
}

export interface AlertHook {
  success: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  error: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  warning: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  info: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
}

export interface PresenceState {
  channel: RealtimeChannel | null;
  onlineUsers: number;
  setChannel: (channel: RealtimeChannel | null) => void;
  setOnlineUsers: (count: number) => void;
}
