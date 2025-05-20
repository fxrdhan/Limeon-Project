export interface Category {
    id: string;
    name: string;
    description?: string;
}

export interface MedicineType {
    id: string;
    name: string;
}

export interface Unit {
    id: string;
    name: string;
    description?: string;
}

export interface Supplier {
    id: string;
    name: string;
    address: string | null;
    phone?: string | null;
    email?: string | null;
    contact_person?: string | null;
    image_url?: string | null;
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
    base_price: number;
    sell_price: number;
    stock: number;
    unit_id: string;
    base_unit: string;
    unit_conversions: UnitConversion[];
    customer_level_discounts?: CustomerLevelDiscount[];
}

export interface CustomerLevelDiscount {
    customer_level_id: string;
    discount_percentage: number;
}

export interface Patient {
    id: string;
    name: string;
}

export interface Doctor {
    id: string;
    name: string;
}

export interface DropdownOption {
    id: string;
    name: string;
}

export interface DropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name: string;
    required?: boolean;
    onAddNew?: () => void;
    withRadio?: boolean;
    searchList?: boolean;
}

export interface NavbarProps {
    sidebarCollapsed: boolean;
}

import { JSX } from "react";

export interface SidebarProps {
    collapsed: boolean;
    toggleSidebar: () => void;
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

export interface UnitConversionManagerProps {
    unitConversionHook: UseUnitConversionReturn;
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
}

export type BadgeVariant =
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "warning"
    | "danger";
export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "accent"
    | "outline"
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
    isSaving: boolean;
    isDisabled?: boolean;
    cancelText?: string;
    saveText?: string;
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
    onImageUpload: (imageBase64: string) => Promise<void> | void;
    onImageDelete?: () => Promise<void> | void;
    children: React.ReactNode;
    maxSizeMB?: number;
    validTypes?: string[];
    className?: string;
    disabled?: boolean;
    loadingIcon?: React.ReactNode;
    defaultIcon?: React.ReactNode;
    shape?: "rounded" | "square" | "full";
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
}

export interface FieldConfig {
    key: string;
    label: string;
    type?: "text" | "email" | "tel" | "textarea";
    editable?: boolean;
}
export interface DetailEditModalProps {
    title: string;
    data: Record<string, string | number | boolean | null>;
    fields: FieldConfig[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        updatedData: Record<string, string | number | boolean | null>
    ) => Promise<void>;
    onImageSave?: (data: {
        supplierId?: string;
        imageBase64: string;
    }) => Promise<void>;
    onImageDelete?: (supplierId?: string) => Promise<void>;
    onDeleteRequest?: (
        data: Record<string, string | number | boolean | null>
    ) => void;
    deleteButtonLabel?: string;
    imageUrl?: string;
    imagePlaceholder?: string;
    mode?: "edit" | "add";
}

export interface TableSearchProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
}

export interface TableProps {
    children: React.ReactNode;
    className?: string;
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
        }
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
    showItemDropdown: boolean;
    setShowItemDropdown: (value: boolean) => void;
    filteredItems: Item[];
    selectedItem: Item | null;
    setSelectedItem: (item: Item | null) => void;
    onAddItem: (item: PurchaseItem) => void;
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

import { Session } from "@supabase/supabase-js";

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
    updateProfilePhoto: (photoBase64: string) => Promise<void>;
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
}

export interface UseDropdownHandlersProps {
    options: DropdownOption[];
    onChange: (value: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isClosing: boolean;
    setIsClosing: (isClosing: boolean) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    setDropDirection: (direction: "up" | "down") => void;
    setPortalStyle: (style: React.CSSProperties) => void;
    filteredOptions: DropdownOption[];
    setFilteredOptions: (options: DropdownOption[]) => void;
    searchList: boolean;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    dropdownMenuRef: React.RefObject<HTMLDivElement | null>;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    optionsContainerRef: React.RefObject<HTMLDivElement | null>;
    hoverTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
    leaveTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
    setIsScrollable: (isScrollable: boolean) => void;
    setReachedBottom: (reachedBottom: boolean) => void;
    setScrolledFromTop: (scrolledFromTop: boolean) => void;
}

export interface CheckboxProps {
    id?: string;
    label?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export type CustomDateValueType = Date | null;

export interface PortalledDatepickerProps {
    value: CustomDateValueType;
    onChange: (date: CustomDateValueType) => void;
    label?: string;
    inputClassName?: string;
    placeholder?: string;
    minDate?: Date;
    maxDate?: Date;
}