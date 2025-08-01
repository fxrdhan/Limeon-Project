import type { CustomerLevelDiscount } from "@/types/database";

// Main Item Form Data
export interface ItemFormData {
  code: string;
  name: string;
  manufacturer: string;
  type_id: string;
  category_id: string;
  unit_id: string;
  dosage_id: string;
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

// Form-specific data structures
export interface UnitConversionFormData {
  unit_id: string;
  conversion_rate: number;
  base_price: number;
  sell_price: number;
}

// Additional UnitConversionFormData variant for logic hook
export interface UnitConversionLogicFormData {
  unit: string;
  conversion: number;
}

