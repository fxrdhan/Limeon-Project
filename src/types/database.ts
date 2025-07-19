// Database entity types
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

export interface Item {
  id: string;
  name: string;
  manufacturer?: string;
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
  manufacturer?: string;
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

export interface ItemType {
  id: string;
  name: string;
  description: string;
}

export interface UnitData {
  id: string;
  name: string;
}

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  role: string;
}

export interface TopSellingMedicine {
  name: string;
  total_quantity: number;
}
