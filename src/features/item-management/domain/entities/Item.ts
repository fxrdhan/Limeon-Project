// Core Item entity with business rules
export interface Item {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  barcode: string;
  is_medicine: boolean;
  category_id: string;
  type_id: string;
  package_id: string;
  dosage_id: string;
  description: string;
  base_price: number;
  sell_price: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  kode?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemType {
  id: string;
  kode?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemUnit {
  id: string;
  kode?: string;
  name: string;
  abbreviation: string;
  created_at: string;
  updated_at: string;
}

export interface ItemDosage {
  id: string;
  kode?: string;
  name: string;
  nci_code?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemManufacturer {
  id: string;
  kode?: string;
  name: string;
  address?: string;
  created_at: string;
  updated_at: string;
}
