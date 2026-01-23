// Database entity types
export interface Category {
  id: string;
  code?: string;
  name: string;
  description?: string;
  updated_at?: string | null;
}

export interface MedicineType {
  id: string;
  code?: string;
  name: string;
  description?: string;
  updated_at?: string | null;
}

export interface Unit {
  id: string;
  code?: string;
  name: string;
  description?: string;
  updated_at?: string | null;
}

export interface ItemPackage {
  id: string;
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface ItemDosage {
  id: string;
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface ItemManufacturer {
  id: string;
  code?: string;
  name: string;
  address?: string;
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
  manufacturer: { id?: string; code?: string | null; name: string };
  code?: string;
  barcode?: string | null;
  image_urls?: string[] | null;
  base_price: number;
  sell_price: number;
  stock: number;
  package_id?: string;
  base_unit?: string;
  package_conversions: PackageConversion[];
  customer_level_discounts?: CustomerLevelDiscount[];
  category: { name: string };
  type: { name: string };
  package: { name: string }; // Kemasan (dari item_packages)
  unit: { name: string }; // Satuan (dari base_unit string atau item_units)
  dosage?: { name: string };
}

export interface PackageConversion {
  conversion_rate: number;
  unit_name: string;
  to_unit_id: string;
  id: string;
  unit: ItemPackage;
  base_price: number;
  sell_price: number;
}

export interface DBPackageConversion {
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
  manufacturer_id?: string;
  code?: string;
  barcode?: string | null;
  image_urls?: string[] | null;
  base_price: number;
  sell_price: number;
  stock: number;
  package_conversions: string | PackageConversion[];
  category_id?: string;
  type_id?: string;
  package_id?: string;
  item_categories?: { name: string }[] | null;
  item_types?: { name: string }[] | null;
  item_packages?: { name: string }[] | null;
}

export interface RawPackageConversion {
  id?: string;
  unit_name?: string;
  conversion_rate?: number;
  to_unit_id?: string;
  base_price?: number;
  sell_price?: number;
}

export interface ItemType {
  id: string;
  code?: string;
  name: string;
  description: string;
}

export interface UnitData {
  id: string;
  code?: string;
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
