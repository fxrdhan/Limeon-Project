import type { CustomerLevelDiscount } from '@/types/database';

// Main Item Form Data
export interface ItemFormData {
  code: string;
  name: string;
  manufacturer_id: string;
  type_id: string;
  category_id: string;
  package_id: string;
  dosage_id: string;
  barcode: string;
  description: string;
  image_urls?: string[];
  base_price: number;
  sell_price: number;
  is_level_pricing_active?: boolean;
  min_stock: number;
  quantity: number;
  unit_id: string;
  is_active: boolean;
  is_medicine: boolean;
  has_expiry_date: boolean;
  updated_at?: string | null;
  customer_level_discounts?: CustomerLevelDiscount[];
}

// Form-specific data structures
export interface PackageConversionFormData {
  unit_id: string;
  conversion_rate: number;
  base_price: number;
  sell_price: number;
}

// Additional PackageConversionFormData variant for logic hook
export interface PackageConversionLogicFormData {
  unit: string;
  conversion_rate: number;
}
