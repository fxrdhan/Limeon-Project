import { CustomerLevelDiscount } from './database';

// Form data types
export interface FormData {
  code: string;
  name: string;
  manufacturer_id: string;
  type_id: string;
  category_id: string;
  package_id: string;
  dosage_id: string;
  barcode: string;
  description: string;
  base_price: number;
  sell_price: number;
  min_stock: number;
  quantity: number;
  unit_id: string;
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

export interface SaleFormData {
  customer_id?: string;
  patient_id: string;
  doctor_id: string;
  payment_method: string;
  items: {
    item_id: string;
    quantity: number;
    price: number;
    subtotal: number;
    unit_name?: string;
  }[];
}

export interface FormActionProps {
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  isDisabled?: boolean;
  isSubmitDisabled?: boolean;
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
  required?: boolean;
}
