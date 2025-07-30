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
  unit_id: string;
  rack: string;
  description: string;
  base_price: number;
  sell_price: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemUnit {
  id: string;
  name: string;
  abbreviation: string;
  created_at: string;
  updated_at: string;
}