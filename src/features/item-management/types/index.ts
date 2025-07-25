import type { CustomerLevelDiscount } from "@/types/database";

// Form Data
export interface ItemFormData {
  code: string;
  name: string;
  manufacturer: string;
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

// Unit Conversion Types
export interface UnitConversion {
  id: string;
  unit_name: string;
  to_unit_id: string;
  unit: UnitData;
  conversion: number;
  basePrice: number;
  sellPrice: number;
  conversion_rate: number;
}

export interface DBUnitConversion {
  id?: string;
  unit_name: string;
  to_unit_id?: string;
  conversion_rate: number;
  base_price?: number;
  sell_price?: number;
}

export interface UnitData {
  id: string;
  name: string;
}

// Modal Props
export interface ItemManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  initialSearchQuery?: string;
  isClosing: boolean;
  setIsClosing: (value: boolean) => void;
  refetchItems?: () => void;
}

// Hook Props
export interface UseItemManagementProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

// Context Types
export type { ItemManagementContextValue } from "../contexts/ItemManagementContext";

// Re-export FormData as alias for backward compatibility
export type FormData = ItemFormData;