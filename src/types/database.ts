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

export type InventoryUnitKind = 'packaging' | 'retail_unit' | 'custom';

export interface ItemInventoryUnit {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  kind: InventoryUnitKind;
  source_package_id?: string | null;
  source_dosage_id?: string | null;
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

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_level_id: string;
  person_id?: string | null;
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
  description?: string | null;
  created_at?: string;
  updated_at?: string | null;
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
  display_name?: string;
  manufacturer: { id?: string; code?: string | null; name: string };
  code?: string;
  barcode?: string | null;
  image_urls?: string[] | null;
  base_price: number;
  sell_price: number;
  is_level_pricing_active?: boolean;
  stock: number;
  package_id?: string;
  base_inventory_unit_id?: string | null;
  base_unit?: string;
  package_conversions: PackageConversion[];
  inventory_units: ItemUnitHierarchyEntry[];
  customer_level_discounts?: CustomerLevelDiscount[];
  category: { name: string };
  type: { name: string };
  package: { name: string }; // Kemasan (dari item_packages)
  unit: { name: string }; // Satuan (dari base_unit string atau item_units)
  dosage?: { name: string };
  measurement_value?: number | null;
  measurement_unit?: UnitData | null;
  measurement_denominator_value?: number | null;
  measurement_denominator_unit?: UnitData | null;
}

export interface PackageConversion {
  conversion_rate: number;
  unit_name: string;
  to_unit_id: string;
  id: string;
  inventory_unit_id?: string;
  parent_inventory_unit_id?: string | null;
  contains_quantity?: number;
  factor_to_base?: number;
  base_price_override?: number | null;
  sell_price_override?: number | null;
  unit: ItemInventoryUnit;
  base_price: number;
  sell_price: number;
}

export interface ItemUnitHierarchyEntry {
  id: string;
  item_id?: string;
  inventory_unit_id: string;
  parent_inventory_unit_id?: string | null;
  contains_quantity: number;
  factor_to_base: number;
  base_price_override?: number | null;
  sell_price_override?: number | null;
  unit: ItemInventoryUnit;
  parent_unit?: ItemInventoryUnit | null;
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
  display_name?: string;
  manufacturer_id?: string | null;
  code?: string;
  barcode?: string | null;
  image_urls?: string[] | null;
  base_price: number;
  sell_price: number;
  is_level_pricing_active?: boolean;
  stock: number;
  package_conversions: string | PackageConversion[] | null;
  item_unit_hierarchy?: ItemUnitHierarchyEntry[] | null;
  category_id?: string;
  type_id?: string;
  package_id?: string;
  base_inventory_unit_id?: string | null;
  base_unit?: string | null;
  min_stock?: number | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string | null;
  is_active?: boolean | null;
  rack?: string | null;
  has_expiry_date?: boolean | null;
  is_medicine?: boolean | null;
  dosage_id?: string | null;
  measurement_value?: number | null;
  measurement_unit_id?: string | null;
  measurement_denominator_value?: number | null;
  measurement_denominator_unit_id?: string | null;
  item_categories?: { name: string }[] | null;
  item_types?: { name: string }[] | null;
  item_packages?: { name: string }[] | null;
  base_inventory_unit?: ItemInventoryUnit | null;
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
  profilephoto_thumb?: string | null;
  profilephoto_path?: string | null;
  role: string;
}

export interface TopSellingMedicine {
  name: string;
  total_quantity: number;
}
