import React from 'react';

// Purchase-related types
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

export interface AddPurchasePortalProps {
  isOpen: boolean;
  onClose: () => void;
  isClosing: boolean;
  setIsClosing: React.Dispatch<React.SetStateAction<boolean>>;
  initialInvoiceNumber?: string;
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
